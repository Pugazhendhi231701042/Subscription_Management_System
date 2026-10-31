import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listDiscounts(req: AuthenticatedRequest, res: Response) {
  try {
    const discounts = await prisma.discount.findMany({
      include: { targetProduct: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: discounts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve discounts.' });
  }
}

export async function createDiscount(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      name,
      discountType,
      discountValue,
      minPurchase,
      minQuantity,
      startDate,
      endDate,
      usageLimit,
      scope,
      targetProductId
    } = req.body;

    const errors: string[] = [];

    if (!name || name.trim().length === 0) errors.push('Discount rule name is required.');

    const type = (discountType || '').toUpperCase();
    if (!['PERCENTAGE', 'FIXED'].includes(type)) {
      errors.push('Discount type must be PERCENTAGE or FIXED.');
    }

    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      errors.push('Discount value must be a positive number.');
    }
    if (type === 'PERCENTAGE' && value > 100) {
      errors.push('Percentage discount cannot exceed 100%.');
    }

    const minQty = parseInt(minQuantity) || 1;
    const minPurch = parseFloat(minPurchase) || 0.0;
    const limit = usageLimit ? parseInt(usageLimit) : null;
    const discountScope = (scope || 'SUBSCRIPTION').toUpperCase();

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const discount = await prisma.discount.create({
      data: {
        name: name.trim(),
        discountType: type,
        discountValue: value,
        minPurchase: minPurch,
        minQuantity: minQty,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        usageLimit: limit,
        scope: discountScope,
        targetProductId: discountScope === 'SPECIFIC_PRODUCT' ? targetProductId : null
      },
      include: { targetProduct: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entityType: 'DISCOUNT',
        entityId: discount.id,
        details: `Created discount rule "${discount.name}" (${discount.discountType} ${discount.discountValue})`
      }
    });

    return res.status(201).json({ success: true, message: 'Discount rule created successfully.', data: discount });
  } catch (error: any) {
    console.error('Create discount error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create discount rule.' });
  }
}

export async function updateDiscount(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, discountType, discountValue, minPurchase, minQuantity, startDate, endDate, usageLimit, isActive, scope, targetProductId } = req.body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();
    if (discountType) dataToUpdate.discountType = discountType.toUpperCase();
    if (discountValue !== undefined) dataToUpdate.discountValue = parseFloat(discountValue);
    if (minPurchase !== undefined) dataToUpdate.minPurchase = parseFloat(minPurchase);
    if (minQuantity !== undefined) dataToUpdate.minQuantity = parseInt(minQuantity);
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
    if (usageLimit !== undefined) dataToUpdate.usageLimit = usageLimit ? parseInt(usageLimit) : null;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);
    if (scope) dataToUpdate.scope = scope.toUpperCase();
    if (targetProductId !== undefined) dataToUpdate.targetProductId = targetProductId;

    const updated = await prisma.discount.update({
      where: { id },
      data: dataToUpdate,
      include: { targetProduct: true }
    });

    return res.json({ success: true, message: 'Discount rule updated successfully.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update discount rule.' });
  }
}
