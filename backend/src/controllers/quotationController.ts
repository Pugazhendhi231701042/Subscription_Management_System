import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const templates = db.prepare(`
      SELECT t.id, t.name, t.plan_id as planId, t.validity_days as validityDays,
             p.name as planName, p.billing_frequency as planFrequency
      FROM quotation_templates t
      JOIN plans p ON p.id = t.plan_id
      ORDER BY t.created_at DESC
    `).all() as any[];

    for (const t of templates) {
      t.templateLines = db.prepare(`
        SELECT id, template_id as templateId, product_id as productId, variant_id as variantId, quantity, unit_price as unitPrice
        FROM quotation_template_lines
        WHERE template_id = ?
      `).all(t.id);
    }

    return res.json({ success: true, data: templates });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve quotation templates.' });
  }
}

export async function createTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, planId, validityDays, lines } = req.body;

    if (!name || name.trim().length === 0) return res.status(400).json({ success: false, errors: ['Template name is required.'] });
    if (!planId) return res.status(400).json({ success: false, errors: ['Plan is required for template.'] });

    const tmplId = generateId('tmpl');
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO quotation_templates (id, name, plan_id, validity_days, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(tmplId, name.trim(), planId, parseInt(validityDays) || 30, now, now);

      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          db.prepare(`
            INSERT INTO quotation_template_lines (id, template_id, product_id, variant_id, quantity, unit_price)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(generateId('tline'), tmplId, line.productId, line.variantId || null, parseInt(line.quantity) || 1, parseFloat(line.unitPrice) || 0.0);
        }
      }
    });

    tx();

    return res.status(201).json({ success: true, message: 'Template created successfully.', data: { id: tmplId } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create quotation template.' });
  }
}

export async function listQuotations(req: AuthenticatedRequest, res: Response) {
  try {
    let query = `
      SELECT q.id, q.quotation_number as quotationNumber, q.customer_id as customerId,
             q.plan_id as planId, q.template_id as templateId, q.validity_date as validityDate,
             q.payment_terms as paymentTerms, q.status, q.subtotal, q.discount_amount as discountAmount,
             q.tax_amount as taxAmount, q.total_amount as totalAmount, q.notes, q.created_at as createdAt,
             c.company_name as customerCompanyName, c.contact_name as customerContactName, c.email as customerEmail,
             p.name as planName,
             s.id as subscriptionId, s.subscription_number as subscriptionNumber
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      JOIN plans p ON p.id = q.plan_id
      LEFT JOIN subscriptions s ON s.quotation_id = q.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role check: customer isolation
    if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
      query += ' AND q.customer_id = ?';
      params.push(req.user.customerId);
    }

    query += ' ORDER BY q.created_at DESC';

    const quotes = db.prepare(query).all(...params) as any[];

    for (const q of quotes) {
      q.customer = {
        id: q.customerId,
        companyName: q.customerCompanyName,
        contactName: q.customerContactName,
        email: q.customerEmail
      };
      q.plan = { id: q.planId, name: q.planName };
      q.subscription = q.subscriptionId ? { id: q.subscriptionId, subscriptionNumber: q.subscriptionNumber } : null;

      q.lines = db.prepare(`
        SELECT ql.id, ql.product_id as productId, ql.variant_id as variantId,
               ql.quantity, ql.unit_price as unitPrice, ql.tax_rate as taxRate, ql.amount,
               pr.name as productName, pv.variant_name as variantName
        FROM quotation_lines ql
        JOIN products pr ON pr.id = ql.product_id
        LEFT JOIN product_variants pv ON pv.id = ql.variant_id
        WHERE ql.quotation_id = ?
      `).all(q.id).map((l: any) => ({
        ...l,
        product: { id: l.productId, name: l.productName },
        variant: l.variantName ? { id: l.variantId, variantName: l.variantName } : null
      }));
    }

    return res.json({ success: true, data: quotes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve quotations.' });
  }
}

export async function getQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const q = db.prepare(`
      SELECT q.*, c.company_name as customerCompanyName, c.contact_name as customerContactName, c.email as customerEmail,
             p.name as planName
      FROM quotations q
      JOIN customers c ON c.id = q.customer_id
      JOIN plans p ON p.id = q.plan_id
      WHERE q.id = ?
    `).get(id) as any;

    if (!q) return res.status(404).json({ success: false, error: 'Quotation not found.' });

    // Isolation
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== q.customer_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    q.customer = { companyName: q.customerCompanyName, contactName: q.customerContactName, email: q.customerEmail };
    q.plan = { name: q.planName };
    q.lines = db.prepare(`
      SELECT ql.*, pr.name as productName, pv.variant_name as variantName
      FROM quotation_lines ql
      JOIN products pr ON pr.id = ql.product_id
      LEFT JOIN product_variants pv ON pv.id = ql.variant_id
      WHERE ql.quotation_id = ?
    `).all(q.id).map((l: any) => ({
      ...l,
      product: { name: l.productName },
      variant: l.variantName ? { variantName: l.variantName } : null
    }));

    return res.json({ success: true, data: q });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve quotation.' });
  }
}

export async function createQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, planId, templateId, validityDays, paymentTerms, lines, notes } = req.body;

    if (!customerId || !planId || !lines || lines.length === 0) {
      return res.status(400).json({ success: false, errors: ['Customer, plan, and product lines are required.'] });
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM quotations').get() as { count: number };
    const year = new Date().getFullYear();
    const quotationNumber = `QT-${year}-${String(countRow.count + 1).padStart(4, '0')}`;
    const quoteId = generateId('qt');
    const now = new Date().toISOString();

    const days = parseInt(validityDays) || 30;
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + days);

    let subtotal = 0;
    let taxAmount = 0;

    const processedLines = lines.map((l: any) => {
      const qty = parseInt(l.quantity) || 1;
      const price = parseFloat(l.unitPrice) || 0.0;
      const taxRate = parseFloat(l.taxRate) || 18.0;
      const lineSub = qty * price;
      const lineTax = (lineSub * taxRate) / 100;
      subtotal += lineSub;
      taxAmount += lineTax;

      return {
        id: generateId('qline'),
        quotationId: quoteId,
        productId: l.productId,
        variantId: l.variantId || null,
        quantity: qty,
        unitPrice: price,
        taxRate,
        amount: lineSub
      };
    });

    const totalAmount = subtotal + taxAmount;

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO quotations (id, quotation_number, customer_id, plan_id, template_id, validity_date, payment_terms, status, subtotal, tax_amount, total_amount, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'QUOTATION', ?, ?, ?, ?, ?, ?)
      `).run(
        quoteId,
        quotationNumber,
        customerId,
        planId,
        templateId || null,
        validityDate.toISOString(),
        paymentTerms || 'Net 15',
        subtotal,
        taxAmount,
        totalAmount,
        notes || null,
        now,
        now
      );

      const insertLine = db.prepare(`
        INSERT INTO quotation_lines (id, quotation_id, product_id, variant_id, quantity, unit_price, tax_rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of processedLines) {
        insertLine.run(line.id, quoteId, line.productId, line.variantId, line.quantity, line.unitPrice, line.taxRate, line.amount);
      }
    });

    tx();

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'CREATE', 'QUOTATION', quoteId, `Created quotation ${quotationNumber} for amount ₹${totalAmount}`, now);

    return res.status(201).json({
      success: true,
      message: `Quotation ${quotationNumber} generated successfully.`,
      data: { id: quoteId, quotationNumber }
    });
  } catch (error: any) {
    console.error('Create quotation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create quotation.' });
  }
}

export async function convertToSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const quote = db.prepare(`
      SELECT q.*, p.billing_frequency, p.auto_close_on_end, p.allow_pause, p.allow_early_close, p.allow_renewal
      FROM quotations q
      JOIN plans p ON p.id = q.plan_id
      WHERE q.id = ?
    `).get(id) as any;

    if (!quote) return res.status(404).json({ success: false, error: 'Quotation not found.' });

    const existingSub = db.prepare('SELECT subscription_number FROM subscriptions WHERE quotation_id = ?').get(quote.id) as any;
    if (existingSub) {
      return res.status(400).json({
        success: false,
        error: `Quotation already converted to subscription ${existingSub.subscription_number}.`
      });
    }

    const subCount = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number };
    const year = new Date().getFullYear();
    const subscriptionNumber = `SUB-${year}-${String(subCount.count + 1).padStart(4, '0')}`;
    const subId = generateId('sub');

    const startDate = new Date();
    const nextBillingDate = new Date();
    const expiryDate = new Date();

    if (quote.billing_frequency === 'DAILY') {
      nextBillingDate.setDate(nextBillingDate.getDate() + 1);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (quote.billing_frequency === 'WEEKLY') {
      nextBillingDate.setDate(nextBillingDate.getDate() + 7);
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    } else if (quote.billing_frequency === 'YEARLY') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const now = new Date().toISOString();
    const lines = db.prepare('SELECT * FROM quotation_lines WHERE quotation_id = ?').all(quote.id) as any[];

    const tx = db.transaction(() => {
      db.prepare("UPDATE quotations SET status = 'CONFIRMED' WHERE id = ?").run(quote.id);

      db.prepare(`
        INSERT INTO subscriptions (id, subscription_number, customer_id, plan_id, quotation_id, status, start_date, expiry_date, next_billing_date, payment_terms, auto_close_on_end, allow_pause, allow_early_close, allow_renewal, subtotal, tax_amount, total_amount, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subId,
        subscriptionNumber,
        quote.customer_id,
        quote.plan_id,
        quote.id,
        startDate.toISOString(),
        expiryDate.toISOString(),
        nextBillingDate.toISOString(),
        quote.payment_terms,
        quote.auto_close_on_end,
        quote.allow_pause,
        quote.allow_early_close,
        quote.allow_renewal,
        quote.subtotal,
        quote.tax_amount,
        quote.total_amount,
        quote.notes,
        now,
        now
      );

      const insertSubLine = db.prepare(`
        INSERT INTO subscription_lines (id, subscription_id, product_id, variant_id, quantity, unit_price, tax_rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of lines) {
        insertSubLine.run(generateId('sline'), subId, line.product_id, line.variant_id, line.quantity, line.unit_price, line.tax_rate, line.amount);
      }
    });

    tx();

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'CREATE', 'SUBSCRIPTION', subId, `Converted quotation ${quote.quotation_number} into Active subscription ${subscriptionNumber}`, now);

    return res.status(201).json({
      success: true,
      message: `Quotation converted successfully! Subscription ${subscriptionNumber} is now ACTIVE.`,
      data: { id: subId, subscriptionNumber }
    });
  } catch (error: any) {
    console.error('Convert quote error:', error);
    return res.status(500).json({ success: false, error: 'Failed to convert quotation to subscription.' });
  }
}
