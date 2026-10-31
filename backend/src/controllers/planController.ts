import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listPlans(req: AuthenticatedRequest, res: Response) {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        product: {
          include: { variants: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve plans.' });
  }
}

export async function getPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        product: {
          include: { variants: true }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found.' });
    }

    return res.json({ success: true, data: plan });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve plan.' });
  }
}

export async function createPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      productId,
      name,
      billingFrequency,
      price,
      minQuantity,
      startDate,
      endDate,
      autoCloseOnEnd,
      allowPause,
      allowEarlyClose,
      allowRenewal
    } = req.body;

    const errors: string[] = [];

    if (!productId) errors.push('Target product is required.');
    if (!name || name.trim().length === 0) errors.push('Plan name is required.');

    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
    const freq = (billingFrequency || '').toUpperCase();
    if (!validFrequencies.includes(freq)) {
      errors.push('Billing frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY.');
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      errors.push('Plan price must be a non-negative number.');
    }

    const parsedMinQty = parseInt(minQuantity) || 1;
    if (parsedMinQty < 1) {
      errors.push('Minimum quantity must be at least 1.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const plan = await prisma.plan.create({
      data: {
        productId,
        name: name.trim(),
        billingFrequency: freq,
        price: parsedPrice,
        minQuantity: parsedMinQty,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        autoCloseOnEnd: Boolean(autoCloseOnEnd),
        allowPause: allowPause !== undefined ? Boolean(allowPause) : true,
        allowEarlyClose: allowEarlyClose !== undefined ? Boolean(allowEarlyClose) : true,
        allowRenewal: allowRenewal !== undefined ? Boolean(allowRenewal) : true
      },
      include: {
        product: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entityType: 'PLAN',
        entityId: plan.id,
        details: `Created plan "${plan.name}" with frequency ${plan.billingFrequency} at ₹${plan.price}`
      }
    });

    return res.status(201).json({ success: true, message: 'Plan created successfully.', data: plan });
  } catch (error: any) {
    console.error('Create plan error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create plan.' });
  }
}

export async function updatePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData: any = {};

    const fields = [
      'name', 'billingFrequency', 'price', 'minQuantity',
      'startDate', 'endDate', 'autoCloseOnEnd', 'allowPause',
      'allowEarlyClose', 'allowRenewal', 'isActive'
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'price') updateData[f] = parseFloat(req.body[f]);
        else if (f === 'minQuantity') updateData[f] = parseInt(req.body[f]);
        else if (f === 'startDate' || f === 'endDate') updateData[f] = req.body[f] ? new Date(req.body[f]) : null;
        else if (['autoCloseOnEnd', 'allowPause', 'allowEarlyClose', 'allowRenewal', 'isActive'].includes(f)) {
          updateData[f] = Boolean(req.body[f]);
        } else {
          updateData[f] = req.body[f];
        }
      }
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: updateData,
      include: { product: true }
    });

    return res.json({ success: true, message: 'Plan updated successfully.', data: plan });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update plan.' });
  }
}
