import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listTaxes(req: AuthenticatedRequest, res: Response) {
  try {
    const taxes = await prisma.tax.findMany({
      where: { isActive: true },
      orderBy: { rate: 'asc' }
    });
    return res.json({ success: true, data: taxes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve tax rates.' });
  }
}

export async function createTax(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, rate, isDefault } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, errors: ['Tax rule name is required.'] });
    }

    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      return res.status(400).json({ success: false, errors: ['Tax rate must be a non-negative percentage.'] });
    }

    if (isDefault) {
      await prisma.tax.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const tax = await prisma.tax.create({
      data: {
        name: name.trim(),
        rate: parsedRate,
        isDefault: Boolean(isDefault)
      }
    });

    return res.status(201).json({ success: true, message: 'Tax rule created successfully.', data: tax });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create tax rule.' });
  }
}
