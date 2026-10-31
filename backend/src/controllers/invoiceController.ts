import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, customerId, overdue, search, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (status) where.status = String(status).toUpperCase();
    if (customerId) where.customerId = String(customerId);

    // Customer isolation
    if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
      where.customerId = req.user.customerId;
    }

    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['CONFIRMED', 'OVERDUE', 'DRAFT'] };
      where.amountDue = { gt: 0 };
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search) } },
        { customer: { companyName: { contains: String(search) } } },
        { customer: { contactName: { contains: String(search) } } }
      ];
    }

    const pageNum = parseInt(String(page)) || 1;
    const limitNum = Math.min(100, parseInt(String(limit)) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          subscription: {
            include: { plan: true }
          },
          payments: true
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.invoice.count({ where })
    ]);

    // Dynamically mark overdue invoices
    const now = new Date();
    const processedInvoices = invoices.map(inv => {
      let currentStatus = inv.status;
      if (inv.status === 'CONFIRMED' && inv.dueDate < now && inv.amountDue > 0) {
        currentStatus = 'OVERDUE';
      }
      return {
        ...inv,
        status: currentStatus
      };
    });

    return res.json({
      success: true,
      data: processedInvoices,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve invoices.' });
  }
}

export async function getInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: { plan: { include: { product: true } } }
        },
        lines: {
          include: { product: true, variant: true }
        },
        payments: {
          include: { recordedByUser: { select: { id: true, name: true, email: true } } },
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    // Customer isolation check
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== invoice.customerId) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view your own invoices.' });
    }

    return res.json({ success: true, data: invoice });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve invoice.' });
  }
}

export async function confirmInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ success: false, error: `Only DRAFT invoices can be confirmed. Current status: ${invoice.status}` });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { customer: true, lines: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE',
        entityType: 'INVOICE',
        entityId: id,
        details: `Confirmed invoice ${invoice.invoiceNumber}`
      }
    });

    return res.json({ success: true, message: `Invoice ${invoice.invoiceNumber} confirmed.`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to confirm invoice.' });
  }
}

export async function cancelInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Paid invoices cannot be cancelled directly. Please refund first.' });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE',
        entityType: 'INVOICE',
        entityId: id,
        details: `Cancelled invoice ${invoice.invoiceNumber}`
      }
    });

    return res.json({ success: true, message: `Invoice ${invoice.invoiceNumber} cancelled.`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to cancel invoice.' });
  }
}

export async function sendInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { sentAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE',
        entityType: 'INVOICE',
        entityId: id,
        details: `Sent invoice ${invoice.invoiceNumber} to ${invoice.customer.email}`
      }
    });

    return res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} successfully dispatched to ${invoice.customer.email}.`,
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to send invoice.' });
  }
}
