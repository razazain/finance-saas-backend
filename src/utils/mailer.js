import net from "node:net";
import tls from "node:tls";
import { env } from "../config/env.js";
const b64 = (v) => Buffer.from(v).toString("base64");
const smtpSend = ({ to, subject, text, html, attachments = [] }) =>
  new Promise((resolve, reject) => {
    if (!env.SMTP_ENABLED)
      return resolve({ sent: false, reason: "SMTP_DISABLED" });
    if (!env.SMTP_HOST) return reject(new Error("SMTP_HOST is not configured"));
    let socket;
    let buffer = "";
    let step = 0;
    let settled = false;
    const finishOk = () => {
      if (!settled) {
        settled = true;
        resolve({ sent: true });
      }
    };
    const fail = (e) => {
      if (!settled) {
        settled = true;
        reject(e);
      }
    };
    const write = (c) => socket.write(c.replace(/\r?\n/g, "\r\n") + "\r\n");
    const message = () => {
      const boundary = `----FinanceSaaS${Date.now().toString(36)}`;
      let m = `From: ${env.SMTP_FROM_NAME} <${env.SMTP_FROM_EMAIL}>\r\nTo: <${to}>\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\n`;
      if (attachments.length) {
        m += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${html || `<pre>${text || ""}</pre>`}\r\n`;
        for (const a of attachments) {
          m += `--${boundary}\r\nContent-Type: ${a.contentType || "application/octet-stream"}; name="${a.filename}"\r\nContent-Disposition: attachment; filename="${a.filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${
            Buffer.from(a.content)
              .toString("base64")
              .match(/.{1,76}/g)
              ?.join("\r\n") || ""
          }\r\n`;
        }
        m += `--${boundary}--\r\n`;
      } else {
        m += `Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${html || `<pre>${text || ""}</pre>`}\r\n`;
      }
      return m.replace(/\n/g, "\r\n");
    };
    const onConnect = () => {};
    const connect = () => {
      socket = env.SMTP_SECURE
        ? tls.connect(
            {
              host: env.SMTP_HOST,
              port: env.SMTP_PORT,
              servername: env.SMTP_HOST,
            },
            onConnect,
          )
        : net.createConnection(
            { host: env.SMTP_HOST, port: env.SMTP_PORT },
            onConnect,
          );
      socket.setEncoding("utf8");
      socket.on("data", (data) => {
        buffer += data;
        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).replace(/\r$/, ""),
            code = Number(line.slice(0, 3));
          buffer = buffer.slice(idx + 1);
          if (!/^\d{3} /.test(line)) continue;
          try {
            if (step === 0 && code >= 200) {
              write(`EHLO ${env.SMTP_HOST}`);
              step = 1;
            } else if (step === 1 && code >= 200) {
              if (!env.SMTP_SECURE && env.SMTP_PORT === 587) {
                write("STARTTLS");
                step = 2;
              } else {
                write("AUTH LOGIN");
                step = 4;
              }
            } else if (step === 2 && code === 220) {
              const old = socket;
              const t = tls.connect(
                { socket: old, servername: env.SMTP_HOST },
                () => {
                  socket = t;
                  socket.setEncoding("utf8");
                  write(`EHLO ${env.SMTP_HOST}`);
                  step = 3;
                },
              );
              t.on("error", fail);
              t.on("data", () => {});
            } else if (step === 3 && code >= 200) {
              write("AUTH LOGIN");
              step = 4;
            } else if (step === 4 && code === 334) {
              write(b64(env.SMTP_USER));
              step = 5;
            } else if (step === 5 && code === 334) {
              write(b64(env.SMTP_PASSWORD));
              step = 6;
            } else if (step === 6 && code >= 200) {
              write(`MAIL FROM:<${env.SMTP_FROM_EMAIL}>`);
              step = 7;
            } else if (step === 7 && code >= 200) {
              write(`RCPT TO:<${to}>`);
              step = 8;
            } else if (step === 8 && code >= 200) {
              write("DATA");
              step = 9;
            } else if (step === 9 && code === 354) {
              socket.write(message() + "\r\n.\r\n");
              step = 10;
            } else if (step === 10 && code >= 200) {
              write("QUIT");
              step = 99;
              socket.end();
              finishOk();
            }
          } catch (e) {
            fail(e);
          }
        }
      });
      socket.on("error", fail);
      socket.on("close", () => {
        if (step < 99) fail(new Error("SMTP connection closed"));
      });
    };
    connect();
  });
export const sendEmail = (opts) => smtpSend(opts);
