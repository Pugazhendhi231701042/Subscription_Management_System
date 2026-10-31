import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listPayments(req: AuthenticatedRequest, res: Response) {
  try {
    let query = `
      SELECT p.id, p.payment_number as paymentNumber, p.amount, p.payment_method as paymentMethod,
             p.payment_date as paymentDate, p.reference_number as referenceNumber, p.notes,
             c.company_name as customerCompanyName,
             i.invoice_number as invoiceNumber
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN invoices i ON i.id = p.invoice_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
      query += ' AND p.customer_id = ?';
      params.push(req.user.customerId);
    }

    query += ' ORDER BY p.payment_date DESC';

    const payments = db.prepare(query).all(...params) as any[];

    const formatted = payments.map(p => ({
      ...p,
      customer: { companyName: p.customerCompanyName },
      invoice: { invoiceNumber: p.invoiceNumber }
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve payments.' });
  }
}

export async function recordPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { invoiceId, amount, paymentMethod, paymentDate, referenceNumber, notes } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!invoiceId || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, errors: ['Valid invoice ID and positive amount are required.'] });
    }

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found.' });

    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'Cannot record payment for cancelled invoice.' });
    }

    if (parsedAmount > invoice.amount_due + 0.01) {
      return res.status(400).json({ success: false, error: 'Payment exceeds outstanding due amount.' });
    }

    const payCountRow = db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number };
    const year = new Date().getFullYear();
    const paymentNumber = `PAY-${year}-${String(payCountRow.count + 1).padStart(5, '0')}`;
    const payId = generateId('pay');

    const newAmountPaid = invoice.amount_paid + parsedAmount;
    const newAmountDue = Math.max(0, invoice.total_amount - newAmountPaid);
    const newStatus = newAmountDue <= 0.01 ? 'PAID' : invoice.status;
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
        parsedAmount,
        (paymentMethod || 'UPI').toUpperCase(),
        paymentDate ? new Date(paymentDate).toISOString() : now,
        referenceNumber || null,
        notes || null,
        req.user?.id || null,
        now,
        now
      );

      db.prepare(`
        UPDATE invoices
        SET amount_paid = ?, amount_due = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(newAmountPaid, newAmountDue, newStatus, now, invoice.id);
    });

    tx();

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'PAYMENT', 'PAYMENT', payId, `Recorded payment of ₹${parsedAmount.toFixed(2)} for invoice ${invoice.invoice_number}`, now);

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${parsedAmount.toFixed(2)} recorded successfully. Invoice is now ${newStatus}.`,
      data: { id: payId, paymentNumber }
    });
  } catch (error: any) {
    console.error('Record payment error:', error);
    return res.status(500).json({ success: false, error: 'Failed to record payment.' });
  }
}
