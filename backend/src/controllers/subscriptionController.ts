import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listSubscriptions(req: AuthenticatedRequest, res: Response) {
  try {
    let query = `
      SELECT s.id, s.subscription_number as subscriptionNumber, s.customer_id as customerId,
             s.plan_id as planId, s.status, s.start_date as startDate, s.expiry_date as expiryDate,
             s.next_billing_date as nextBillingDate, s.last_billed_date as lastBilledDate,
             s.payment_terms as paymentTerms, s.subtotal, s.tax_amount as taxAmount,
             s.total_amount as totalAmount, s.allow_pause as allowPause,
             s.allow_early_close as allowEarlyClose, s.allow_renewal as allowRenewal,
             c.company_name as customerCompanyName, c.contact_name as customerContactName, c.email as customerEmail,
             p.name as planName, p.billing_frequency as planFrequency
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN plans p ON p.id = s.plan_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
      query += ' AND s.customer_id = ?';
      params.push(req.user.customerId);
    }

    const { status, search } = req.query;
    if (status) {
      query += ' AND s.status = ?';
      params.push(String(status).toUpperCase());
    }

    if (search) {
      query += ' AND (s.subscription_number LIKE ? OR c.company_name LIKE ? OR c.contact_name LIKE ?)';
      const sTerm = `%${search}%`;
      params.push(sTerm, sTerm, sTerm);
    }

    query += ' ORDER BY s.created_at DESC';

    const subs = db.prepare(query).all(...params) as any[];

    for (const sub of subs) {
      sub.customer = {
        id: sub.customerId,
        companyName: sub.customerCompanyName,
        contactName: sub.customerContactName,
        email: sub.customerEmail
      };
      sub.plan = {
        id: sub.planId,
        name: sub.planName,
        billingFrequency: sub.planFrequency
      };
      sub.allowPause = Boolean(sub.allowPause);
      sub.allowEarlyClose = Boolean(sub.allowEarlyClose);
      sub.allowRenewal = Boolean(sub.allowRenewal);

      sub.lines = db.prepare(`
        SELECT sl.id, sl.product_id as productId, sl.variant_id as variantId,
               sl.quantity, sl.unit_price as unitPrice, sl.tax_rate as taxRate, sl.amount,
               pr.name as productName, pv.variant_name as variantName
        FROM subscription_lines sl
        JOIN products pr ON pr.id = sl.product_id
        LEFT JOIN product_variants pv ON pv.id = sl.variant_id
        WHERE sl.subscription_id = ?
      `).all(sub.id).map((l: any) => ({
        ...l,
        product: { id: l.productId, name: l.productName },
        variant: l.variantName ? { id: l.variantId, variantName: l.variantName } : null
      }));
    }

    return res.json({ success: true, data: subs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve subscriptions.' });
  }
}

export async function getSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const sub = db.prepare(`
      SELECT s.*, c.company_name as customerCompanyName, c.contact_name as customerContactName, c.email as customerEmail,
             p.name as planName, p.billing_frequency as planFrequency
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN plans p ON p.id = s.plan_id
      WHERE s.id = ?
    `).get(id) as any;

    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found.' });

    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== sub.customer_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    sub.customer = { companyName: sub.customerCompanyName, contactName: sub.customerContactName, email: sub.customerEmail };
    sub.plan = { name: sub.planName, billingFrequency: sub.planFrequency };
    sub.allowPause = Boolean(sub.allow_pause);
    sub.allowEarlyClose = Boolean(sub.allow_early_close);
    sub.allowRenewal = Boolean(sub.allow_renewal);

    sub.lines = db.prepare(`
      SELECT sl.*, pr.name as productName, pv.variant_name as variantName
      FROM subscription_lines sl
      JOIN products pr ON pr.id = sl.product_id
      LEFT JOIN product_variants pv ON pv.id = sl.variant_id
      WHERE sl.subscription_id = ?
    `).all(sub.id).map((l: any) => ({
      ...l,
      product: { name: l.productName },
      variant: l.variantName ? { variantName: l.variantName } : null
    }));

    return res.json({ success: true, data: sub });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve subscription.' });
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found.' });

    let newStatus = sub.status;
    const actionUpper = (action || '').toUpperCase();

    switch (actionUpper) {
      case 'CONFIRM':
        if (sub.status !== 'DRAFT' && sub.status !== 'QUOTATION') {
          return res.status(400).json({ success: false, error: `Cannot confirm in ${sub.status} state.` });
        }
        newStatus = 'CONFIRMED';
        break;

      case 'ACTIVATE':
        newStatus = 'ACTIVE';
        break;

      case 'PAUSE':
        if (!sub.allow_pause) {
          return res.status(400).json({ success: false, error: 'Plan does not permit pausing.' });
        }
        newStatus = 'PAUSED';
        break;

      case 'RESUME':
        newStatus = 'ACTIVE';
        break;

      case 'CLOSE':
        newStatus = 'CLOSED';
        break;

      case 'RENEW':
        if (!sub.allow_renewal) {
          return res.status(400).json({ success: false, error: 'Plan does not permit renewal.' });
        }
        newStatus = 'ACTIVE';
        const extendedExpiry = new Date(sub.expiry_date || new Date());
        extendedExpiry.setFullYear(extendedExpiry.getFullYear() + 1);
        db.prepare('UPDATE subscriptions SET expiry_date = ? WHERE id = ?').run(extendedExpiry.toISOString(), id);
        break;

      default:
        return res.status(400).json({ success: false, error: 'Unknown action.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, id);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'STATUS_CHANGE', 'SUBSCRIPTION', sub.id, `Transitioned ${sub.subscription_number} to ${newStatus}`, now);

    return res.json({
      success: true,
      message: `Subscription ${sub.subscription_number} is now ${newStatus}.`,
      data: { ...sub, status: newStatus }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update subscription status.' });
  }
}

export async function createSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, planId, paymentTerms, lines } = req.body;
    if (!customerId || !planId || !lines || lines.length === 0) {
      return res.status(400).json({ success: false, errors: ['Customer, plan, and product lines are required.'] });
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as any;
    if (!plan) return res.status(400).json({ success: false, errors: ['Plan does not exist.'] });

    const countRow = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number };
    const year = new Date().getFullYear();
    const subscriptionNumber = `SUB-${year}-${String(countRow.count + 1).padStart(4, '0')}`;
    const subId = generateId('sub');

    const startDate = new Date();
    const nextBillingDate = new Date();
    const expiryDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    let subtotal = 0;
    let taxAmount = 0;
    for (const l of lines) {
      const qty = parseInt(l.quantity) || 1;
      const price = parseFloat(l.unitPrice) || 0.0;
      const taxRate = parseFloat(l.taxRate) || 18.0;
      const amt = qty * price;
      subtotal += amt;
      taxAmount += (amt * taxRate) / 100;
    }
    const totalAmount = subtotal + taxAmount;
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO subscriptions (id, subscription_number, customer_id, plan_id, status, start_date, expiry_date, next_billing_date, payment_terms, auto_close_on_end, allow_pause, allow_early_close, allow_renewal, subtotal, tax_amount, total_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subId,
        subscriptionNumber,
        customerId,
        planId,
        startDate.toISOString(),
        expiryDate.toISOString(),
        nextBillingDate.toISOString(),
        paymentTerms || 'Net 15',
        plan.auto_close_on_end,
        plan.allow_pause,
        plan.allow_early_close,
        plan.allow_renewal,
        subtotal,
        taxAmount,
        totalAmount,
        now,
        now
      );

      for (const l of lines) {
        db.prepare(`
          INSERT INTO subscription_lines (id, subscription_id, product_id, variant_id, quantity, unit_price, tax_rate, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(generateId('sline'), subId, l.productId, l.variantId || null, l.quantity, l.unitPrice, l.taxRate || 18, (l.quantity * l.unitPrice));
      }
    });

    tx();

    return res.status(201).json({ success: true, message: `Subscription ${subscriptionNumber} created.`, data: { id: subId, subscriptionNumber } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create subscription.' });
  }
}
