import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const { search } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: String(search) } },
        { contactName: { contains: String(search) } },
        { email: { contains: String(search) } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            subscriptions: true,
            invoices: true,
            payments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: customers });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve customers.' });
  }
}

export async function getCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    // Customer isolation check
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view your own account details.' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            plan: { include: { product: true } },
            lines: { include: { product: true, variant: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        invoices: {
          include: { payments: true },
          orderBy: { issueDate: 'desc' }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        },
        quotations: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    return res.json({ success: true, data: customer });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve customer.' });
  }
}

export async function getPortalData(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.customerId) {
      return res.status(400).json({ success: false, error: 'User is not linked to a customer account.' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: req.user.customerId },
      include: {
        subscriptions: {
          include: {
            plan: { include: { product: true } },
            lines: { include: { product: true, variant: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        invoices: {
          include: { payments: true },
          orderBy: { issueDate: 'desc' }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer profile not found.' });
    }

    const activeSubscriptions = customer.subscriptions.filter(s => s.status === 'ACTIVE');
    const totalOutstanding = customer.invoices
      .filter(i => ['CONFIRMED', 'OVERDUE'].includes(i.status))
      .reduce((sum, i) => sum + i.amountDue, 0);

    return res.json({
      success: true,
      profile: {
        id: customer.id,
        companyName: customer.companyName,
        contactName: customer.contactName,
        email: customer.email,
        phone: customer.phone,
        street: customer.street,
        city: customer.city,
        country: customer.country,
        paymentTerms: customer.paymentTerms
      },
      summary: {
        activeSubscriptionsCount: activeSubscriptions.length,
        totalOutstanding
      },
      subscriptions: customer.subscriptions,
      invoices: customer.invoices,
      payments: customer.payments
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to load customer portal data.' });
  }
}

export async function updatePortalProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.customerId) {
      return res.status(400).json({ success: false, error: 'Customer profile not identified.' });
    }

    const { contactName, phone, street, city, country } = req.body;

    const updated = await prisma.customer.update({
      where: { id: req.user.customerId },
      data: {
        contactName: contactName ? contactName.trim() : undefined,
        phone: phone || null,
        street: street || null,
        city: city || null,
        country: country || 'India'
      }
    });

    return res.json({
      success: true,
      message: 'Your company profile was successfully updated.',
      profile: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
}

export async function portalPayInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // invoice id
    const { paymentMethod = 'UPI', referenceNumber } = req.body;

    if (!req.user?.customerId) {
      return res.status(403).json({ success: false, error: 'Only customers can make portal payments.' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    if (invoice.customerId !== req.user.customerId) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only pay your own invoices.' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'This invoice has already been fully paid.' });
    }

    const payCount = await prisma.payment.count();
    const year = new Date().getFullYear();
    const paymentNumber = `PAY-${year}-${String(payCount + 1).padStart(5, '0')}`;
    const amount = invoice.amountDue;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount,
          paymentMethod: paymentMethod.toUpperCase(),
          paymentDate: new Date(),
          referenceNumber: referenceNumber || `PORTAL/UPI/${Date.now().toString().slice(-6)}`,
          notes: 'Instant customer self-service settlement via Portal',
          recordedByUserId: req.user?.id || null
        }
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: invoice.totalAmount,
          amountDue: 0.0,
          status: 'PAID'
        }
      });

      return { payment, updatedInvoice };
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'PAYMENT',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: `Customer ${invoice.customer.companyName} settled invoice ${invoice.invoiceNumber} (₹${amount.toFixed(2)}) via Portal.`
      }
    });

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${amount.toLocaleString('en-IN')} confirmed! Invoice ${invoice.invoiceNumber} is now fully PAID.`,
      payment: result.payment
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Payment processing failed.' });
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { companyName, contactName, email, phone, street, city, country, paymentTerms } = req.body;

    if (!companyName || !email) {
      return res.status(400).json({ success: false, errors: ['Company name and email are required.'] });
    }

    const existing = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return res.status(400).json({ success: false, errors: ['A customer with this email already exists.'] });
    }

    const customer = await prisma.customer.create({
      data: {
        companyName: companyName.trim(),
        contactName: contactName ? contactName.trim() : companyName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || null,
        street: street || null,
        city: city || null,
        country: country || 'India',
        paymentTerms: paymentTerms || 'Net 15'
      }
    });

    return res.status(201).json({ success: true, message: 'Customer created successfully.', data: customer });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create customer.' });
  }
}
