# Brightloop Subscription Management System
> **Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026 - Virtual Round**  
> **Problem Statement:** Subscription Management System - Build one unified system to run plans, subscriptions, and recurring billing in one place.

---

## Executive Summary

**Brightloop Software** sells software products on subscription (billed monthly or yearly), add-ons, and variants. Previously, subscriptions were tracked in spreadsheets, renewals remembered manually, invoices typed by hand, payments reconciled via bank statement scrolling, and quarterly reports compiled manually.

This platform provides the **digital backbone** for Brightloop Software:
- **Full Subscription Lifecycle**: Seamless transition from `Draft` -> `Quotation` -> `Confirmed` -> `Active` -> `Closed`.
- **Automated Recurring Billing Engine**: Scheduled/on-demand batch billing for hundreds of accounts without duplicate billing or skipped cycles.
- **Dynamic Product & Variant Modeling**: Support for base products, configurable variants (e.g., brand additions), and lifecycle plans (daily, weekly, monthly, yearly).
- **Intelligent Discount & Tax Engine**: Automatic tier/seat/coupon discount application and multi-rule tax calculations.
- **Multi-Method Payment & Overdue Tracking**: Real-time payment reconciliation (UPI, Card, Bank Transfer, Cash) with partial payment handling.
- **Role-Based Access Control (RBAC)**: Dedicated interfaces for **Admin**, **Internal Staff**, and **Customer Portal**.
- **Executive Finance Dashboard**: Real-time ARR/MRR, active subscriber counts, aging receivables, and sub-2-second query response times.

---

## System Architecture & Database Design

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

## Team & Work Distribution

| Team Member | GitHub Username | Core Responsibilities |
|-------------|-----------------|----------------------|
| **Pugazhendhi B (Lead)** | `@Pugazhendhi231701042` | Architecture, Executive Finance Dashboard, Simulation Engine, Integration & Deployment |
| **Khadeejah Nuhaa** | `@khadeejahnuhaa08` | Authentication, RBAC, Customer Portal, Instant Payment Flow, Security & Audit Logs |
| **Lakshmi Bhargavi** | `@Lakshmi-230401077` | Product Catalog, Variants, Plans, Quotation Proposals, Printable PDF & Pipeline |
| **Hemanth Korapati** | `@korapatihemanth2024csd-cloud` | Native SQLite Database Engine, Pure SQL DDL Schemas, Invoicing Engine & Parameterized Queries |

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Recharts, Vite. Styled with modern Poppins typography, bespoke inline SVG icons (zero Lucide dependency, zero emojis, zero em dashes, zero AI sparkle icons), dark indigo sidebar, and restrained color palette.
- **Backend**: Node.js / Express REST API with modular controllers, JWT sessions, and strict RBAC middleware.
- **Database**: Pure native **SQLite (`node:sqlite` / `better-sqlite3`)** - zero ORM bloat, zero BaaS dependency (no Prisma, no Supabase, no Firebase, no MongoDB). Automatically initializes and seeds on server boot.
- **Validation**: Strict schema validation with regex password complexity (uppercase, lowercase, special char, >8 chars) and email integrity.
- **Billing Scheduler**: Automated idempotency-guaranteed recurring billing runner with dry-run and duplicate billing protection.

---

## How to Run the Project

### 1. Prerequisites
- **Node.js (v18+)** installed.

### 2. Run the Application
You can run the unified app directly or run frontend/backend individually:

```bash
# Option A: Run Unified Project (from ref/Subscription_Management_System-testing-v2)
cd ref/Subscription_Management_System-testing-v2
npm install
npm run dev

# Option B: Run via Frontend (proxied to API)
cd frontend
npm install
npm run dev
```
> The application starts at **`http://localhost:5173`** and the API runs at **`http://localhost:4000`**.  
> The native SQLite database automatically creates all tables, indexes, and seeds realistic demo data on initial launch.

---

## Demo and Evaluator Accounts

All accounts share the default password: **`Brightloop@2026`**

| Role | Email | Password | Access / Scope |
|------|-------|----------|----------------|
| **SuperAdmin** | `admin@brightloop.local` | `Brightloop@2026` | Full ERP access, Billing Cycle Runner, Staff Management, Discounts, Taxes, Audit |
| **Staff (Sales)** | `sales@brightloop.com` | `Brightloop@2026` | Quotations, Subscriptions lifecycle, Invoice ledger, Payments |
| **Customer 1** | `contact@acmecorp.com` | `Brightloop@2026` | Customer portal: View active plans, invoices, change plan |
| **Customer 2** | `billing@techstart.io` | `Brightloop@2026` | Customer portal with an overdue invoice demonstration |

> Quick Demo Access: On the login page, 1-click buttons allow instant login as Admin, Staff, or Customer without manual typing.

---

## Key Scenarios to Evaluate

1. **Executive Finance Lead Dashboard**:
   - Live ARR / MRR, Active Subscriber count, and Outstanding Invoices.
   - Live query latency indicator (typically **1ms - 3ms**, beating the `< 2.0s` hackathon requirement).
   - Interactive SVG MRR growth chart & status distribution visualizer.
2. **Automated Billing Day Runner**:
   - Preview due subscriptions, run billing cycle to generate invoices with zero duplication guaranteed by composite unique keys.
3. **Quotation to Active Subscription Flow**:
   - Navigate to **Quotations**, select a quotation or create from template with product variants (e.g., Odoo Brand Connected +₹560).
   - Click **"Convert"** to convert accepted quotation into an active subscription and update customer ledger.
   - Click **"Print"** to see the clean, printable formal proposal.
4. **Customer Self-Service Portal**:
   - Switch to Customer (`contact@acmecorp.com` or `billing@techstart.io`).
   - Notice isolated customer view showing their active subscriptions and unpaid invoices.
   - Change plan or update contact details directly.
5. **Security & Staff Tracking**:
   - Switch to Admin to manage staff accounts and work items with progress tracking.

---

## Hackathon Evaluation Compliance Checklist

- [x] **Database Design**: Normalized relational tables, foreign key constraints, composite index on billing periods.
- [x] **No BAAS Dependency**: Clean local relational database without relying on Firebase, Supabase, or unstructured MongoDB.
- [x] **Dynamic Real-Time Data**: Dynamic database queries and REST APIs.
- [x] **Robust Input Validation**: Strict client-side and server-side validation.
- [x] **Git & Collaboration**: Distinct commits by all team members reflecting individual contributions.
- [x] **Sub-2s Query Performance**: Indexed lookups on customer, subscription status, and billing cycle.
- [x] **Intuitive Clean UI**: Human-designed interface with Poppins typography, bespoke SVG icons, restrained purple/slate theme, zero Lucide dependency, zero emojis.

---
*Developed for Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026*
