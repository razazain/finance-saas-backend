# Finance SaaS MVP Completion

This release is the backend hardening/MVP completion pass.

## Completed MVP modules

- Authentication, JWT, refresh-token rotation and reuse protection
- Users, roles, business settings and tenant isolation
- Categories, accounts and multi-currency account foundation
- Income, expense, transfer and void transactions
- Parties, invoices, invoice payments and payment reversals
- Bills, bill payments and payment reversals
- Customer/vendor ledgers with opening balances
- Dashboard and reports with business timezone-aware grouping
- Recurring transactions with idempotent execution and calendar-safe monthly/yearly scheduling
- Documents, Cloudinary upload flow, OCR, classification, review/editing and document conversion locking/idempotency
- Audit logs
- Idempotency-Key support for financial writes
- SMTP email verification
- Password reset via SMTP
- TOTP MFA setup/enable/disable
- In-app notifications
- CSV/PDF transaction exports
- Invoice/Bill PDF generation
- Invoice/Bill email delivery with PDF attachments
- Inventory and stock adjustments
- Transaction-based tax reporting foundation
- Internal SaaS subscription/plan management foundation
- Deterministic financial insights without an external AI API
- Currency-rate management and conversion API

## SMTP configuration

Set these values in `.env` based on your SMTP provider:

```text
SMTP_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_FROM_NAME=Finance SaaS
EMAIL_VERIFICATION_REQUIRED=true
```

The repository intentionally contains `.env.example` only. Never commit real credentials.

## Important MVP design choices

- No paid AI API is required. Financial insights are deterministic and explainable.
- Subscription management is provider-neutral. An external payment provider can be connected later without changing the core accounting modules.
- Tax reporting is a transaction-based reporting foundation and does not claim jurisdiction-specific tax filing compliance.
- Multi-currency has account currency, exchange-rate management and conversion support. Cross-currency accounting reports should always be grouped by currency unless an explicit conversion rate is selected.

## Verification

Static JavaScript syntax checks and Python OCR syntax checks pass in the release workspace. Full database integration tests still require a configured MongoDB instance and installed npm dependencies.


## Groq LLM capabilities

The backend now includes optional Groq-powered finance Q&A, transaction drafting, transaction categorization, financial report narratives, heuristic anomaly review, inventory advice, payment-reminder drafts, and document OCR normalization. Configure `GROQ_API_KEY` to enable the AI endpoints. Full endpoint contracts and privacy controls are documented in `AI_INTEGRATION.md`. AI output is never treated as an authoritative accounting write: user confirmation and existing financial services remain required.
