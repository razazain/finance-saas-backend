const normalize = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const parseAmount = (value) => {
  if (!value) return null;
  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^0-9.\-]/g, "");
  if (!cleaned || !/^\-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned).toFixed(2);
};

const findMoney = (lines, labels) => {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!labels.some((label) => lower.includes(label))) continue;
    const matches = line.match(
      /(?:rs\.?|pkr|usd|eur|gbp|\$|€|£)?\s*\-?\d[\d,]*(?:\.\d{1,4})?/gi,
    );
    if (matches?.length) {
      const amount = parseAmount(matches[matches.length - 1]);
      if (amount) return amount;
    }
  }
  return null;
};

const findDate = (text) => {
  const matches =
    text.match(/\b(\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4})\b/g) || [];
  for (const raw of matches) {
    const parts = raw.split(/[\/\-.]/).map(Number);
    let d;
    if (parts[0] > 1900) d = new Date(parts[0], parts[1] - 1, parts[2]);
    else if (parts[2] > 1900) d = new Date(parts[2], parts[1] - 1, parts[0]);
    else continue;
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
};

export const parseOcrText = (rawText) => {
  const text = normalize(rawText);
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map(normalize)
    .filter(Boolean);

  const invoiceMatch = text.match(
    /(?:invoice|inv)\s*(?:no|#|number)?\s*[:\-]?\s*([A-Z0-9\-\/]+)/i,
  );
  const billMatch = text.match(
    /(?:bill)\s*(?:no|#|number)?\s*[:\-]?\s*([A-Z0-9\-\/]+)/i,
  );
  const currencyMatch = text.match(/\b(PKR|USD|EUR|GBP|AED|SAR|INR)\b|[€£$]/i);

  return {
    rawText,
    fields: {
      invoiceNumber: invoiceMatch?.[1] || null,
      billNumber: billMatch?.[1] || null,
      date: findDate(text),
      currency: currencyMatch?.[1]?.toUpperCase() || currencyMatch?.[0] || null,
      subtotal: findMoney(lines, ["subtotal", "sub total"]),
      taxAmount: findMoney(lines, ["tax", "gst", "vat"]),
      totalAmount: findMoney(lines, [
        "grand total",
        "total due",
        "amount due",
        "total",
      ]),
      paidAmount: findMoney(lines, ["paid", "amount paid"]),
      dueAmount: findMoney(lines, ["balance due", "due amount", "amount due"]),
    },
    lines,
    confidence: {
      note: "OCR and field extraction are best-effort. Financial records must be reviewed before conversion.",
    },
  };
};
