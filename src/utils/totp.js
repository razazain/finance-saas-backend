import crypto from "node:crypto";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const base32Encode = (buf) => {
  let bits = 0,
    val = 0,
    out = "";
  for (const b of buf) {
    val = (val << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(val >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) out += alphabet[(val << (5 - bits)) & 31];
  return out;
};
const base32Decode = (s) => {
  let bits = 0,
    val = 0,
    out = [];
  for (const c of s.replace(/=+$/, "")) {
    const i = alphabet.indexOf(c.toUpperCase());
    if (i < 0) throw new Error("Invalid base32 secret");
    val = (val << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};
export const generateSecret = () => base32Encode(crypto.randomBytes(20));
export const totpCode = (
  secret,
  counter = Math.floor(Date.now() / 1000 / 30),
) => {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const off = h[19] & 15;
  const n = (h.readUInt32BE(off) & 0x7fffffff) % 1000000;
  return String(n).padStart(6, "0");
};
export const verifyTotp = (secret, code, window = 1) => {
  for (let i = -window; i <= window; i++)
    if (
      totpCode(secret, Math.floor(Date.now() / 1000 / 30) + i) === String(code)
    )
      return true;
  return false;
};
export const otpauthUrl = ({ secret, account, issuer }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
