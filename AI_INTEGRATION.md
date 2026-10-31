# Groq LLM Integration

This backend includes an optional Groq-powered AI layer. The API key stays on the server; never put `GROQ_API_KEY` in the React app or send it to a browser.

## 1. Enable Groq

Add these variables to the backend `.env`:

```env
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=openai/gpt-oss-20b
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_MS=45000
GROQ_DOCUMENT_EXTRACTION_ENABLED=true
```

`GROQ_API_KEY` is optional at server startup. The rest of the backend continues working when it is absent; `/api/v1/ai/*` requests return `503 AI_NOT_CONFIGURED` until a key is configured.

The default model can be changed using `GROQ_MODEL` if Groq changes availability or if your account supports another chat model. Groq's free-tier quota is provider-controlled and can change. This backend adds a per-user in-memory limit of 20 AI requests per 15 minutes on each API process; provider-level organization limits still apply. In a multi-instance deployment, use a shared rate-limit store (for example Redis) if you need one global application limit.

**Document privacy:** when `GROQ_DOCUMENT_EXTRACTION_ENABLED=true`, OCR text is sent from your backend to Groq for field normalization. OCR text may contain customer, vendor, address, tax or payment data. Set this variable to `false` if the business does not authorize external LLM processing of document contents. PaddleOCR continues to work when this setting is disabled.

## 2. Authentication and common behavior

All routes require the existing access token:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

All business data is loaded using the authenticated user's `businessId`. A request cannot supply or override a business ID. `owner`, `admin`, and `employee` roles can use the AI routes, subject to the route's underlying read access.

AI prompts and chat history are not stored as conversations in MongoDB. The document extraction result is stored inside the existing tenant-scoped `Document.extractedData.ai` property. Request metadata may still be recorded by the existing audit middleware.

## 3. Available endpoints

Base path: `/api/v1/ai`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/status` | Reports whether Groq is configured, selected model and available capabilities. |
| POST | `/assistant` | Ask a natural-language question about the business's recent financial data. |
| POST | `/transactions/draft` | Convert a natural-language transaction description into a structured, unposted draft. |
| POST | `/transactions/categorize` | Suggest an existing income/expense category for a transaction. |
| POST | `/reports/summary` | Explain a selected financial report period in plain language. |
| POST | `/transactions/anomaly-review` | Find possible duplicates and unusually high expenses using deterministic rules, then get an AI explanation. |
| POST | `/inventory/reorder-advice` | Explain items at/below reorder level and suggest review priority. Does not calculate or place purchase orders. |
| POST | `/collections/payment-reminder` | Draft an invoice/bill payment reminder. Does not send an email. |
| POST | `/documents/:id/extract` | Re-run Groq extraction against an already OCR-processed document. |

### Finance assistant

```http
POST /api/v1/ai/assistant
```

```json
{
  "question": "How much did we spend in the last 30 days and which categories were highest?"
}
```

The assistant receives a bounded snapshot: last-30-day and previous-30-day income/expense totals, account balances, category totals, recent posted transactions, open receivables/payables, overdue items and low-stock inventory. It supports English, Urdu and Roman Urdu prompts, replies in the question's language, and does not have unrestricted MongoDB access. It should say when the requested information is not in the supplied snapshot.

### Natural-language transaction draft

```http
POST /api/v1/ai/transactions/draft
```

```json
{
  "text": "Paid 4,500 PKR for office internet yesterday from Cash account"
}
```

Response includes a draft, confidence, missing fields and warnings. Account and category names are mapped back to real IDs from the current business; only active accounts in the business currency can be selected. If the request explicitly uses a different currency, the draft amount is blocked and a currency-conversion warning is returned because the current posting workflow does not perform foreign-currency conversion. The endpoint does **not** insert a transaction or change an account balance. After a user reviews and confirms the draft, the frontend should call the existing `POST /api/v1/transactions` endpoint with the reviewed fields (including `source: "ai"` if the user kept the AI-assisted draft). The draft returns `transactionDate` as a business-timezone-aware ISO timestamp accepted by that endpoint.

### Category suggestion

```http
POST /api/v1/ai/transactions/categorize
```

```json
{
  "type": "expense",
  "description": "Monthly office internet subscription",
  "amount": "4500.00"
}
```

Only active categories of the requested transaction type are considered. The response returns an existing category ID only when the model's category name matches one of those records.

### Financial report narrative

```http
POST /api/v1/ai/reports/summary
```

```json
{
  "from": "2026-10-01T00:00:00.000Z",
  "to": "2026-10-31T23:59:59.000Z"
}
```

The deterministic report totals are calculated by MongoDB first. Groq explains the returned report data; it is not responsible for producing accounting totals. The requested range is limited to 366 days.

### Transaction review

```http
POST /api/v1/ai/transactions/anomaly-review
```

```json
{
  "days": 90
}
```

The first pass uses deterministic heuristics: repeated same-type/same-account/same-amount/same-category entries within two days, and expenses at least three times the recent category average when the category has at least six observations. Groq explains the flags but cannot change, void or delete transactions. Flags are not proof of fraud.

### Inventory advice

```http
POST /api/v1/ai/inventory/reorder-advice
```

No body is required. The backend selects up to 30 active items at or below their configured reorder level. Groq provides review priority and operational commentary. It does not make stock movements or purchase orders.

### Payment reminder draft

```http
POST /api/v1/ai/collections/payment-reminder
```

```json
{
  "documentType": "invoice",
  "documentId": "<invoice_object_id>",
  "tone": "formal",
  "language": "English"
}
```

`documentType` is `invoice` or `bill`; tone is `friendly`, `formal` or `firm`; language is `English`, `Urdu` or `Roman Urdu`. Only records with an outstanding balance and a non-draft/non-cancelled status are eligible. For invoices it drafts a customer receivable collection reminder; for bills it drafts a vendor payable-status update (it does not ask the vendor to pay the business). The endpoint returns a message preview and never sends it.

### Re-run AI document extraction

```http
POST /api/v1/ai/documents/<document_object_id>/extract
```

The document must already have `processingStatus=processed` and OCR text. The result is stored under `extractedData.ai` while the original PaddleOCR text and parser extraction remain available. This lets the system keep working if Groq has a timeout or quota issue during the initial OCR request.

## 4. OCR + AI document workflow

When a document is processed through the existing `POST /api/v1/documents/:id/process` endpoint:

1. The existing OCR service (PaddleOCR) extracts text.
2. The existing deterministic parser runs and its output is preserved.
3. If Groq is configured and document extraction is enabled, Groq normalizes document type, invoice/bill numbers, supplier/customer names, dates, currency, totals and line items.
4. AI output is stored separately under `extractedData.ai` with model, confidence, timestamp and `reviewRequired=true`.
5. If Groq fails or the free-tier quota is reached, the original OCR result is still saved and processing remains successful.
6. Financial conversion still uses existing backend invoice/bill/transaction services. If an unambiguous extracted three-letter currency code differs from the business currency, conversion is blocked rather than silently treating foreign currency as base currency. The AI never posts a transaction automatically.

For invoice/bill conversion, the document conversion schema accepts optional reviewed `items`. If omitted, valid extracted AI line items may be used; the existing invoice/bill service recalculates line totals, discount, tax and balance. Users should review extracted line items before conversion.

## 5. Safety and financial correctness

- AI has no direct database query tool and no arbitrary MongoDB access.
- Every context query is scoped by authenticated `businessId`.
- The system prompt treats user-provided descriptions and OCR text as untrusted data.
- Zod validates AI-generated structured responses; category/account IDs are resolved by backend records.
- Money calculations and account balance changes remain in existing deterministic backend services using Decimal128/Decimal.js.
- Draft creation, category suggestions, anomaly flags, reminder messages and inventory advice require human review.
- Payment execution, invoice/bill posting, transaction posting, voids, emails and purchase orders are not autonomous AI actions.
- Groq rate limits are shared at the provider organization level; the internal per-user limiter does not increase Groq's quota.

## 6. Troubleshooting

| Error code | Meaning / action |
|---|---|
| `AI_NOT_CONFIGURED` | Add a valid `GROQ_API_KEY` to the backend `.env`, then restart the server. |
| `AI_RATE_LIMITED` | Groq free-tier quota was reached; retry after the provider limit resets. |
| `AI_PROVIDER_AUTH_FAILED` | API key is invalid, expired or lacks access. |
| `AI_PROVIDER_TIMEOUT` | Increase `GROQ_TIMEOUT_MS` within its allowed range or retry later. |
| `AI_PROVIDER_ERROR` | Check `GROQ_MODEL` is available for your Groq account. |
| `AI_INVALID_JSON` / `AI_*_INVALID` | Model output did not pass JSON/Zod validation; retry or change model. |
| `AI_DOCUMENT_EXTRACTION_DISABLED` | Set `GROQ_DOCUMENT_EXTRACTION_ENABLED=true` only if document processing by Groq is approved. |

Never commit `.env` or share the Groq API key. Rotate the key if it is exposed.
