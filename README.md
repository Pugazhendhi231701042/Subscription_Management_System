# Brightloop Subscription Management System 🚀
> **Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026 — Virtual Round**  
> **Problem Statement:** Subscription Management System — Build one unified system to run plans, subscriptions, and recurring billing in one place.

---

## 📌 Executive Summary

**Brightloop Software** sells software products on subscription (billed monthly or yearly), add-ons, and variants. Previously, subscriptions were tracked in spreadsheets, renewals remembered manually, invoices typed by hand, payments reconciled via bank statement scrolling, and quarterly reports compiled manually.

This platform provides the **digital backbone** for Brightloop Software:
- **Full Subscription Lifecycle**: Seamless transition from `Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed`.
- **Automated Recurring Billing Engine**: Scheduled/on-demand batch billing for hundreds of accounts without duplicate billing or skipped cycles.
- **Dynamic Product & Variant Modeling**: Support for base products, configurable variants (e.g., brand additions), and lifecycle plans (daily, weekly, monthly, yearly).
- **Intelligent Discount & Tax Engine**: Automatic tier/seat/coupon discount application and multi-rule tax calculations.
- **Multi-Method Payment & Overdue Tracking**: Real-time payment reconciliation (UPI, Card, Bank Transfer, Cash) with partial payment handling.
- **Role-Based Access Control (RBAC)**: Dedicated interfaces for **Admin**, **Internal Staff**, and **Customer Portal**.
- **Executive Finance Dashboard**: Real-time ARR/MRR, active subscriber counts, aging receivables, and sub-2-second query response times.

---

## 🏗️ System Architecture & Database Design

### Relational Schema (Pure Native SQLite with better-sqlite3)
The database enforces strict relational integrity with foreign keys, composite unique constraints (`UNIQUE(subscription_id, billing_period_start, billing_period_end)`), parameterized queries, and indexes with **1ms latency** (easily beating the sub-2.0s SLA requirement). Completely eliminates reliance on Prisma, Firebase, Supabase, or unstructured MongoDB.

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────────┐
│    Users     │       │    Products     │       │ ProductVariants  │
├──────────────┤       ├─────────────────┤       ├──────────────────┤
│ id (PK)      │       │ id (PK)         │◄──────┤ id (PK)          │
│ email (UQ)   │       │ name            │       │ product_id (FK)  │
│ passwordHash │       │ type            │       │ variant_name     │
│ role         │       │ sales_price     │       │ price_adjustment │
└──────┬───────┘       │ cost_price      │       └──────────────────┘
       │               └────────┬────────┘
       │                        │
       ▼                        ▼
┌──────────────┐       ┌─────────────────┐       ┌──────────────────┐
│  Customers   │       │      Plans      │       │   Taxes & Rules  │
├──────────────┤       ├─────────────────┤       ├──────────────────┤
│ id (PK)      │       │ id (PK)         │       │ id (PK)          │
│ user_id (FK) │       │ product_id (FK) │       │ name, rate       │
│ company_name │       │ frequency       │       │ tax_type         │
│ email, phone │       │ min_quantity    │       └──────────────────┘
└──────┬───────┘       │ auto_close_flag │
       │               └────────┬────────┘
       │                        │
       ├────────────────────────┴──────────────────────┐
       ▼                                               ▼
┌──────────────────────┐                     ┌──────────────────────┐
│     Quotations       │                     │    Subscriptions     │
├──────────────────────┤                     ├──────────────────────┤
│ id (PK)              │                     │ id (PK)              │
│ quotation_number(UQ) │                     │ subscription_num(UQ) │
│ customer_id (FK)     │                     │ customer_id (FK)     │
│ plan_id (FK)         │                     │ plan_id (FK)         │
│ validity_days        │                     │ status               │
│ status, total        │                     │ start_date, end_date │
└──────────┬───────────┘                     │ next_billing_date    │
           │                                 └──────────┬───────────┘
           │ convert                                    │
           └────────────────────────────────────────────┤
                                                        ▼
┌──────────────────────┐                     ┌──────────────────────┐
│   Invoice Payments   │                     │   Invoices (Billing) │
├──────────────────────┤                     ├──────────────────────┤
│ id (PK)              │                     │ id (PK)              │
│ invoice_id (FK)      │◄────────────────────┤ invoice_number (UQ)  │
│ payment_method       │                     │ subscription_id (FK) │
│ amount, payment_date │                     │ period_start, end    │
│ reference_number     │                     │ subtotal, tax, total │
│ status               │                     │ status               │
└──────────────────────┘                     └──────────────────────┘
```

---

## 👥 Team & Work Distribution

| Team Member | GitHub Username | Core Responsibilities |
|-------------|-----------------|----------------------|
| **Pugazhendhi B (Lead)** | `@Pugazhendhi231701042` | Architecture, Executive Finance Dashboard, Simulation Engine, Integration & Deployment |
| **Khadeejah Nuhaa** | `@khadeejahnuhaa08` | Authentication, RBAC, Customer Portal, Instant Payment Flow, Security & Audit Logs |
| **Lakshmi Bhargavi** | `@Lakshmi-230401077` | Product Catalog, Variants, Plans, Quotation Proposals, Printable PDF & Pipeline |
| **Hemanth Korapati** | `@korapatihemanth2024csd-cloud` | Native SQLite Database Engine, Pure SQL DDL Schemas, Invoicing Engine & Parameterized Queries |

---

## ⚡ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite (Odoo-inspired ERP styling, statusbar pipelines, quick role switcher).
- **Backend**: Node.js / Express REST API with modular controllers and strict JWT + RBAC middleware.
- **Database**: Pure native **SQLite (`better-sqlite3`)** — zero ORM bloat, zero BaaS dependency (no Prisma, no Supabase, no Firebase, no MongoDB). Automatically initializes and seeds on server boot.
- **Validation**: Strict schema validation with regex password complexity (uppercase, lowercase, special char, >8 chars) and email integrity.
- **Billing Scheduler & Simulator**: Automated idempotency-guaranteed recurring billing runner with dry-run and future date simulation controls.

---

## 🛠️ How to Run the Project

### 1. Prerequisites
- **Node.js (v18+)** installed.

### 2. Backend Setup & Run
Open a terminal in the project directory:
```bash
cd backend
npm install
npm run dev
```
> The backend server starts at **`http://localhost:5000`**.  
> The native SQLite database (`backend/subscription.db`) will automatically create all tables, indexes, and seed realistic demo data on initial launch.

### 3. Frontend Setup & Run
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
> The frontend application starts at **`http://localhost:5173`**.

---

## 🔑 Demo & Evaluator Accounts

All accounts share the default password: **`Brightloop@2026`**

| Role | Email | Password | Access / Scope |
|------|-------|----------|----------------|
| **SuperAdmin** | `admin@brightloop.com` | `Brightloop@2026` | Full ERP access, Billing Cycle Simulator, Staff Management, Discounts, Audit Logs |
| **Staff (Sales)** | `sales@brightloop.com` | `Brightloop@2026` | Quotations, Subscriptions lifecycle, Invoice ledger, Payments |
| **Customer 1** | `contact@acmecorp.com` | `Brightloop@2026` | Customer self-service portal, view active plans, 1-click UPI/Card payment, update address |
| **Customer 2** | `billing@techstart.io` | `Brightloop@2026` | Customer portal with an overdue invoice demonstration |

> 💡 **Quick Switcher**: In the header of the app, click **"Demo Logins"** to instantly switch between Admin, Staff, and Customer without typing!

---

## 🧪 Key Scenarios to Evaluate

1. **Executive Finance Lead Dashboard**:
   - Live ARR / MRR, Active Subscriber count, and Outstanding Invoices.
   - Live query latency indicator (typically **1ms - 3ms**, beating the `< 2.0s` hackathon requirement).
   - Interactive SVG MRR growth chart & status distribution visualizer.
2. **Automated Billing Day Simulator**:
   - On the Dashboard, choose a future date (e.g. `Next Month (+30d)`) and click **"Simulate Billing Day"**.
   - See previewed due subscriptions, click **"Execute Batch Run"** — generates invoices with zero duplication guaranteed by composite unique keys.
3. **Quotation to Active Subscription Flow**:
   - Navigate to **Quotations**, select a quotation or create from template with product variants (e.g., Odoo Brand Connected +₹560).
   - Click **"Convert to Subscription"** — instantly moves the status pipeline from *Quotation* to *Active* and records audit logs.
   - Click **"Print / Export"** to see the clean, printable formal proposal.
4. **Customer Self-Service Portal**:
   - Switch to Customer (`contact@acmecorp.com` or `billing@techstart.io`).
   - Notice isolated customer view showing their active subscriptions and unpaid invoices.
   - Click **"Pay Now"** on an invoice — generates a dynamic UPI QR Code and instant Card simulation, updating ledger immediately.
5. **Security & Audit Logs**:
   - Switch back to Admin and click **Audit Logs** in the sidebar.
   - Review immutable chronological logs recording all logins, quotation creations, billing runs, and payments with timestamps.

---

## 🌟 Hackathon Evaluation Compliance Checklist

- [x] **Database Design**: Normalized relational tables, foreign key constraints, composite index on billing periods.
- [x] **No BAAS Dependency**: Clean local relational database without relying on Firebase, Supabase, or unstructured MongoDB.
- [x] **Dynamic Real-Time Data**: Dynamic database queries and REST APIs.
- [x] **Robust Input Validation**: Strict client-side and server-side validation.
- [x] **Git & Collaboration**: Distinct commits by all team members reflecting individual contributions.
- [x] **Sub-2s Query Performance**: Indexed lookups on customer, subscription status, and billing cycle.
- [x] **Intuitive Odoo-like UI**: Statusbar pipelines, smart buttons, actionable filters, and unified financial analytics.

---
*Developed with ❤️ for Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026*
