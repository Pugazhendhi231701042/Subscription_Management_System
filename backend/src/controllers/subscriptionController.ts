import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listSubscriptions(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, status, planId, search } = req.query;

    const where: any = {};
    if (customerId) where.customerId = String(customerId);
    if (status) where.status = String(status);
    if (planId) where.planId = String(planId);

    // Customer isolation
    if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
      where.customerId = req.user.customerId;
    }

    if (search) {
      where.OR = [
        { subscriptionNumber: { contains: String(search) } },
        { customer: { companyName: { contains: String(search) } } },
        { customer: { contactName: { contains: String(search) } } }
      ];
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        customer: true,
        plan: { include: { product: true } },
        lines: { include: { product: true, variant: true } },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true, totalAmount: true, amountDue: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: subscriptions });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve subscriptions.' });
  }
}

export async function getSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: { include: { product: true } },
        lines: { include: { product: true, variant: true } },
        invoices: {
          include: { payments: true },
          orderBy: { issueDate: 'desc' }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found.' });
    }

    // Customer isolation check
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== subscription.customerId) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view your own subscriptions.' });
    }

    return res.json({ success: true, data: subscription });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve subscription.' });
  }
}

export async function createSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, planId, paymentTerms, lines, notes, autoCloseOnEnd, allowPause, allowEarlyClose, allowRenewal } = req.body;

    const errors: string[] = [];
    if (!customerId) errors.push('Customer is required.');
    if (!planId) errors.push('Plan is required.');
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      errors.push('At least one product line is required.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(400).json({ success: false, errors: ['Selected plan does not exist.'] });
    }

    const count = await prisma.subscription.count();
    const year = new Date().getFullYear();
    const subscriptionNumber = `SUB-${year}-${String(count + 1).padStart(4, '0')}`;

    const startDate = new Date();
    const nextBillingDate = new Date();
    const expiryDate = new Date();

    if (plan.billingFrequency === 'DAILY') {
      nextBillingDate.setDate(nextBillingDate.getDate() + 1);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (plan.billingFrequency === 'WEEKLY') {
      nextBillingDate.setDate(nextBillingDate.getDate() + 7);
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    } else if (plan.billingFrequency === 'YEARLY') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

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
        productId: l.productId,
        variantId: l.variantId || null,
        quantity: qty,
        unitPrice: price,
        taxRate,
        amount: lineSub
      };
    });

    const totalAmount = subtotal + taxAmount;

    const sub = await prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId,
          planId,
          status: 'DRAFT', // Starts as Draft according to lifecycle
          startDate,
          expiryDate,
          nextBillingDate,
          paymentTerms: paymentTerms || 'Net 15',
          autoCloseOnEnd: autoCloseOnEnd !== undefined ? Boolean(autoCloseOnEnd) : plan.autoCloseOnEnd,
          allowPause: allowPause !== undefined ? Boolean(allowPause) : plan.allowPause,
          allowEarlyClose: allowEarlyClose !== undefined ? Boolean(allowEarlyClose) : plan.allowEarlyClose,
          allowRenewal: allowRenewal !== undefined ? Boolean(allowRenewal) : plan.allowRenewal,
          subtotal,
          taxAmount,
          totalAmount,
          notes: notes || null
        }
      });

      for (const line of processedLines) {
        await tx.subscriptionLine.create({
          data: {
            subscriptionId: created.id,
            ...line
          }
        });
      }

      return await tx.subscription.findUnique({
        where: { id: created.id },
        include: {
          customer: true,
          plan: { include: { product: true } },
          lines: { include: { product: true, variant: true } }
        }
      });
    });

    return res.status(201).json({ success: true, message: `Subscription ${subscriptionNumber} created.`, data: sub });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create subscription.' });
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'CONFIRM', 'ACTIVATE', 'PAUSE', 'RESUME', 'CLOSE', 'RENEW'

    const sub = await prisma.subscription.findUnique({ where: { id } });
    if (!sub) {
      return res.status(404).json({ success: false, error: 'Subscription not found.' });
    }

    let newStatus = sub.status;
    const actionUpper = (action || '').toUpperCase();

    switch (actionUpper) {
      case 'CONFIRM':
        if (sub.status !== 'DRAFT' && sub.status !== 'QUOTATION') {
          return res.status(400).json({ success: false, error: `Cannot confirm subscription in ${sub.status} state.` });
        }
        newStatus = 'CONFIRMED';
        break;

      case 'ACTIVATE':
        if (sub.status === 'CLOSED') {
          return res.status(400).json({ success: false, error: 'Closed subscription cannot be activated directly. Use renew instead.' });
        }
        newStatus = 'ACTIVE';
        break;

      case 'PAUSE':
        if (!sub.allowPause) {
          return res.status(400).json({ success: false, error: 'This subscription plan does not permit pausing.' });
        }
        if (sub.status !== 'ACTIVE') {
          return res.status(400).json({ success: false, error: 'Only ACTIVE subscriptions can be paused.' });
        }
        newStatus = 'PAUSED';
        break;

      case 'RESUME':
        if (sub.status !== 'PAUSED') {
          return res.status(400).json({ success: false, error: 'Only PAUSED subscriptions can be resumed.' });
        }
        newStatus = 'ACTIVE';
        break;

      case 'CLOSE':
        const now = new Date();
        const isEarly = sub.expiryDate && sub.expiryDate > now;
        if (isEarly && !sub.allowEarlyClose) {
          return res.status(400).json({ success: false, error: 'This subscription plan does not allow early closure before expiry.' });
        }
        newStatus = 'CLOSED';
        break;

      case 'RENEW':
        if (!sub.allowRenewal) {
          return res.status(400).json({ success: false, error: 'This subscription plan does not allow renewals.' });
        }
        newStatus = 'ACTIVE';
        // Extend expiry date by 1 year or 1 month
        const extendedExpiry = new Date(sub.expiryDate || new Date());
        extendedExpiry.setFullYear(extendedExpiry.getFullYear() + 1);
        await prisma.subscription.update({
          where: { id },
          data: { expiryDate: extendedExpiry }
        });
        break;

      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}. Allowed: CONFIRM, ACTIVATE, PAUSE, RESUME, CLOSE, RENEW` });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: newStatus },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true, variant: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'STATUS_CHANGE',
        entityType: 'SUBSCRIPTION',
        entityId: sub.id,
        details: `Subscription ${sub.subscriptionNumber} status transitioned from ${sub.status} to ${newStatus} (Action: ${actionUpper})`
      }
    });

    return res.json({
      success: true,
      message: `Subscription ${sub.subscriptionNumber} is now ${newStatus}.`,
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update subscription status.' });
  }
}
