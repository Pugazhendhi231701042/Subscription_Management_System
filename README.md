# BRIGHTLOOP · Smart Subscriptions. Simplified Billing.

A React/Vite subscription dashboard with an Express REST API, JWT auth, bcrypt password storage, local SQLite persistence, recurring invoice job, and responsive login/registration.

## Start locally

1. Install Node.js 22.13+ (the project uses Node SQLite support).
2. Copy .env.example to .env. Set a strong `MASTER_ADMIN_PASSWORD` before initializing a new database, and generate a random `JWT_SECRET` of at least 32 characters. The SQLite database is created at `./data/brightloop.sqlite` by default (override with `DATABASE_PATH`).
3. Run npm install.
4. Run npm run dev for the Vite app (http://localhost:5173) and API (http://localhost:4000). You can also run npm run client and npm run server separately.
5. On first start, Brightloop creates the master admin using `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD`. Startup preserves existing records, including when recording a migration marker. Public sign-up creates customer accounts; only an admin can create staff accounts.

All changes are stored in the local SQLite file and remain after the server stops.

## Accounts

There are no demo customer or staff accounts. The first startup creates one master admin (`MASTER_ADMIN_EMAIL`, default `admin@brightloop.local`). For a new database, `MASTER_ADMIN_PASSWORD` must be configured; the server never prints passwords. Customers create their own accounts on the sign-up page; the master admin creates staff accounts from the Staff page. All protected API requests use expiring JWT bearer tokens and validate that the account still exists.

## Enable Google sign-in

1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client ID with application type **Web application**.
2. Add `http://localhost:5173` to Authorized JavaScript origins. Add your deployed website origin when you publish the app.
3. Put that OAuth client ID (not a client secret) in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` in `.env`.
4. Restart `npm run dev`. Google sign-in creates customer accounts and allows invited staff accounts to sign in only when their verified Google email matches the email created by the admin. The master admin account remains password-only. The server validates Google’s signed ID token, issuer, audience, expiry, and verified email before issuing a Brightloop JWT.
## Main modules

- Customer self-registration and Google sign-in, unique normalized email addresses, strong-password validation, password reset, remember-me, and database-verified JWT sessions. The master admin can create staff invitations; staff use Google sign-in with their invited email. Invited staff become active on their first successful sign-in, and the admin can close or reactivate accounts.
- Staff work tracking: admins assign work to invited or active staff; assignees update progress through Open, In progress, Blocked, and Closed, with completion timestamps visible to the admin.
- Admin, staff, and customer access. Customers can view their own subscriptions, invoices, and payments, browse active products and plans, pause/resume/cancel subscriptions, and change plan or seat count.
- Products with type, sales/cost prices, notes, and price-adjusted variants. Plans include billing frequency, minimum quantity, availability dates, automatic close, and renewal settings.
- Reusable quotation templates with validity days and product lines. Quotations track status and accepted quotes can be converted into subscriptions with saved details.
- Subscription lifecycle transitions, recurring invoices from subscription lines, due-date aging, automatic tax and discount calculations, duplicate-period protection, confirmation/cancel/send/print invoice actions.
- Discount rules support fixed or percentage values, date windows, minimum spend or quantity, usage limits, and product or subscription scope.
- Payments record invoice, amount, method, date, and note; payment records update paid and outstanding invoice balances.
- Finance dashboard summaries and revenue charts use records in SQLite. Lists support server-side search, status filters, and pages of up to 100 records.

## API quick reference

- POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- POST /api/auth/forgot-password, POST /api/auth/reset-password
- GET /api/health, GET /api/dashboard
- GET/POST/PATCH/DELETE /api/{customers,products,plans,quotations,subscriptions,invoices,payments,discounts,taxes,users}
- POST /api/quotations/:id/convert (accepted quotations only)
- POST /api/subscriptions/:id/status
- GET/POST/PATCH/DELETE /api/workItems (admin-assigned staff work tracking; statuses Open, In progress, Blocked, Closed)

Protected endpoints require `Authorization: Bearer <token>`. List endpoints accept limit (max 100).

## Build and deployment

- npm run build creates dist/.
- Deploy the Vite frontend to Vercel. Set VITE_API_URL to the Render API base ending in /api.
- Deploy server.js to a host with persistent disk storage. Configure DATABASE_PATH, JWT_SECRET, CLIENT_URL and optional SMTP_* variables. SQLite needs a persistent disk on hosting platforms.
- Keep the master admin password and JWT_SECRET private. Back up the SQLite file before upgrading or deleting local data.

## Current limitations

- Invoice and password-reset email delivery requires SMTP credentials. In development, password reset links are returned locally; production reports a configuration error until SMTP is set.
- Invoice printing uses the browser print dialog, including Save as PDF; the app does not create a stored PDF attachment.
- Payments are staff-recorded bookkeeping entries. There is no card/UPI payment gateway or automatic bank reconciliation.
- Customer plan changes apply to the subscription’s next recurring invoice. Proration, refunds, usage-based metering, and a full add-on catalog workflow are not implemented.
- The API returns a maximum of 100 records per page. Database indexes and dashboard aggregation support larger accounts, but the PDF’s under-two-second response target has not been load-tested.
- SQLite stores data in a local file. For cloud hosting, that file must be placed on a persistent disk; ephemeral containers can lose it. Recurring billing is idempotent per subscription period, but external email delivery and production concurrency still need deployment-level checks.
- The UI bundle remains above Vite’s 500 kB advisory threshold.
