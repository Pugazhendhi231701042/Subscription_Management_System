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

### Relational Schema (PostgreSQL / SQLite via Prisma ORM)
The database enforces strict relational integrity with foreign keys, composite unique constraints, and indexes:

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
| **Pugazhendhi B (Lead)** | `@Pugazhendhi231701042` | Architecture, Database Modeling, State Machine, Integration & Deployment |
| **Khadeejah Nuhaa** | `@khadeejahnuhaa08` | Authentication, RBAC, Customer Isolation, Security & Audit Logs |
| **Lakshmi Bhargavi** | `@Lakshmi-230401077` | Product Catalog, Variants, Plans, Quotation Templates & Lifecycle |
| **Hemanth** | Pending | Automated Billing Engine, Invoicing, Discounts, Payments & Finance Dashboard |

---

## ⚡ Tech Stack

- **Frontend**: React 18 / Next.js / TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI patterns.
- **Backend**: Node.js / Express REST API with modular controllers, service layers, and validation.
- **Database & ORM**: PostgreSQL / SQLite with Prisma ORM (relational schemas, indexed queries, composite unique constraints).
- **Validation**: Strict schema validation with regex password complexity (uppercase, lowercase, special char, >8 chars) and email integrity.
- **Billing Scheduler**: Automated idempotency-guaranteed recurring billing runner with dry-run and simulation controls.

---

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js (v18+)
- npm / yarn / pnpm

### 2. Setup & Installation
```bash
# Clone the repository
git clone https://github.com/Pugazhendhi231701042/Subscription_Management_System.git
cd Subscription_Management_System

# Install dependencies
npm install

# Run database migrations and seed realistic demo data
npx prisma migrate dev --name init
npx prisma db seed

# Launch development servers
npm run dev
```

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
