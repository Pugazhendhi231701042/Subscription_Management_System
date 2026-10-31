import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const { search } = req.query;
    let query = `
      SELECT c.id, c.user_id as userId, c.company_name as companyName, c.contact_name as contactName,
             c.email, c.phone, c.street, c.city, c.country, c.payment_terms as paymentTerms,
             c.status, c.created_at as createdAt
      FROM customers c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ' AND (c.company_name LIKE ? OR c.contact_name LIKE ? OR c.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY c.created_at DESC';

    const customers = db.prepare(query).all(...params) as any[];

    for (const c of customers) {
      const subCount = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE customer_id = ?').get(c.id) as { count: number };
      const invCount = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?').get(c.id) as { count: number };
      const payCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE customer_id = ?').get(c.id) as { count: number };

      c._count = {
        subscriptions: subCount.count,
        invoices: invCount.count,
        payments: payCount.count
      };
    }

    return res.json({ success: true, data: customers });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve customers.' });
  }
}

export async function getCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!c) return res.status(404).json({ success: false, error: 'Customer not found.' });

    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    return res.json({ success: true, data: c });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve customer.' });
  }
}

export async function getPortalData(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.customerId) {
      return res.status(400).json({ success: false, error: 'User is not linked to a customer account.' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.user.customerId) as any;
    if (!customer) return res.status(404).json({ success: false, error: 'Customer profile not found.' });

    const subscriptions = db.prepare(`
      SELECT s.id, s.subscription_number as subscriptionNumber, s.status,
             s.start_date as startDate, s.expiry_date as expiryDate,
             s.next_billing_date as nextBillingDate, s.payment_terms as paymentTerms,
             s.subtotal, s.tax_amount as taxAmount, s.total_amount as totalAmount,
             p.name as planName, p.billing_frequency as billingFrequency
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
    `).all(customer.id) as any[];

    for (const sub of subscriptions) {
      sub.plan = { name: sub.planName, billingFrequency: sub.billingFrequency };
    }

    const invoices = db.prepare(`
      SELECT id, invoice_number as invoiceNumber, billing_period_start as billingPeriodStart,
             billing_period_end as billingPeriodEnd, issue_date as issueDate, due_date as dueDate,
             status, subtotal, discount_amount as discountAmount, tax_amount as taxAmount,
             total_amount as totalAmount, amount_paid as amountPaid, amount_due as amountDue
      FROM invoices
      WHERE customer_id = ?
      ORDER BY issue_date DESC
    `).all(customer.id) as any[];

    const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');
    const totalOutstanding = invoices
      .filter(i => ['CONFIRMED', 'OVERDUE'].includes(i.status))
      .reduce((sum, i) => sum + i.amountDue, 0);

    return res.json({
      success: true,
      profile: {
        id: customer.id,
        companyName: customer.company_name,
        contactName: customer.contact_name,
        email: customer.email,
        phone: customer.phone,
        street: customer.street,
        city: customer.city,
        country: customer.country,
        paymentTerms: customer.payment_terms
      },
      summary: {
        activeSubscriptionsCount: activeSubs.length,
        totalOutstanding
      },
      subscriptions,
      invoices
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to load customer portal data.' });
  }
}

export async function updatePortalProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.customerId) {
      return res.status(400).json({ success: false, error: 'Customer not identified.' });
    }

    const { contactName, phone, street, city } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE customers
      SET contact_name = COALESCE(?, contact_name),
          phone = COALESCE(?, phone),
          street = COALESCE(?, street),
          city = COALESCE(?, city),
          updated_at = ?
      WHERE id = ?
    `).run(contactName || null, phone || null, street || null, city || null, now, req.user.customerId);

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
}

export async function portalPayInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { paymentMethod = 'UPI', referenceNumber } = req.body;

    if (!req.user?.customerId) {
      return res.status(403).json({ success: false, error: 'Only customers can make portal payments.' });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found.' });

    if (invoice.customer_id !== req.user.customerId) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Invoice already paid.' });
    }

    const payCountRow = db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number };
    const year = new Date().getFullYear();
    const paymentNumber = `PAY-${year}-${String(payCountRow.count + 1).padStart(5, '0')}`;
    const payId = generateId('pay');
    const amount = invoice.amount_due;
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO payments (id, payment_number, invoice_id, customer_id, amount, payment_method, payment_date, reference_number, notes, recorded_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        payId,
        paymentNumber,
        invoice.id,
        invoice.customer_id,
        amount,
        paymentMethod.toUpperCase(),
        now,
        referenceNumber || `PORTAL/UPI/${Date.now().toString().slice(-6)}`,
        'Instant customer self-service settlement via Portal',
        req.user?.id || null,
        now,
        now
      );

      db.prepare("UPDATE invoices SET amount_paid = total_amount, amount_due = 0.0, status = 'PAID', updated_at = ? WHERE id = ?").run(now, invoice.id);
    });

    tx();

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'PAYMENT', 'INVOICE', invoice.id, `Settled invoice ${invoice.invoice_number} (₹${amount.toFixed(2)}) via Portal`, now);

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${amount.toLocaleString('en-IN')} confirmed! Invoice is now PAID.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Payment processing failed.' });
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { companyName, contactName, email, phone, street, city, country, paymentTerms } = req.body;
    if (!companyName || !email) {
      return res.status(400).json({ success: false, errors: ['Company name and email are required.'] });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, errors: ['A customer with this email already exists.'] });
    }

    const custId = generateId('cust');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (id, company_name, contact_name, email, phone, street, city, country, payment_terms, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(custId, companyName.trim(), (contactName && contactName.trim()) || companyName.trim(), cleanEmail, phone || null, street || null, city || null, country || 'India', paymentTerms || 'Net 15', now, now);

    return res.status(201).json({ success: true, message: 'Customer created successfully.', data: { id: custId } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create customer.' });
  }
}
