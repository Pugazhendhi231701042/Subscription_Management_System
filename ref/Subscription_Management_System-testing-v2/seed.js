import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const databasePath = resolve(process.env.DATABASE_PATH || "./data/brightloop.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (collection, id));
  CREATE INDEX IF NOT EXISTS records_collection ON records(collection);
  CREATE UNIQUE INDEX IF NOT EXISTS unique_user_email ON records(json_extract(data, '$.email')) WHERE collection='users';
  CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const writeRow = db.prepare("INSERT INTO records(collection,id,data) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data");
const readCollectionCount = db.prepare("SELECT count(*) as count FROM records WHERE collection=?");

export async function runSeedIfEmpty() {
  const userCount = readCollectionCount.get("users")?.count || 0;
  if (userCount > 0) {
    console.log("Database already contains data, skipping seed.");
    return;
  }

  console.log("Seeding initial demo data for Brightloop Subscription Management System...");
  const stamp = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
  };

  const defaultPassword = await bcrypt.hash("Brightloop@2026", 12);

  // 1. Users
  const users = [
    { _id: "usr_admin_1", email: "admin@brightloop.local", name: "Brightloop SuperAdmin", role: "admin", isMasterAdmin: true, password: defaultPassword, createdAt: stamp(-60), updatedAt: stamp() },
    { _id: "usr_admin_2", email: "admin@brightloop.com", name: "Brightloop SuperAdmin", role: "admin", isMasterAdmin: true, password: defaultPassword, createdAt: stamp(-60), updatedAt: stamp() },
    { _id: "usr_staff_1", email: "sales@brightloop.com", name: "Rahul Verma (Sales)", role: "staff", status: "Active", password: defaultPassword, createdAt: stamp(-30), updatedAt: stamp() },
    { _id: "usr_cust_1", email: "contact@acmecorp.com", name: "Vikram Malhotra", role: "customer", company: "Acme Technologies Inc.", password: defaultPassword, createdAt: stamp(-45), updatedAt: stamp() },
    { _id: "usr_cust_2", email: "billing@techstart.io", name: "Ananya Sharma", role: "customer", company: "TechStart AI Labs", password: defaultPassword, createdAt: stamp(-40), updatedAt: stamp() }
  ];

  for (const u of users) {
    writeRow.run("users", u._id, JSON.stringify(u));
  }

  // 2. Customers
  const customers = [
    { _id: "cust_1", name: "Acme Technologies Inc.", email: "contact@acmecorp.com", phone: "+91 98765 43210", company: "Acme Technologies Inc.", status: "Active", createdAt: stamp(-45), updatedAt: stamp() },
    { _id: "cust_2", name: "TechStart AI Labs", email: "billing@techstart.io", phone: "+91 98765 43211", company: "TechStart AI Labs", status: "Active", createdAt: stamp(-40), updatedAt: stamp() },
    { _id: "cust_3", name: "BlueSky Logistics", email: "ops@blueskylogistics.com", phone: "+91 98765 43212", company: "BlueSky Logistics", status: "Active", createdAt: stamp(-20), updatedAt: stamp() }
  ];

  for (const c of customers) {
    writeRow.run("customers", c._id, JSON.stringify(c));
  }

  // 3. Products
  const products = [
    {
      _id: "prod_1",
      name: "Brightloop ERP Core",
      type: "Software",
      salesPrice: 4999,
      costPrice: 1200,
      notes: "Unified enterprise subscription management platform.",
      variants: [
        { name: "Odoo Connected", priceDelta: 560 },
        { name: "Enterprise Dedicated", priceDelta: 1500 }
      ],
      createdAt: stamp(-60),
      updatedAt: stamp()
    },
    {
      _id: "prod_2",
      name: "Recurring Invoicing Engine",
      type: "Software",
      salesPrice: 2499,
      costPrice: 600,
      notes: "Automated billing day generator with idempotency.",
      variants: [
        { name: "High Volume (10k+ invoices)", priceDelta: 1000 }
      ],
      createdAt: stamp(-60),
      updatedAt: stamp()
    },
    {
      _id: "prod_3",
      name: "24/7 Dedicated SLA Support",
      type: "Service",
      salesPrice: 1999,
      costPrice: 500,
      notes: "Guaranteed 1-hour priority support turnaround.",
      variants: [],
      createdAt: stamp(-60),
      updatedAt: stamp()
    }
  ];

  for (const p of products) {
    writeRow.run("products", p._id, JSON.stringify(p));
  }

  // 4. Plans
  const plans = [
    {
      _id: "plan_1",
      planName: "Starter Monthly",
      name: "Starter Monthly",
      product: "Brightloop ERP Core",
      price: 4999,
      billingFrequency: "Monthly",
      minimumQuantity: 1,
      status: "Active",
      autoClose: false,
      allowRenewal: true,
      createdAt: stamp(-60),
      updatedAt: stamp()
    },
    {
      _id: "plan_2",
      planName: "Annual Enterprise",
      name: "Annual Enterprise",
      product: "Brightloop ERP Core",
      price: 49990,
      billingFrequency: "Yearly",
      minimumQuantity: 5,
      status: "Active",
      autoClose: false,
      allowRenewal: true,
      createdAt: stamp(-60),
      updatedAt: stamp()
    },
    {
      _id: "plan_3",
      planName: "Invoicing Pro Monthly",
      name: "Invoicing Pro Monthly",
      product: "Recurring Invoicing Engine",
      price: 2499,
      billingFrequency: "Monthly",
      minimumQuantity: 1,
      status: "Active",
      autoClose: false,
      allowRenewal: true,
      createdAt: stamp(-60),
      updatedAt: stamp()
    }
  ];

  for (const pl of plans) {
    writeRow.run("plans", pl._id, JSON.stringify(pl));
  }

  // 5. Subscriptions
  const subscriptions = [
    {
      _id: "sub_1",
      number: "SUB-2026-0001",
      customer: "Acme Technologies Inc.",
      customerEmail: "contact@acmecorp.com",
      plan: "Starter Monthly",
      product: "Brightloop ERP Core",
      amount: 5559,
      quantity: 1,
      billingFrequency: "Monthly",
      startDate: stamp(-30).slice(0, 10),
      renewalDate: stamp(30).slice(0, 10),
      renewal: "Next month",
      status: "Active",
      allowRenewal: true,
      autoClose: false,
      paymentTerms: 15,
      items: [
        { product: "Brightloop ERP Core", variant: "Odoo Connected", description: "Brightloop ERP Core - Odoo Connected", quantity: 1, unitPrice: 5559 }
      ],
      createdAt: stamp(-30),
      updatedAt: stamp()
    },
    {
      _id: "sub_2",
      number: "SUB-2026-0002",
      customer: "TechStart AI Labs",
      customerEmail: "billing@techstart.io",
      plan: "Annual Enterprise",
      product: "Brightloop ERP Core",
      amount: 49990,
      quantity: 5,
      billingFrequency: "Yearly",
      startDate: stamp(-365).slice(0, 10),
      renewalDate: stamp(15).slice(0, 10),
      renewal: "In 15 days",
      status: "Active",
      allowRenewal: true,
      autoClose: false,
      paymentTerms: 30,
      items: [
        { product: "Brightloop ERP Core", description: "Brightloop ERP Core (Enterprise)", quantity: 5, unitPrice: 9998 }
      ],
      createdAt: stamp(-365),
      updatedAt: stamp()
    },
    {
      _id: "sub_3",
      number: "SUB-2026-0003",
      customer: "BlueSky Logistics",
      customerEmail: "ops@blueskylogistics.com",
      plan: "Invoicing Pro Monthly",
      product: "Recurring Invoicing Engine",
      amount: 2499,
      quantity: 1,
      billingFrequency: "Monthly",
      startDate: stamp(-15).slice(0, 10),
      renewalDate: stamp(15).slice(0, 10),
      renewal: "In 15 days",
      status: "Paused",
      allowRenewal: true,
      autoClose: false,
      paymentTerms: 15,
      items: [
        { product: "Recurring Invoicing Engine", description: "Recurring Invoicing Engine", quantity: 1, unitPrice: 2499 }
      ],
      createdAt: stamp(-15),
      updatedAt: stamp()
    }
  ];

  for (const s of subscriptions) {
    writeRow.run("subscriptions", s._id, JSON.stringify(s));
  }

  // 6. Invoices
  const invoices = [
    {
      _id: "inv_1",
      number: "INV-2026-0001",
      customer: "Acme Technologies Inc.",
      customerEmail: "contact@acmecorp.com",
      subscription: "sub_1",
      invoiceDate: stamp(-30).slice(0, 10),
      dueDate: stamp(-15).slice(0, 10),
      amount: 5559,
      total: 5559,
      subtotal: 5559,
      paidAmount: 5559,
      outstandingAmount: 0,
      status: "Paid",
      items: [
        { product: "Brightloop ERP Core", description: "Brightloop ERP Core - Odoo Connected", quantity: 1, unitPrice: 5559 }
      ],
      createdAt: stamp(-30),
      updatedAt: stamp()
    },
    {
      _id: "inv_2",
      number: "INV-2026-0002",
      customer: "TechStart AI Labs",
      customerEmail: "billing@techstart.io",
      subscription: "sub_2",
      invoiceDate: stamp(-45).slice(0, 10),
      dueDate: stamp(-15).slice(0, 10),
      amount: 49990,
      total: 49990,
      subtotal: 49990,
      paidAmount: 0,
      outstandingAmount: 49990,
      status: "Overdue",
      items: [
        { product: "Brightloop ERP Core", description: "Brightloop ERP Core (Enterprise)", quantity: 5, unitPrice: 9998 }
      ],
      createdAt: stamp(-45),
      updatedAt: stamp()
    }
  ];

  for (const inv of invoices) {
    writeRow.run("invoices", inv._id, JSON.stringify(inv));
  }

  // 7. Payments
  const payments = [
    {
      _id: "pay_1",
      number: "PAY-2026-0001",
      customer: "Acme Technologies Inc.",
      invoice: "inv_1",
      amount: 5559,
      paymentMethod: "UPI",
      paymentDate: stamp(-28).slice(0, 10),
      status: "Succeeded",
      note: "UPI transaction reference: UPI-98437194",
      createdAt: stamp(-28),
      updatedAt: stamp()
    }
  ];

  for (const pay of payments) {
    writeRow.run("payments", pay._id, JSON.stringify(pay));
  }

  // 8. Quotations & Templates
  const quotationTemplates = [
    {
      _id: "tmpl_1",
      name: "Odoo Enterprise Integration Pack",
      templateName: "Odoo Enterprise Integration Pack",
      plan: "Annual Enterprise",
      validDays: 30,
      amount: 55550,
      items: [
        { product: "Brightloop ERP Core", description: "Brightloop ERP Core - Odoo Connected", quantity: 5, unitPrice: 5559 },
        { product: "24/7 Dedicated SLA Support", description: "Priority SLA Support", quantity: 1, unitPrice: 1999 }
      ],
      createdAt: stamp(-60),
      updatedAt: stamp()
    }
  ];

  for (const tmpl of quotationTemplates) {
    writeRow.run("quotationTemplates", tmpl._id, JSON.stringify(tmpl));
  }

  const quotations = [
    {
      _id: "quote_1",
      number: "QUO-2026-0001",
      customer: "Acme Technologies Inc.",
      customerEmail: "contact@acmecorp.com",
      plan: "Starter Monthly",
      amount: 5559,
      status: "Accepted",
      validDays: 30,
      validUntil: stamp(15).slice(0, 10),
      startDate: stamp().slice(0, 10),
      items: [
        { product: "Brightloop ERP Core", description: "Brightloop ERP Core - Odoo Connected", quantity: 1, unitPrice: 5559 }
      ],
      createdAt: stamp(-10),
      updatedAt: stamp()
    }
  ];

  for (const q of quotations) {
    writeRow.run("quotations", q._id, JSON.stringify(q));
  }

  // 9. Taxes & Discounts
  const taxes = [
    { _id: "tax_1", name: "GST (18%)", rate: 18, scope: "All", status: "Active", createdAt: stamp(-60), updatedAt: stamp() }
  ];
  for (const t of taxes) {
    writeRow.run("taxes", t._id, JSON.stringify(t));
  }

  const discounts = [
    { _id: "disc_1", name: "Launch Promo", type: "Percentage", value: 10, minimumPurchase: 5000, minimumQuantity: 1, scope: "All", status: "Active", usageLimit: 100, usageCount: 2, createdAt: stamp(-60), updatedAt: stamp() }
  ];
  for (const d of discounts) {
    writeRow.run("discounts", d._id, JSON.stringify(d));
  }

  // 10. Work Items (staff management)
  const workItems = [
    { _id: "work_1", title: "Verify GST tax invoice generation for Acme", assigneeEmail: "sales@brightloop.com", assigneeName: "Rahul Verma (Sales)", status: "In progress", dueDate: stamp(3).slice(0, 10), description: "Double-check tax rates on monthly subscription.", createdAt: stamp(-2), updatedAt: stamp() }
  ];
  for (const w of workItems) {
    writeRow.run("workItems", w._id, JSON.stringify(w));
  }

  console.log("Seeding complete! Database ready with realistic demo data.");
}

runSeedIfEmpty().catch(console.error);
