import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: true,
        plans: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve products.' });
  }
}

export async function getProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        plans: true
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    return res.json({ success: true, data: product });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve product.' });
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, type, salesPrice, costPrice, notes, variants } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, errors: ['Product name is required.'] });
    }

    const parsedSalesPrice = parseFloat(salesPrice);
    if (isNaN(parsedSalesPrice) || parsedSalesPrice < 0) {
      return res.status(400).json({ success: false, errors: ['Sales price must be a non-negative number.'] });
    }

    const parsedCostPrice = costPrice !== undefined ? parseFloat(costPrice) : 0;
    if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
      return res.status(400).json({ success: false, errors: ['Cost price must be a non-negative number.'] });
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name: name.trim(),
          type: type || 'Software',
          salesPrice: parsedSalesPrice,
          costPrice: parsedCostPrice,
          notes: notes || null
        }
      });

      if (variants && Array.isArray(variants)) {
        for (const v of variants) {
          if (v.variantName) {
            await tx.productVariant.create({
              data: {
                productId: p.id,
                variantName: v.variantName.trim(),
                priceAdjustment: parseFloat(v.priceAdjustment) || 0.0
              }
            });
          }
        }
      }

      return await tx.product.findUnique({
        where: { id: p.id },
        include: { variants: true, plans: true }
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: product?.id || '',
        details: `Created product "${name}" with sales price ₹${parsedSalesPrice}`
      }
    });

    return res.status(201).json({ success: true, message: 'Product created successfully.', data: product });
  } catch (error: any) {
    console.error('Create product error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create product.' });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, type, salesPrice, costPrice, notes, isActive } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();
    if (type) dataToUpdate.type = type;
    if (salesPrice !== undefined) dataToUpdate.salesPrice = parseFloat(salesPrice);
    if (costPrice !== undefined) dataToUpdate.costPrice = parseFloat(costPrice);
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { variants: true, plans: true }
    });

    return res.json({ success: true, message: 'Product updated successfully.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update product.' });
  }
}

export async function addVariant(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // product id
    const { variantName, priceAdjustment } = req.body;

    if (!variantName || typeof variantName !== 'string' || variantName.trim().length === 0) {
      return res.status(400).json({ success: false, errors: ['Variant name is required.'] });
    }

    const adjustment = parseFloat(priceAdjustment) || 0.0;

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        variantName: variantName.trim(),
        priceAdjustment: adjustment
      }
    });

    return res.status(201).json({ success: true, message: 'Variant added successfully.', data: variant });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to add variant.' });
  }
}
