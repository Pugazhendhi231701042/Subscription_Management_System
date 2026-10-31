import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listPlans(req: AuthenticatedRequest, res: Response) {
  try {
    const plans = db.prepare(`
      SELECT p.id, p.product_id as productId, p.name, p.billing_frequency as billingFrequency,
             p.price, p.min_quantity as minQuantity, p.auto_close_on_end as autoCloseOnEnd,
             p.allow_pause as allowPause, p.allow_early_close as allowEarlyClose,
             p.allow_renewal as allowRenewal, p.is_active as isActive, p.created_at as createdAt,
             pr.name as productName, pr.sales_price as productPrice
      FROM plans p
      JOIN products pr ON pr.id = p.product_id
      WHERE p.is_active = 1
      ORDER BY p.created_at DESC
    `).all() as any[];

    const formatted = plans.map(pl => ({
      ...pl,
      autoCloseOnEnd: Boolean(pl.autoCloseOnEnd),
      allowPause: Boolean(pl.allowPause),
      allowEarlyClose: Boolean(pl.allowEarlyClose),
      allowRenewal: Boolean(pl.allowRenewal),
      product: {
        id: pl.productId,
        name: pl.productName,
        salesPrice: pl.productPrice
      }
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve plans.' });
  }
}

export async function getPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const pl = db.prepare(`
      SELECT p.*, pr.name as productName
      FROM plans p
      JOIN products pr ON pr.id = p.product_id
      WHERE p.id = ?
    `).get(id) as any;

    if (!pl) {
      return res.status(404).json({ success: false, error: 'Plan not found.' });
    }

    return res.json({ success: true, data: pl });
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

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const planId = generateId('plan');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO plans (id, product_id, name, billing_frequency, price, min_quantity, auto_close_on_end, allow_pause, allow_early_close, allow_renewal, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      planId,
      productId,
      name.trim(),
      freq,
      parsedPrice,
      parseInt(minQuantity) || 1,
      autoCloseOnEnd ? 1 : 0,
      allowPause !== undefined ? (allowPause ? 1 : 0) : 1,
      allowEarlyClose !== undefined ? (allowEarlyClose ? 1 : 0) : 1,
      allowRenewal !== undefined ? (allowRenewal ? 1 : 0) : 1,
      now,
      now
    );

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'CREATE', 'PLAN', planId, `Created plan "${name}" (${freq} at ₹${parsedPrice})`, now);

    return res.status(201).json({ success: true, message: 'Plan created successfully.', data: { id: planId } });
  } catch (error: any) {
    console.error('Create plan error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create plan.' });
  }
}

export async function updatePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, billingFrequency, price, minQuantity, autoCloseOnEnd, allowPause, allowEarlyClose, allowRenewal, isActive } = req.body;

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE plans
      SET name = COALESCE(?, name),
          billing_frequency = COALESCE(?, billing_frequency),
          price = COALESCE(?, price),
          min_quantity = COALESCE(?, min_quantity),
          auto_close_on_end = COALESCE(?, auto_close_on_end),
          allow_pause = COALESCE(?, allow_pause),
          allow_early_close = COALESCE(?, allow_early_close),
          allow_renewal = COALESCE(?, allow_renewal),
          is_active = COALESCE(?, is_active),
          updated_at = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      billingFrequency || null,
      price !== undefined ? parseFloat(price) : null,
      minQuantity !== undefined ? parseInt(minQuantity) : null,
      autoCloseOnEnd !== undefined ? (autoCloseOnEnd ? 1 : 0) : null,
      allowPause !== undefined ? (allowPause ? 1 : 0) : null,
      allowEarlyClose !== undefined ? (allowEarlyClose ? 1 : 0) : null,
      allowRenewal !== undefined ? (allowRenewal ? 1 : 0) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      now,
      id
    );

    return res.json({ success: true, message: 'Plan updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update plan.' });
  }
}
