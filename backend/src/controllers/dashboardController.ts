import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    const startTime = Date.now();
    const nowIso = new Date().toISOString();

    // 1. Active subscriptions for MRR / ARR calculation
    const activeSubs = db.prepare(`
      SELECT s.total_amount, p.billing_frequency
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.status = 'ACTIVE'
    `).all() as any[];

    let mrr = 0;
    for (const sub of activeSubs) {
      const amount = sub.total_amount;
      const freq = sub.billing_frequency;
      if (freq === 'MONTHLY') mrr += amount;
      else if (freq === 'YEARLY') mrr += amount / 12;
      else if (freq === 'WEEKLY') mrr += amount * 4.33;
      else if (freq === 'DAILY') mrr += amount * 30;
      else mrr += amount;
    }
    const arr = mrr * 12;

    // 2. Counts and totals
    const totalSubsRow = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number };
    const paymentsRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments').get() as { total: number };
    const outstandingRow = db.prepare("SELECT COALESCE(SUM(amount_due), 0) as total FROM invoices WHERE status IN ('DRAFT', 'CONFIRMED', 'OVERDUE')").get() as { total: number };

    // 3. Overdue Invoices
    const overdueInvoices = db.prepare(`
      SELECT i.id, i.invoice_number as invoiceNumber, i.due_date as dueDate,
             i.total_amount as totalAmount, i.amount_due as amountDue,
             c.company_name as companyName, c.contact_name as contactName, c.email,
             s.subscription_number as subscriptionNumber
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN subscriptions s ON s.id = i.subscription_id
      WHERE i.due_date < ? AND i.status IN ('CONFIRMED', 'OVERDUE', 'DRAFT') AND i.amount_due > 0
      ORDER BY i.due_date ASC
      LIMIT 20
    `).all(nowIso) as any[];

    const now = new Date();
    let overdueTotalAmount = 0;
    const processedOverdue = overdueInvoices.map(inv => {
      overdueTotalAmount += inv.amountDue;
      const diffTime = Math.abs(now.getTime() - new Date(inv.dueDate).getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...inv,
        daysOverdue
      };
    });

    // 4. Status distribution
    const statusGroups = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM subscriptions
      GROUP BY status
    `).all() as any[];

    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      QUOTATION: 0,
      CONFIRMED: 0,
      ACTIVE: 0,
      PAUSED: 0,
      CLOSED: 0
    };
    for (const g of statusGroups) {
      statusCounts[g.status] = g.count;
    }

    const duration = Date.now() - startTime;

    return res.json({
      success: true,
      performance: {
        queryDurationMs: duration,
        satisfiesTarget: duration < 2000
      },
      kpi: {
        activeSubscriptionsCount: activeSubs.length,
        totalSubscriptionsCount: totalSubsRow.count,
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        totalRevenueCollected: paymentsRow.total,
        totalOutstandingDue: outstandingRow.total,
        overdueInvoicesCount: overdueInvoices.length,
        overdueTotalAmount
      },
      statusDistribution: statusCounts,
      overdueList: processedOverdue
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve dashboard metrics.' });
  }
}
