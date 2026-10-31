import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function previewDueBilling(req: AuthenticatedRequest, res: Response) {
  try {
    const targetDate = req.query.date ? new Date(String(req.query.date)) : new Date();

    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lte: targetDate }
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        lines: { include: { product: true, variant: true } }
      }
    });

    const totalExpected = dueSubscriptions.reduce((acc, sub) => acc + sub.totalAmount, 0);

    return res.json({
      success: true,
      targetDate,
      dueCount: dueSubscriptions.length,
      totalExpected,
      subscriptions: dueSubscriptions
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to preview due subscriptions.' });
  }
}

export async function runBillingCycle(req: AuthenticatedRequest, res: Response) {
  try {
    const { targetDate: reqTargetDate, autoConfirm } = req.body;
    const targetDate = reqTargetDate ? new Date(reqTargetDate) : new Date();

    // 1. Find all ACTIVE subscriptions due for billing
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lte: targetDate }
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        lines: { include: { product: true, variant: true } }
      }
    });

    if (dueSubscriptions.length === 0) {
      return res.json({
        success: true,
        message: 'No subscriptions are currently due for billing.',
        generatedCount: 0,
        skippedCount: 0,
        totalInvoiced: 0,
        invoices: []
      });
    }

    // 2. Fetch active discounts to auto-apply
    const activeDiscounts = await prisma.discount.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: targetDate } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: targetDate } }
            ]
          }
        ]
      }
    });

    const generatedInvoices = [];
    let skippedCount = 0;
    let totalInvoiced = 0;

    for (const sub of dueSubscriptions) {
      const periodStart = sub.lastBilledDate || sub.startDate;
      const periodEnd = sub.nextBillingDate;

      // Duplicate Billing Prevention check
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          subscriptionId: sub.id,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd
        }
      });

      if (existingInvoice) {
        skippedCount++;
        continue;
      }

      // Calculate line items
      let subtotal = 0;
      let lineDiscounts = 0;
      let totalQty = 0;

      const invoiceLinesData = [];

      for (const line of sub.lines) {
        const qty = line.quantity;
        totalQty += qty;
        const unitPrice = line.unitPrice;
        const lineTotal = qty * unitPrice;
        subtotal += lineTotal;

        // Check product-specific discount
        let productDiscount = 0;
        const applicableProductDiscount = activeDiscounts.find(
          d => d.scope === 'SPECIFIC_PRODUCT' &&
               d.targetProductId === line.productId &&
               qty >= d.minQuantity &&
               lineTotal >= d.minPurchase &&
               (d.usageLimit === null || d.usageCount < d.usageLimit)
        );

        if (applicableProductDiscount) {
          if (applicableProductDiscount.discountType === 'PERCENTAGE') {
            productDiscount = (lineTotal * applicableProductDiscount.discountValue) / 100;
          } else {
            productDiscount = Math.min(lineTotal, applicableProductDiscount.discountValue);
          }
          lineDiscounts += productDiscount;

          // Increment usage count
          await prisma.discount.update({
            where: { id: applicableProductDiscount.id },
            data: { usageCount: { increment: 1 } }
          });
        }

        const variantName = line.variant ? ` (${line.variant.variantName})` : '';
        const description = `${line.product.name}${variantName} - ${sub.plan.billingFrequency} Billing`;

        invoiceLinesData.push({
          productId: line.productId,
          variantId: line.variantId,
          description,
          quantity: qty,
          unitPrice,
          taxRate: line.taxRate,
          amount: lineTotal - productDiscount
        });
      }

      // Check whole-subscription discounts
      let subscriptionDiscount = 0;
      const applicableSubDiscount = activeDiscounts.find(
        d => d.scope === 'SUBSCRIPTION' &&
             totalQty >= d.minQuantity &&
             subtotal >= d.minPurchase &&
             (d.usageLimit === null || d.usageCount < d.usageLimit)
      );

      if (applicableSubDiscount) {
        if (applicableSubDiscount.discountType === 'PERCENTAGE') {
          subscriptionDiscount = (subtotal * applicableSubDiscount.discountValue) / 100;
        } else {
          subscriptionDiscount = Math.min(subtotal, applicableSubDiscount.discountValue);
        }

        await prisma.discount.update({
          where: { id: applicableSubDiscount.id },
          data: { usageCount: { increment: 1 } }
        });
      }

      const totalDiscount = lineDiscounts + subscriptionDiscount;
      const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

      // Calculate Taxes
      let taxAmount = 0;
      for (const item of invoiceLinesData) {
        taxAmount += (item.amount * item.taxRate) / 100;
      }

      const finalTotal = discountedSubtotal + taxAmount;
      totalInvoiced += finalTotal;

      // Unique Invoice Number
      const invoiceCount = await prisma.invoice.count();
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(5, '0')}`;

      // Due date based on payment terms (Net 15 by default)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const status = autoConfirm ? 'CONFIRMED' : 'DRAFT';

      // Advance next billing date based on frequency
      const nextDate = new Date(sub.nextBillingDate);
      if (sub.plan.billingFrequency === 'DAILY') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (sub.plan.billingFrequency === 'WEEKLY') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (sub.plan.billingFrequency === 'YEARLY') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // Check autoCloseOnEnd if expiry date passed
      let nextSubStatus = sub.status;
      if (sub.autoCloseOnEnd && sub.expiryDate && nextDate >= sub.expiryDate) {
        nextSubStatus = 'CLOSED';
      }

      // Create invoice and update subscription in transaction
      const invoice = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            subscriptionId: sub.id,
            customerId: sub.customerId,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            issueDate: new Date(),
            dueDate,
            status,
            subtotal,
            discountAmount: totalDiscount,
            taxAmount,
            totalAmount: finalTotal,
            amountPaid: 0.0,
            amountDue: finalTotal,
            notes: `Auto-generated recurring invoice for period ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`
          }
        });

        for (const lineData of invoiceLinesData) {
          await tx.invoiceLine.create({
            data: {
              invoiceId: inv.id,
              ...lineData
            }
          });
        }

        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            lastBilledDate: periodEnd,
            nextBillingDate: nextDate,
            status: nextSubStatus
          }
        });

        return inv;
      });

      generatedInvoices.push(invoice);
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'BILLING_RUN',
        entityType: 'INVOICE',
        entityId: 'BATCH',
        details: `Ran billing cycle: ${generatedInvoices.length} invoices generated, ${skippedCount} skipped, ₹${totalInvoiced.toFixed(2)} invoiced.`
      }
    });

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
