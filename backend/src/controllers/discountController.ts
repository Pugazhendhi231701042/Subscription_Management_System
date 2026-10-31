import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listDiscounts(req: AuthenticatedRequest, res: Response) {
  try {
    const discounts = db.prepare(`
      SELECT d.id, d.name, d.discount_type as discountType, d.discount_value as discountValue,
             d.min_purchase as minPurchase, d.min_quantity as minQuantity, d.usage_limit as usageLimit,
             d.usage_count as usageCount, d.scope, d.is_active as isActive,
             p.name as targetProductName
      FROM discounts d
      LEFT JOIN products p ON p.id = d.target_product_id
      ORDER BY d.created_at DESC
    `).all() as any[];

    const formatted = discounts.map(d => ({
      ...d,
      isActive: Boolean(d.isActive),
      targetProduct: d.targetProductName ? { name: d.targetProductName } : null
    }));

    return res.json({ success: true, data: formatted });
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
    if (isNaN(value) || value <= 0) errors.push('Discount value must be a positive number.');
    if (type === 'PERCENTAGE' && value > 100) errors.push('Percentage discount cannot exceed 100%.');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const discId = generateId('disc');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO discounts (id, name, discount_type, discount_value, min_purchase, min_quantity, usage_limit, usage_count, scope, target_product_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?)
    `).run(
      discId,
      name.trim(),
      type,
      value,
      parseFloat(minPurchase) || 0.0,
      parseInt(minQuantity) || 1,
      usageLimit ? parseInt(usageLimit) : null,
      scope || 'SUBSCRIPTION',
      scope === 'SPECIFIC_PRODUCT' ? targetProductId : null,
      now,
      now
    );

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'CREATE', 'DISCOUNT', discId, `Created discount rule "${name}" (${type} ${value})`, now);

    return res.status(201).json({ success: true, message: 'Discount rule created successfully.', data: { id: discId } });
  } catch (error: any) {
    console.error('Create discount error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create discount rule.' });
  }
}

export async function updateDiscount(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, discountType, discountValue, minPurchase, minQuantity, usageLimit, isActive, scope, targetProductId } = req.body;

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE discounts
      SET name = COALESCE(?, name),
          discount_type = COALESCE(?, discount_type),
          discount_value = COALESCE(?, discount_value),
          min_purchase = COALESCE(?, min_purchase),
          min_quantity = COALESCE(?, min_quantity),
          usage_limit = COALESCE(?, usage_limit),
          is_active = COALESCE(?, is_active),
          scope = COALESCE(?, scope),
          target_product_id = COALESCE(?, target_product_id),
          updated_at = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      discountType || null,
      discountValue !== undefined ? parseFloat(discountValue) : null,
      minPurchase !== undefined ? parseFloat(minPurchase) : null,
      minQuantity !== undefined ? parseInt(minQuantity) : null,
      usageLimit !== undefined ? parseInt(usageLimit) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      scope || null,
      targetProductId || null,
      now,
      id
    );

    return res.json({ success: true, message: 'Discount rule updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update discount rule.' });
  }
}
