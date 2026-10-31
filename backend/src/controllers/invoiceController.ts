import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, customerId, overdue, search } = req.query;

    let query = `
      SELECT i.id, i.invoice_number as invoiceNumber, i.subscription_id as subscriptionId,
             i.customer_id as customerId, i.billing_period_start as billingPeriodStart,
             i.billing_period_end as billingPeriodEnd, i.issue_date as issueDate,
             i.due_date as dueDate, i.status, i.subtotal, i.discount_amount as discountAmount,
             i.tax_amount as taxAmount, i.total_amount as totalAmount, i.amount_paid as amountPaid,
             i.amount_due as amountDue, i.sent_at as sentAt, i.cancelled_at as cancelledAt,
             c.company_name as customerCompanyName, c.contact_name as customerContactName, c.email as customerEmail,
             s.subscription_number as subscriptionNumber
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN subscriptions s ON s.id = i.subscription_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
      query += ' AND i.customer_id = ?';
      params.push(req.user.customerId);
    }

    if (customerId) {
      query += ' AND i.customer_id = ?';
      params.push(String(customerId));
    }

    if (status) {
      query += ' AND i.status = ?';
      params.push(String(status).toUpperCase());
    }

    if (overdue === 'true') {
      query += ' AND i.due_date < ? AND i.amount_due > 0';
      params.push(new Date().toISOString());
    }

    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR c.company_name LIKE ? OR c.contact_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY i.issue_date DESC';

    const invoices = db.prepare(query).all(...params) as any[];

    const now = new Date();
    const formatted = invoices.map(inv => {
      let st = inv.status;
      if (inv.status === 'CONFIRMED' && new Date(inv.dueDate) < now && inv.amountDue > 0) {
        st = 'OVERDUE';
      }
      return {
        ...inv,
        status: st,
        customer: {
          id: inv.customerId,
          companyName: inv.customerCompanyName,
          contactName: inv.customerContactName,
          email: inv.customerEmail
        },
        subscription: inv.subscriptionNumber ? { subscriptionNumber: inv.subscriptionNumber } : null
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve invoices.' });
  }
}

export async function getInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const inv = db.prepare(`
      SELECT i.*, c.company_name as customerCompanyName, c.contact_name as customerContactName, c.email as customerEmail, c.tax_number as customerTaxNumber,
             s.subscription_number as subscriptionNumber
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN subscriptions s ON s.id = i.subscription_id
      WHERE i.id = ?
    `).get(id) as any;

    if (!inv) return res.status(404).json({ success: false, error: 'Invoice not found.' });

    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== inv.customer_id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const lines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(inv.id);
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(inv.id);

    return res.json({
      success: true,
      data: {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        subscriptionId: inv.subscription_id,
        customerId: inv.customer_id,
        billingPeriodStart: inv.billing_period_start,
        billingPeriodEnd: inv.billing_period_end,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        status: inv.status,
        subtotal: inv.subtotal,
        discountAmount: inv.discount_amount,
        taxAmount: inv.tax_amount,
        totalAmount: inv.total_amount,
        amountPaid: inv.amount_paid,
        amountDue: inv.amount_due,
        notes: inv.notes,
        customer: {
          companyName: inv.customerCompanyName,
          contactName: inv.customerContactName,
          email: inv.customerEmail,
          taxNumber: inv.customerTaxNumber
        },
        lines: lines.map((l: any) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unit_price,
          taxRate: l.tax_rate,
          amount: l.amount
        })),
        payments: payments.map((p: any) => ({
          id: p.id,
          paymentNumber: p.payment_number,
          amount: p.amount,
          paymentMethod: p.payment_method,
          paymentDate: p.payment_date,
          referenceNumber: p.reference_number
        }))
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve invoice.' });
  }
}

export async function confirmInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!inv) return res.status(404).json({ success: false, error: 'Invoice not found.' });

    const now = new Date().toISOString();
    db.prepare("UPDATE invoices SET status = 'CONFIRMED', updated_at = ? WHERE id = ?").run(now, id);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'UPDATE', 'INVOICE', id, `Confirmed invoice ${inv.invoice_number}`, now);

    return res.json({ success: true, message: `Invoice ${inv.invoice_number} confirmed.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to confirm invoice.' });
  }
}

export async function cancelInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!inv) return res.status(404).json({ success: false, error: 'Invoice not found.' });

    if (inv.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Paid invoices cannot be cancelled directly.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE invoices SET status = 'CANCELLED', cancelled_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'UPDATE', 'INVOICE', id, `Cancelled invoice ${inv.invoice_number}`, now);

    return res.json({ success: true, message: `Invoice ${inv.invoice_number} cancelled.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to cancel invoice.' });
  }
}

export async function sendInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const inv = db.prepare(`
      SELECT i.*, c.email as customerEmail
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE i.id = ?
    `).get(id) as any;

    if (!inv) return res.status(404).json({ success: false, error: 'Invoice not found.' });

    const now = new Date().toISOString();
    db.prepare('UPDATE invoices SET sent_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'UPDATE', 'INVOICE', id, `Sent invoice ${inv.invoice_number} to ${inv.customerEmail}`, now);

    return res.json({ success: true, message: `Invoice ${inv.invoice_number} sent to ${inv.customerEmail}.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to send invoice.' });
  }
}
