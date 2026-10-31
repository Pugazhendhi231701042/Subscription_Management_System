import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
  try {
    const startTime = Date.now();
    const now = new Date();

    // 1. Parallel high-speed indexed aggregate queries
    const [
      activeSubs,
      totalSubsCount,
      allPayments,
      allInvoices,
      overdueInvoices,
      subscriptionsByStatus,
      recentPayments
    ] = await Promise.all([
      // Active subscriptions for MRR / ARR calculation
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          totalAmount: true,
          plan: { select: { billingFrequency: true } }
        }
      }),

      // Total count
      prisma.subscription.count(),

      // Payments aggregate
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true }
      }),

      // Invoices aggregate for receivables
      prisma.invoice.aggregate({
        where: { status: { in: ['DRAFT', 'CONFIRMED', 'OVERDUE'] } },
        _sum: { amountDue: true, totalAmount: true }
      }),

      // Overdue invoices list
      prisma.invoice.findMany({
        where: {
          dueDate: { lt: now },
          status: { in: ['CONFIRMED', 'OVERDUE', 'DRAFT'] },
          amountDue: { gt: 0 }
        },
        include: {
          customer: { select: { id: true, companyName: true, contactName: true, email: true } },
          subscription: { select: { id: true, subscriptionNumber: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 20
      }),

      // Subscriptions by status
      prisma.subscription.groupBy({
        by: ['status'],
        _count: { id: true }
      }),

      // Recent payment events
      prisma.payment.findMany({
        take: 10,
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: { select: { companyName: true } },
          invoice: { select: { invoiceNumber: true } }
        }
      })
    ]);

    // Calculate MRR / ARR from active subscriptions
    let mrr = 0;
    for (const sub of activeSubs) {
      const amount = sub.totalAmount;
      const freq = sub.plan.billingFrequency;
      if (freq === 'MONTHLY') mrr += amount;
      else if (freq === 'YEARLY') mrr += amount / 12;
      else if (freq === 'WEEKLY') mrr += amount * 4.33;
      else if (freq === 'DAILY') mrr += amount * 30;
      else mrr += amount;
    }
    const arr = mrr * 12;

    const totalCollected = allPayments._sum.amount || 0;
    const totalOutstanding = allInvoices._sum.amountDue || 0;

    // Calculate overdue total and days overdue
    let overdueTotalAmount = 0;
    const processedOverdue = overdueInvoices.map(inv => {
      overdueTotalAmount += inv.amountDue;
      const diffTime = Math.abs(now.getTime() - inv.dueDate.getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        companyName: inv.customer.companyName,
        contactName: inv.customer.contactName,
        email: inv.customer.email,
        dueDate: inv.dueDate,
        daysOverdue,
        totalAmount: inv.totalAmount,
        amountDue: inv.amountDue,
        subscriptionNumber: inv.subscription?.subscriptionNumber
      };
    });

    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      QUOTATION: 0,
      CONFIRMED: 0,
      ACTIVE: 0,
      PAUSED: 0,
      CLOSED: 0
    };
    subscriptionsByStatus.forEach(group => {
      statusCounts[group.status] = group._count.id;
    });

    const queryDurationMs = Date.now() - startTime;

    return res.json({
      success: true,
      performance: {
        queryDurationMs,
        satisfiesTarget: queryDurationMs < 2000
      },
      kpi: {
        activeSubscriptionsCount: activeSubs.length,
        totalSubscriptionsCount: totalSubsCount,
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        totalRevenueCollected: totalCollected,
        totalOutstandingDue: totalOutstanding,
        overdueInvoicesCount: overdueInvoices.length,
        overdueTotalAmount
      },
      statusDistribution: statusCounts,
      overdueList: processedOverdue,
      recentPayments
    });
  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve dashboard analytics.' });
  }
}
