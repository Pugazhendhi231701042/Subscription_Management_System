import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listTaxes(req: AuthenticatedRequest, res: Response) {
  try {
    const taxes = db.prepare(`
      SELECT id, name, rate, tax_type as taxType, is_default as isDefault, is_active as isActive
      FROM taxes
      WHERE is_active = 1
      ORDER BY rate ASC
    `).all() as any[];

    const formatted = taxes.map(t => ({
      ...t,
      isDefault: Boolean(t.isDefault),
      isActive: Boolean(t.isActive)
    }));

    return res.json({ success: true, data: formatted });
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

    const taxId = generateId('tax');
    const now = new Date().toISOString();

    if (isDefault) {
      db.prepare('UPDATE taxes SET is_default = 0').run();
    }

    db.prepare(`
      INSERT INTO taxes (id, name, rate, tax_type, is_default, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 'PERCENTAGE', ?, 1, ?, ?)
    `).run(taxId, name.trim(), parsedRate, isDefault ? 1 : 0, now, now);

    return res.status(201).json({ success: true, message: 'Tax rule created successfully.', data: { id: taxId } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create tax rule.' });
  }
}
