import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_PATH = path.resolve(process.cwd(), 'subscription.db');
export const db = new Database(DB_PATH);

// Enforce foreign key constraints and WAL performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STAFF', -- ADMIN, STAFF, CUSTOMER
      reset_token TEXT,
      reset_token_expiry TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      street TEXT,
      city TEXT,
      country TEXT DEFAULT 'India',
      tax_number TEXT,
      payment_terms TEXT DEFAULT 'Net 15',
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_name);

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'Software', -- Software, Add-on, Service
      sales_price REAL NOT NULL,
      cost_price REAL DEFAULT 0.0,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      price_adjustment REAL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      billing_frequency TEXT NOT NULL, -- DAILY, WEEKLY, MONTHLY, YEARLY
      price REAL NOT NULL,
      min_quantity INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      auto_close_on_end INTEGER DEFAULT 0,
      allow_pause INTEGER DEFAULT 1,
      allow_early_close INTEGER DEFAULT 1,
      allow_renewal INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_plans_product ON plans(product_id);

    CREATE TABLE IF NOT EXISTS taxes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      tax_type TEXT DEFAULT 'PERCENTAGE',
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      discount_type TEXT NOT NULL, -- PERCENTAGE, FIXED
      discount_value REAL NOT NULL,
      min_purchase REAL DEFAULT 0.0,
      min_quantity INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      usage_limit INTEGER,
      usage_count INTEGER DEFAULT 0,
      scope TEXT DEFAULT 'SUBSCRIPTION', -- SUBSCRIPTION, SPECIFIC_PRODUCT
      target_product_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (target_product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      validity_days INTEGER DEFAULT 30,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quotation_template_lines (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quotation_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      template_id TEXT,
      validity_date TEXT NOT NULL,
      payment_terms TEXT DEFAULT 'Net 15',
      status TEXT DEFAULT 'DRAFT', -- DRAFT, QUOTATION, CONFIRMED, CANCELLED
      subtotal REAL DEFAULT 0.0,
      discount_amount REAL DEFAULT 0.0,
      tax_amount REAL DEFAULT 0.0,
      total_amount REAL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_lines (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0.0,
      amount REAL NOT NULL,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      subscription_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      quotation_id TEXT UNIQUE,
      status TEXT DEFAULT 'DRAFT', -- DRAFT, QUOTATION, CONFIRMED, ACTIVE, PAUSED, CLOSED
      start_date TEXT NOT NULL,
      expiry_date TEXT,
      next_billing_date TEXT NOT NULL,
      last_billed_date TEXT,
      payment_terms TEXT DEFAULT 'Net 15',
      auto_close_on_end INTEGER DEFAULT 0,
      allow_pause INTEGER DEFAULT 1,
      allow_early_close INTEGER DEFAULT 1,
      allow_renewal INTEGER DEFAULT 1,
      subtotal REAL DEFAULT 0.0,
      discount_amount REAL DEFAULT 0.0,
      tax_amount REAL DEFAULT 0.0,
      total_amount REAL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subs_billing ON subscriptions(next_billing_date);

    CREATE TABLE IF NOT EXISTS subscription_lines (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0.0,
      amount REAL NOT NULL,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      subscription_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      billing_period_start TEXT NOT NULL,
      billing_period_end TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, PAID, OVERDUE, CANCELLED
      subtotal REAL DEFAULT 0.0,
      discount_amount REAL DEFAULT 0.0,
      tax_amount REAL DEFAULT 0.0,
      total_amount REAL DEFAULT 0.0,
      amount_paid REAL DEFAULT 0.0,
      amount_due REAL DEFAULT 0.0,
      sent_at TEXT,
      cancelled_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(subscription_id, billing_period_start, billing_period_end), -- STRICT DUPLICATE PREVENTION!
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      description TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      tax_rate REAL DEFAULT 0.0,
      amount REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT UNIQUE NOT NULL,
      invoice_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL, -- CREDIT_CARD, BANK_TRANSFER, UPI, CASH, OTHER
      payment_date TEXT NOT NULL,
      reference_number TEXT,
      notes TEXT,
      recorded_by_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Seed default data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedDatabase();
  }
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function seedDatabase() {
  console.log('🌱 Seeding native SQLite database with realistic business records...');

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Brightloop@2026', salt);
  const now = new Date().toISOString();

  // 1. Users
  const adminId = 'usr_admin';
  const staffId = 'usr_staff';
  const custUserId1 = 'usr_acme';
  const custUserId2 = 'usr_techstart';

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(adminId, 'admin@brightloop.com', 'Brightloop SuperAdmin', passwordHash, 'ADMIN', now, now);
  insertUser.run(staffId, 'sales@brightloop.com', 'Sarah Connor (Sales Rep)', passwordHash, 'STAFF', now, now);
  insertUser.run(custUserId1, 'contact@acmecorp.com', 'John Miller', passwordHash, 'CUSTOMER', now, now);
  insertUser.run(custUserId2, 'billing@techstart.io', 'Ananya Sharma', passwordHash, 'CUSTOMER', now, now);

  // 2. Customers
  const custId1 = 'cust_acme';
  const custId2 = 'cust_techstart';

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, user_id, company_name, contact_name, email, phone, street, city, country, tax_number, payment_terms, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCustomer.run(custId1, custUserId1, 'Acme Global Corporation', 'John Miller', 'contact@acmecorp.com', '+91 98765 43210', '42 MG Road', 'Bangalore', 'India', '29ABCDE1234F1Z5', 'Net 15', 'ACTIVE', now, now);
  insertCustomer.run(custId2, custUserId2, 'TechStart AI Labs', 'Ananya Sharma', 'billing@techstart.io', '+91 91234 56789', '10 Marine Drive', 'Kochi', 'India', '32AABCT9876Q1Z2', 'Immediate', 'ACTIVE', now, now);

  // 3. Products & Variants (with Odoo Edition +560!)
  const prod1Id = 'prod_erp';
  const prod2Id = 'prod_addon';

  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, type, sales_price, cost_price, notes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProduct.run(prod1Id, 'Brightloop Business Suite', 'Software', 4000.0, 800.0, 'Flagship enterprise resource planning & accounting engine', 1, now, now);
  insertProduct.run(prod2Id, 'Automated Billing & Invoicing Engine', 'Add-on', 1200.0, 200.0, 'Batch recurring billing runner with multi-currency tax', 1, now, now);

  const insertVariant = db.prepare(`
    INSERT INTO product_variants (id, product_id, variant_name, price_adjustment, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const varStandardId = 'var_standard';
  const varOdooId = 'var_odoo';
  const varEntId = 'var_enterprise';

  insertVariant.run(varStandardId, prod1Id, 'Standard Edition', 0.0, now, now);
  insertVariant.run(varOdooId, prod1Id, 'Odoo Connected Brand', 560.0, now, now); // +560 price adjustment as in PS!
  insertVariant.run(varEntId, prod1Id, 'Enterprise High-Availability', 2500.0, now, now);

  // 4. Plans
  const plan1Id = 'plan_monthly';
  const plan2Id = 'plan_annual';
  const plan3Id = 'plan_weekly';

  const insertPlan = db.prepare(`
    INSERT INTO plans (id, product_id, name, billing_frequency, price, min_quantity, auto_close_on_end, allow_pause, allow_early_close, allow_renewal, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPlan.run(plan1Id, prod1Id, 'Business Monthly Flex', 'MONTHLY', 4000.0, 1, 0, 1, 1, 1, 1, now, now);
  insertPlan.run(plan2Id, prod1Id, 'Corporate Annual Contract', 'YEARLY', 42000.0, 5, 1, 0, 0, 1, 1, now, now);
  insertPlan.run(plan3Id, prod2Id, 'Sprint Weekly Pass', 'WEEKLY', 500.0, 1, 0, 1, 1, 1, 1, now, now);

  // 5. Taxes
  const insertTax = db.prepare(`
    INSERT INTO taxes (id, name, rate, tax_type, is_default, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTax.run('tax_gst18', 'GST 18%', 18.0, 'PERCENTAGE', 1, 1, now, now);
  insertTax.run('tax_cess5', 'Tech Cess 5%', 5.0, 'PERCENTAGE', 0, 1, now, now);

  // 6. Discounts (Admin configured)
  const insertDiscount = db.prepare(`
    INSERT INTO discounts (id, name, discount_type, discount_value, min_purchase, min_quantity, usage_limit, usage_count, scope, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertDiscount.run('disc_bulk10', 'Bulk Seats 10% Off', 'PERCENTAGE', 10.0, 10000.0, 3, 50, 0, 'SUBSCRIPTION', 1, now, now);
  insertDiscount.run('disc_credit1000', 'New Client ₹1,000 Flat Credit', 'FIXED', 1000.0, 5000.0, 1, 25, 0, 'SUBSCRIPTION', 1, now, now);

  // 7. Quotation Templates
  db.prepare(`
    INSERT INTO quotation_templates (id, name, plan_id, validity_days, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('tmpl_odoo_bundle', 'Standard Odoo Business Bundle', plan1Id, 30, now, now);

  db.prepare(`
    INSERT INTO quotation_template_lines (id, template_id, product_id, variant_id, quantity, unit_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('tmpl_line_1', 'tmpl_odoo_bundle', prod1Id, varOdooId, 5, 4560.0);

  // 8. Quotation
  const quoteId = 'qt_2026_0001';
  db.prepare(`
    INSERT INTO quotations (id, quotation_number, customer_id, plan_id, template_id, validity_date, payment_terms, status, subtotal, tax_amount, total_amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(quoteId, 'QT-2026-0001', custId1, plan1Id, 'tmpl_odoo_bundle', new Date(Date.now() + 30 * 86400000).toISOString(), 'Net 15', 'CONFIRMED', 28800.0, 5184.0, 33984.0, now, now);

  // 9. Subscriptions
  const sub1Id = 'sub_2026_0001';
  const sub2Id = 'sub_2026_0002';
  const sub3Id = 'sub_2026_0003';

  const insertSub = db.prepare(`
    INSERT INTO subscriptions (id, subscription_number, customer_id, plan_id, quotation_id, status, start_date, expiry_date, next_billing_date, payment_terms, auto_close_on_end, allow_pause, allow_early_close, allow_renewal, subtotal, tax_amount, total_amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSub.run(sub1Id, 'SUB-2026-0001', custId1, plan1Id, quoteId, 'ACTIVE', new Date(Date.now() - 30 * 86400000).toISOString(), new Date(Date.now() + 335 * 86400000).toISOString(), now, 'Net 15', 0, 1, 1, 1, 28800.0, 5184.0, 33984.0, now, now);
  insertSub.run(sub2Id, 'SUB-2026-0002', custId2, plan2Id, null, 'ACTIVE', new Date(Date.now() - 60 * 86400000).toISOString(), new Date(Date.now() + 300 * 86400000).toISOString(), now, 'Immediate', 1, 0, 0, 1, 42000.0, 7560.0, 49560.0, now, now);
  insertSub.run(sub3Id, 'SUB-2026-0003', custId2, plan3Id, null, 'PAUSED', new Date(Date.now() - 15 * 86400000).toISOString(), new Date(Date.now() + 90 * 86400000).toISOString(), new Date(Date.now() + 7 * 86400000).toISOString(), 'Net 15', 0, 1, 1, 1, 500.0, 90.0, 590.0, now, now);

  // Subscription Lines
  const insertSubLine = db.prepare(`
    INSERT INTO subscription_lines (id, subscription_id, product_id, variant_id, quantity, unit_price, tax_rate, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSubLine.run('sline_1', sub1Id, prod1Id, varOdooId, 5, 4560.0, 18.0, 22800.0);
  insertSubLine.run('sline_2', sub1Id, prod2Id, null, 5, 1200.0, 18.0, 6000.0);
  insertSubLine.run('sline_3', sub2Id, prod1Id, null, 5, 8400.0, 18.0, 42000.0);

  // 10. Invoices & Payments
  const inv1Id = 'inv_2026_0001';
  const inv2Id = 'inv_2026_0002';

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, invoice_number, subscription_id, customer_id, billing_period_start, billing_period_end, issue_date, due_date, status, subtotal, tax_amount, total_amount, amount_paid, amount_due, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertInvoice.run(inv1Id, 'INV-2026-00001', sub1Id, custId1, new Date(Date.now() - 60 * 86400000).toISOString(), new Date(Date.now() - 30 * 86400000).toISOString(), new Date(Date.now() - 30 * 86400000).toISOString(), new Date(Date.now() - 15 * 86400000).toISOString(), 'PAID', 28800.0, 5184.0, 33984.0, 33984.0, 0.0, now, now);
  insertInvoice.run(inv2Id, 'INV-2026-00002', sub2Id, custId2, new Date(Date.now() - 90 * 86400000).toISOString(), new Date(Date.now() - 60 * 86400000).toISOString(), new Date(Date.now() - 60 * 86400000).toISOString(), new Date(Date.now() - 35 * 86400000).toISOString(), 'CONFIRMED', 42000.0, 7560.0, 49560.0, 0.0, 49560.0, now, now);

  // Invoice Lines
  db.prepare(`
    INSERT INTO invoice_lines (id, invoice_id, product_id, variant_id, description, quantity, unit_price, tax_rate, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('iline_1', inv1Id, prod1Id, varOdooId, 'Brightloop Business Suite (Odoo Connected Brand) - Monthly Billing', 5, 4560.0, 18.0, 22800.0);

  // Payments
  db.prepare(`
    INSERT INTO payments (id, payment_number, invoice_id, customer_id, amount, payment_method, payment_date, reference_number, notes, recorded_by_user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('pay_2026_0001', 'PAY-2026-00001', inv1Id, custId1, 33984.0, 'UPI', new Date(Date.now() - 25 * 86400000).toISOString(), 'UPI/2026/OCT/98218731', 'Full settlement via Google Pay / UPI', staffId, now, now);

  // Audit Log
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('log_init', adminId, 'CREATE', 'DATABASE', 'INIT', 'Initialized native SQLite database schema and initial business entities', now);

  console.log('✅ Native SQLite database initialized and seeded successfully!');
}
