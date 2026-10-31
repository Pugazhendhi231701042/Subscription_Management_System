import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listPayments(req: AuthenticatedRequest, res: Response) {
  try {
    const { invoiceId, customerId, method } = req.query;

    const where: any = {};
    if (invoiceId) where.invoiceId = String(invoiceId);
    if (customerId) where.customerId = String(customerId);
    if (method) where.paymentMethod = String(method).toUpperCase();

    // Customer isolation
    if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
      where.customerId = req.user.customerId;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: true,
        invoice: {
          select: { id: true, invoiceNumber: true, totalAmount: true, status: true }
        },
        recordedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    return res.json({ success: true, data: payments });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve payments.' });
  }
}

export async function recordPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { invoiceId, amount, paymentMethod, paymentDate, referenceNumber, notes } = req.body;

    const errors: string[] = [];
    if (!invoiceId) errors.push('Invoice reference is required.');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.push('Payment amount must be greater than zero.');
    }

    const validMethods = ['CREDIT_CARD', 'BANK_TRANSFER', 'UPI', 'CASH', 'OTHER'];
    const method = (paymentMethod || 'UPI').toUpperCase();
    if (!validMethods.includes(method)) {
      errors.push(`Invalid payment method. Allowed: ${validMethods.join(', ')}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'Cannot record payment for a cancelled invoice.' });
    }

    if (parsedAmount > invoice.amountDue + 0.01) {
      return res.status(400).json({
        success: false,
        error: `Payment amount (₹${parsedAmount.toFixed(2)}) cannot exceed outstanding due amount (₹${invoice.amountDue.toFixed(2)}).`
      });
    }

    // Generate unique payment number PAY-YYYY-XXXX
    const payCount = await prisma.payment.count();
    const year = new Date().getFullYear();
    const paymentNumber = `PAY-${year}-${String(payCount + 1).padStart(5, '0')}`;

    const newAmountPaid = invoice.amountPaid + parsedAmount;
    const newAmountDue = Math.max(0, invoice.totalAmount - newAmountPaid);
    const newStatus = newAmountDue <= 0.01 ? 'PAID' : invoice.status;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: parsedAmount,
          paymentMethod: method,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          recordedByUserId: req.user?.id || null
        }
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus
        },
        include: {
          customer: true,
          payments: true
        }
      });

      return { payment, updatedInvoice };
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'PAYMENT',
        entityType: 'PAYMENT',
        entityId: result.payment.id,
        details: `Recorded ${method} payment of ₹${parsedAmount.toFixed(2)} for invoice ${invoice.invoiceNumber}. New status: ${newStatus}`
      }
    });

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${parsedAmount.toFixed(2)} recorded successfully. Invoice ${invoice.invoiceNumber} status is now ${newStatus}.`,
      data: result.payment,
      invoice: result.updatedInvoice
    });
  } catch (error: any) {
    console.error('Record payment error:', error);
    return res.status(500).json({ success: false, error: 'Failed to record payment.' });
  }
}
