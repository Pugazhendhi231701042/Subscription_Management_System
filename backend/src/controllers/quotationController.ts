import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      include: {
        plan: {
          include: { product: true }
        },
        templateLines: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: templates });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve quotation templates.' });
  }
}

export async function createTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, planId, validityDays, lines } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, errors: ['Template name is required.'] });
    }
    if (!planId) {
      return res.status(400).json({ success: false, errors: ['Plan is required for template.'] });
    }

    const template = await prisma.$transaction(async (tx) => {
      const t = await tx.quotationTemplate.create({
        data: {
          name: name.trim(),
          planId,
          validityDays: parseInt(validityDays) || 30
        }
      });

      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          await tx.quotationTemplateLine.create({
            data: {
              templateId: t.id,
              productId: line.productId,
              variantId: line.variantId || null,
              quantity: parseInt(line.quantity) || 1,
              unitPrice: parseFloat(line.unitPrice) || 0.0
            }
          });
        }
      }

      return await tx.quotationTemplate.findUnique({
        where: { id: t.id },
        include: { templateLines: true, plan: true }
      });
    });

    return res.status(201).json({ success: true, message: 'Template created successfully.', data: template });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create quotation template.' });
  }
}

export async function listQuotations(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, status } = req.query;

    const where: any = {};
    if (customerId) where.customerId = String(customerId);
    if (status) where.status = String(status);

    // If customer role, isolate data!
    if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
      where.customerId = req.user.customerId;
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        plan: { include: { product: true } },
        lines: {
          include: { product: true, variant: true }
        },
        subscription: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: quotations });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve quotations.' });
  }
}

export async function getQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: { include: { product: true } },
        lines: {
          include: { product: true, variant: true }
        },
        subscription: true
      }
    });

    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation not found.' });
    }

    // Role check: customer isolation
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== quotation.customerId) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view your own quotations.' });
    }

    return res.json({ success: true, data: quotation });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve quotation.' });
  }
}

export async function createQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerId, planId, templateId, validityDays, paymentTerms, lines, notes } = req.body;

    const errors: string[] = [];
    if (!customerId) errors.push('Customer is required.');
    if (!planId) errors.push('Plan is required.');
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      errors.push('At least one product line is required in quotation.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Generate quotation number (QT-YYYY-XXXX)
    const count = await prisma.quotation.count();
    const year = new Date().getFullYear();
    const quotationNumber = `QT-${year}-${String(count + 1).padStart(4, '0')}`;

    const days = parseInt(validityDays) || 30;
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + days);

    // Calculate line items
    let subtotal = 0;
    let taxAmount = 0;

    const processedLines = lines.map((line: any) => {
      const qty = parseInt(line.quantity) || 1;
      const price = parseFloat(line.unitPrice) || 0.0;
      const taxRate = parseFloat(line.taxRate) || 18.0; // default 18% GST if not provided
      const lineSubtotal = qty * price;
      const lineTax = (lineSubtotal * taxRate) / 100;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        productId: line.productId,
        variantId: line.variantId || null,
        quantity: qty,
        unitPrice: price,
        taxRate: taxRate,
        amount: lineSubtotal
      };
    });

    const totalAmount = subtotal + taxAmount;

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId,
          planId,
          templateId: templateId || null,
          validityDate,
          paymentTerms: paymentTerms || 'Net 15',
          status: 'QUOTATION',
          subtotal,
          taxAmount,
          totalAmount,
          notes: notes || null
        }
      });

      for (const line of processedLines) {
        await tx.quotationLine.create({
          data: {
            quotationId: q.id,
            ...line
          }
        });
      }

      return await tx.quotation.findUnique({
        where: { id: q.id },
        include: {
          customer: true,
          plan: { include: { product: true } },
          lines: { include: { product: true, variant: true } }
        }
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entityType: 'QUOTATION',
        entityId: quotation?.id || '',
        details: `Created quotation ${quotationNumber} for customer amount ₹${totalAmount}`
      }
    });

    return res.status(201).json({
      success: true,
      message: `Quotation ${quotationNumber} generated successfully.`,
      data: quotation
    });
  } catch (error: any) {
    console.error('Create quotation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create quotation.' });
  }
}

export async function convertToSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // quotation id

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        lines: true,
        subscription: true
      }
    });

    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation not found.' });
    }

    if (quotation.subscription) {
      return res.status(400).json({
        success: false,
        error: `Quotation is already converted to subscription ${quotation.subscription.subscriptionNumber}.`
      });
    }

    // Generate Subscription number SUB-YYYY-XXXX
    const subCount = await prisma.subscription.count();
    const year = new Date().getFullYear();
    const subscriptionNumber = `SUB-${year}-${String(subCount + 1).padStart(4, '0')}`;

    // Billing dates calculation
    const startDate = new Date();
    const nextBillingDate = new Date();
    const expiryDate = new Date();

    const freq = quotation.plan.billingFrequency;
    if (freq === 'DAILY') {
      nextBillingDate.setDate(nextBillingDate.getDate() + 1);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (freq === 'WEEKLY') {
      nextBillingDate.setDate(nextBillingDate.getDate() + 7);
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    } else if (freq === 'YEARLY') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      // Monthly default
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update quotation status
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: 'CONFIRMED' }
      });

      // Create Subscription
      const sub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: quotation.customerId,
          planId: quotation.planId,
          quotationId: quotation.id,
          status: 'ACTIVE', // Confirmed & Active
          startDate,
          expiryDate,
          nextBillingDate,
          paymentTerms: quotation.paymentTerms,
          autoCloseOnEnd: quotation.plan.autoCloseOnEnd,
          allowPause: quotation.plan.allowPause,
          allowEarlyClose: quotation.plan.allowEarlyClose,
          allowRenewal: quotation.plan.allowRenewal,
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          totalAmount: quotation.totalAmount,
          notes: quotation.notes
        }
      });

      // Copy lines to subscription lines
      for (const qLine of quotation.lines) {
        await tx.subscriptionLine.create({
          data: {
            subscriptionId: sub.id,
            productId: qLine.productId,
            variantId: qLine.variantId,
            quantity: qLine.quantity,
            unitPrice: qLine.unitPrice,
            taxRate: qLine.taxRate,
            amount: qLine.amount
          }
        });
      }

      return await tx.subscription.findUnique({
        where: { id: sub.id },
        include: {
          customer: true,
          plan: { include: { product: true } },
          lines: { include: { product: true, variant: true } }
        }
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entityType: 'SUBSCRIPTION',
        entityId: result?.id || '',
        details: `Converted quotation ${quotation.quotationNumber} into Active subscription ${subscriptionNumber}`
      }
    });

    return res.status(201).json({
      success: true,
      message: `Quotation converted successfully! Subscription ${subscriptionNumber} is now ACTIVE.`,
      data: result
    });
  } catch (error: any) {
    console.error('Convert quotation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to convert quotation to subscription.' });
  }
}
