import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function previewDueBilling(req: AuthenticatedRequest, res: Response) {
  try {
    const targetDate = req.query.date ? new Date(String(req.query.date)).toISOString() : new Date().toISOString();

    const dueSubs = db.prepare(`
      SELECT s.id, s.subscription_number as subscriptionNumber, s.total_amount as totalAmount,
             c.company_name as companyName, p.billing_frequency as billingFrequency
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      JOIN plans p ON p.id = s.plan_id
      WHERE s.status = 'ACTIVE' AND s.next_billing_date <= ?
    `).all(targetDate) as any[];

    const totalExpected = dueSubs.reduce((acc, s) => acc + s.totalAmount, 0);

    return res.json({
      success: true,
      targetDate,
      dueCount: dueSubs.length,
      totalExpected,
      subscriptions: dueSubs
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to preview due subscriptions.' });
  }
}

export async function runBillingCycle(req: AuthenticatedRequest, res: Response) {
  try {
    const { targetDate: reqTargetDate, autoConfirm } = req.body;
    const targetDate = reqTargetDate ? new Date(reqTargetDate) : new Date();
    const targetDateIso = targetDate.toISOString();

    // 1. Find all active subscriptions due
    const dueSubs = db.prepare(`
      SELECT s.*, p.billing_frequency, p.auto_close_on_end, c.id as cust_id
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      JOIN customers c ON c.id = s.customer_id
      WHERE s.status = 'ACTIVE' AND s.next_billing_date <= ?
    `).all(targetDateIso) as any[];

    if (dueSubs.length === 0) {
      return res.json({
        success: true,
        message: 'No subscriptions are currently due for billing.',
        generatedCount: 0,
        skippedCount: 0,
        totalInvoiced: 0,
        invoices: []
      });
    }

    // 2. Active discounts
    const activeDiscounts = db.prepare(`
      SELECT * FROM discounts
      WHERE is_active = 1
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
    `).all(targetDateIso, targetDateIso) as any[];

    const generatedInvoices = [];
    let skippedCount = 0;
    let totalInvoiced = 0;

    const checkDuplicateInvoice = db.prepare(`
      SELECT id FROM invoices
      WHERE subscription_id = ? AND billing_period_start = ? AND billing_period_end = ?
    `);

    const insertInv = db.prepare(`
      INSERT INTO invoices (id, invoice_number, subscription_id, customer_id, billing_period_start, billing_period_end, issue_date, due_date, status, subtotal, discount_amount, tax_amount, total_amount, amount_paid, amount_due, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?)
    `);

    const insertInvLine = db.prepare(`
      INSERT INTO invoice_lines (id, invoice_id, product_id, variant_id, description, quantity, unit_price, tax_rate, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateSubBilling = db.prepare(`
      UPDATE subscriptions
      SET last_billed_date = ?, next_billing_date = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);

    const updateDiscountUsage = db.prepare(`
      UPDATE discounts SET usage_count = usage_count + 1 WHERE id = ?
    `);

    for (const sub of dueSubs) {
      const periodStart = sub.last_billed_date || sub.start_date;
      const periodEnd = sub.next_billing_date;

      // Duplicate prevention check
      const duplicate = checkDuplicateInvoice.get(sub.id, periodStart, periodEnd);
      if (duplicate) {
        skippedCount++;
        continue;
      }

      const subLines = db.prepare(`
        SELECT sl.*, pr.name as prod_name, pv.variant_name as var_name
        FROM subscription_lines sl
        JOIN products pr ON pr.id = sl.product_id
        LEFT JOIN product_variants pv ON pv.id = sl.variant_id
        WHERE sl.subscription_id = ?
      `).all(sub.id) as any[];

      let subtotal = 0;
      let lineDiscounts = 0;
      let totalQty = 0;
      const lineData: any[] = [];

      for (const line of subLines) {
        const qty = line.quantity;
        totalQty += qty;
        const lineTotal = qty * line.unit_price;
        subtotal += lineTotal;

        // Check product-specific discount
        let productDiscount = 0;
        const appProdDisc = activeDiscounts.find(
          d => d.scope === 'SPECIFIC_PRODUCT' &&
               d.target_product_id === line.product_id &&
               qty >= d.min_quantity &&
               lineTotal >= d.min_purchase &&
               (d.usage_limit === null || d.usage_count < d.usage_limit)
        );

        if (appProdDisc) {
          if (appProdDisc.discount_type === 'PERCENTAGE') {
            productDiscount = (lineTotal * appProdDisc.discount_value) / 100;
          } else {
            productDiscount = Math.min(lineTotal, appProdDisc.discount_value);
          }
          lineDiscounts += productDiscount;
          updateDiscountUsage.run(appProdDisc.id);
        }

        const variantSuffix = line.var_name ? ` (${line.var_name})` : '';
        const desc = `${line.prod_name}${variantSuffix} - ${sub.billing_frequency} Billing`;

        lineData.push({
          productId: line.product_id,
          variantId: line.variant_id,
          description: desc,
          quantity: qty,
          unitPrice: line.unit_price,
          taxRate: line.tax_rate,
          amount: lineTotal - productDiscount
        });
      }

      // Check whole-subscription discounts
      let subscriptionDiscount = 0;
      const appSubDisc = activeDiscounts.find(
        d => d.scope === 'SUBSCRIPTION' &&
             totalQty >= d.min_quantity &&
             subtotal >= d.min_purchase &&
             (d.usage_limit === null || d.usage_count < d.usage_limit)
      );

      if (appSubDisc) {
        if (appSubDisc.discount_type === 'PERCENTAGE') {
          subscriptionDiscount = (subtotal * appSubDisc.discount_value) / 100;
        } else {
          subscriptionDiscount = Math.min(subtotal, appSubDisc.discount_value);
        }
        updateDiscountUsage.run(appSubDisc.id);
      }

      const totalDiscount = lineDiscounts + subscriptionDiscount;
      const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

      let taxAmount = 0;
      for (const item of lineData) {
        taxAmount += (item.amount * item.taxRate) / 100;
      }

      const finalTotal = discountedSubtotal + taxAmount;
      totalInvoiced += finalTotal;

      const invCountRow = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number };
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${String(invCountRow.count + 1).padStart(5, '0')}`;
      const invId = generateId('inv');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      const status = autoConfirm ? 'CONFIRMED' : 'DRAFT';
      const now = new Date().toISOString();

      // Advance next billing date
      const nextDate = new Date(sub.next_billing_date);
      if (sub.billing_frequency === 'DAILY') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (sub.billing_frequency === 'WEEKLY') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (sub.billing_frequency === 'YEARLY') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      let nextSubStatus = sub.status;
      if (sub.auto_close_on_end && sub.expiry_date && nextDate >= new Date(sub.expiry_date)) {
        nextSubStatus = 'CLOSED';
      }

      const tx = db.transaction(() => {
        insertInv.run(
          invId,
          invoiceNumber,
          sub.id,
          sub.customer_id,
          periodStart,
          periodEnd,
          now,
          dueDate.toISOString(),
          status,
          subtotal,
          totalDiscount,
          taxAmount,
          finalTotal,
          finalTotal,
          `Auto-generated recurring invoice for period ${periodStart.split('T')[0]} to ${periodEnd.split('T')[0]}`,
          now,
          now
        );

        for (const ld of lineData) {
          insertInvLine.run(generateId('iline'), invId, ld.productId, ld.variantId, ld.description, ld.quantity, ld.unitPrice, ld.taxRate, ld.amount);
        }

        updateSubBilling.run(periodEnd, nextDate.toISOString(), nextSubStatus, now, sub.id);
      });

      tx();

      generatedInvoices.push({ id: invId, invoiceNumber, totalAmount: finalTotal });
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId('log'),
      req.user?.id || null,
      'BILLING_RUN',
      'INVOICE',
      'BATCH',
      `Ran billing cycle: ${generatedInvoices.length} invoices generated, ${skippedCount} skipped, ₹${totalInvoiced.toFixed(2)} invoiced.`,
      new Date().toISOString()
    );

    return res.json({
      success: true,
      message: `Billing completed successfully. ${generatedInvoices.length} invoices generated, ${skippedCount} duplicate/skipped periods avoided.`,
      generatedCount: generatedInvoices.length,
      skippedCount,
      totalInvoiced,
      invoices: generatedInvoices
    });
  } catch (error: any) {
    console.error('Run billing error:', error);
    return res.status(500).json({ success: false, error: 'Failed to run billing cycle.' });
  }
}
