# Finance SaaS Backend

A multi-tenant financial management API for small businesses, built with Node.js, Express, and MongoDB. The backend brings everyday bookkeeping, invoices, bills, payments, reporting, and document-assisted data entry together behind a role-aware API.

## Project overview

### The problem

Small businesses often manage transactions, receivables, payables, and supporting documents across separate tools or manual spreadsheets. That makes it harder to understand cash flow, keep records consistent, and connect financial activity to the documents that support it. Repetitive entry also leaves room for mistakes.

### The solution

Finance SaaS provides a single backend for managing business financial records and the workflows around them. It organizes data by business, validates financial operations, and exposes reporting and document-processing capabilities through a versioned REST API. Optional AI services assist with extracting and interpreting information, while financial records remain subject to the application's validation and user confirmation.

## Features

- **Authentication and access control:** registration, login, JWT access tokens, refresh-token rotation, email verification, password reset, optional TOTP multi-factor authentication, and owner/admin/employee roles.
- **Business and team management:** business profiles, user management, and business-scoped access to financial data.
- **Accounting fundamentals:** accounts, categories, income and expense transactions, transfers, voiding, and account balance updates.
- **Receivables and payables:** customers and vendors (parties), invoices, bills, payments, reversals, and customer/vendor ledgers.
- **Recurring transactions:** recurring rules, manual execution, and a background worker for scheduled processing with duplicate-execution safeguards.
- **Documents and OCR:** signed direct-to-Cloudinary uploads, document processing through a separate PaddleOCR service, document classification and review, and reviewed document-to-transaction conversion.
- **AI assistance (optional):** finance Q&A, transaction drafts, category suggestions, report summaries, anomaly review, inventory advice, payment-reminder drafts, and document extraction through Groq.
- **Reporting and exports:** dashboard summaries, income/expense and cash-flow reports, category and account summaries, tax-reporting data, and CSV/PDF exports.
- **Business operations:** inventory and stock adjustments, currency-rate management and conversion, notifications, subscription-plan settings, and audit logs.
- **API protections:** request validation, role checks, rate limits, security headers, CORS configuration, audit logging, and idempotency support for selected financial writes.

## Technology

| Area | Technologies |
| --- | --- |
| API | Node.js, Express 5 |
| Data | MongoDB, Mongoose |
| Validation | Zod |
| Authentication | JSON Web Tokens, bcryptjs |
| Document storage | Cloudinary |
| OCR service | Python, FastAPI, PaddleOCR |
| Optional AI | Groq API |

## Architecture

The Node.js API uses a layered structure: routes apply authentication, authorization, validation, and request middleware; controllers handle HTTP concerns; services implement business workflows; and Mongoose models persist data in MongoDB.

```text
Client
  │
  ▼
Express API (/api/v1)
  ├── Routes and middleware
  ├── Controllers
  ├── Services
  └── Mongoose models
        │
        ▼
      MongoDB

Document upload ──► Cloudinary
Document OCR    ──► PaddleOCR service
AI assistance  ──► Groq API (optional)
```

Business-owned records are scoped to the authenticated user's business. Financial workflows that use MongoDB transactions require a MongoDB deployment that supports transactions, such as a replica set.

## API overview

The API is versioned under `/api/v1`. The main route groups are:

| Prefix | Purpose |
| --- | --- |
| `/auth` | Registration, login, token refresh, logout, email verification, password reset, and MFA |
| `/businesses`, `/users` | Business profile and team members |
| `/accounts`, `/categories`, `/transactions` | Core accounting records |
| `/dashboard`, `/reports` | Dashboard data and financial reports |
| `/parties`, `/invoices`, `/bills` | Customer/vendor records, receivables, and payables |
| `/recurring-transactions` | Recurring transaction rules and execution |
| `/documents` | Document upload, processing, review, and conversion |
| `/ai` | Optional AI-assisted endpoints |

Additional endpoints for invoice and bill payments, ledgers, exports, inventory, currency rates, notifications, audit logs, tax reports, insights, and subscription settings are also available under `/api/v1`.

Health check:

```http
GET /health
```

Example authenticated request:

```http
GET /api/v1/transactions
Authorization: Bearer <access-token>
```

Refer to the route modules in `src/routes/` for the current endpoint contracts and authorization requirements.

## Getting started

### Prerequisites

- Node.js 20 or later and npm
- MongoDB configured as a replica set (required for transactional financial workflows)
- A Cloudinary account (the API validates Cloudinary configuration at startup)
- Python 3.12 is recommended for the optional OCR service, subject to PaddlePaddle wheel availability for your platform

Groq and SMTP credentials are only needed for their corresponding optional integrations.

### 1. Install Node dependencies

```powershell
npm install
```

### 2. Configure environment variables

Create a local `.env` file from the provided example:

```powershell
Copy-Item .env.example .env
```

Set the required values in `.env` before starting the API:

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `CLIENT_URL` | Yes | Allowed frontend origin for CORS |
| `BACKEND_URL` | Yes | Public or local base URL used by the API |
| `JWT_ACCESS_SECRET` | Yes | Access-token signing secret; at least 32 characters |
| `JWT_REFRESH_SECRET` | Yes | Refresh-token signing secret; at least 32 characters |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `GROQ_API_KEY` | No | Enables Groq-backed AI capabilities |
| `SMTP_*` | No | SMTP connection and sender settings for email workflows |

Other supported settings and defaults are documented in `.env.example`, including the OCR service URL, AI model and timeout, worker interval, email verification, audit logging, and document access controls. Keep `.env` and all credentials out of version control.

### 3. Start the API

Development mode (with automatic restarts):

```powershell
npm run dev
```

Production mode:

```powershell
npm start
```

By default, the API listens on port `5000`. Check `http://localhost:5000/health` to verify it is responding.

### Optional: run the OCR service

The Node API sends document OCR requests to the separately run Python service. From the repository root:

```powershell
cd ocr-service
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001
```

The service health endpoint is `http://127.0.0.1:8001/health`. The API uses `OCR_SERVICE_URL` (default `http://127.0.0.1:8001`). PaddleOCR may need to download model assets on first use; availability depends on the Python version and platform.

### Optional: run the recurring worker separately

The API process starts the recurring-transaction worker when `RECURRING_WORKER_ENABLED=true` (the example configuration enables it). If you prefer to run the worker as a separate process, use:

```powershell
npm run worker
```

In that deployment, set `RECURRING_WORKER_ENABLED=false` for the API process to avoid running a worker in both processes.

## Documents and AI safety

Document files are uploaded by the client directly to Cloudinary using upload parameters issued by the API; the Node server does not permanently store uploaded files on its local filesystem. The API can send the stored document to the OCR service, and an authorized user can review extracted information before converting a document into a financial record.

Groq is optional. Configure `GROQ_API_KEY` to use the Groq-backed assistant and extraction features. AI responses are assistance, not authoritative accounting data: users must review and confirm information, and financial writes continue through the application's validated workflows.

## Development and verification

Available npm scripts:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API |
| `npm run worker` | Start the recurring-transaction worker without the HTTP server |
| `npm run integration` | Run the HTTP integration script against `http://localhost:5000` |

To run the integration script, start the API first and configure a test MongoDB database. The script registers test users and creates data; do not point it at a production environment.

## Project structure

```text
src/
├── config/        # Environment and database configuration
├── controllers/   # HTTP request handlers
├── jobs/          # Background workers
├── middleware/    # Authentication, validation, auditing, and shared middleware
├── models/        # Mongoose schemas
├── routes/        # Versioned API route modules
├── services/      # Business workflows and integrations
├── utils/         # Shared utilities
├── validators/    # Request schemas
├── app.js         # Express application and route registration
├── server.js      # API process entry point
└── worker.js      # Standalone worker entry point

ocr-service/       # Separate FastAPI/PaddleOCR service
scripts/           # Development and integration scripts
```

## Contributing

Use focused changes that preserve business and tenant boundaries. Validate request data at the API boundary, keep financial operations within the existing service workflows, and never treat client-supplied tenant identifiers or AI-generated values as trusted.

## Author

Created by **Zain Raza**.

[Visit Zain Raza on LinkedIn](https://www.linkedin.com/in/zainraza861/)
