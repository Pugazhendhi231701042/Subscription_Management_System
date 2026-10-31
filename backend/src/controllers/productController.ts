import { Response } from 'express';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const products = db.prepare(`
      SELECT id, name, type, sales_price as salesPrice, cost_price as costPrice, notes, is_active as isActive, created_at as createdAt
      FROM products
      WHERE is_active = 1
      ORDER BY created_at DESC
    `).all() as any[];

    for (const p of products) {
      p.variants = db.prepare(`
        SELECT id, product_id as productId, variant_name as variantName, price_adjustment as priceAdjustment
        FROM product_variants
        WHERE product_id = ?
      `).all(p.id);

      p.plans = db.prepare(`
        SELECT id, name, billing_frequency as billingFrequency, price, min_quantity as minQuantity, auto_close_on_end as autoCloseOnEnd
        FROM plans
        WHERE product_id = ? AND is_active = 1
      `).all(p.id);
    }

    return res.json({ success: true, data: products });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve products.' });
  }
}

export async function getProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const p = db.prepare(`
      SELECT id, name, type, sales_price as salesPrice, cost_price as costPrice, notes, is_active as isActive, created_at as createdAt
      FROM products
      WHERE id = ?
    `).get(id) as any;

    if (!p) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    p.variants = db.prepare(`
      SELECT id, product_id as productId, variant_name as variantName, price_adjustment as priceAdjustment
      FROM product_variants
      WHERE product_id = ?
    `).all(p.id);

    p.plans = db.prepare(`
      SELECT id, name, billing_frequency as billingFrequency, price, min_quantity as minQuantity
      FROM plans
      WHERE product_id = ? AND is_active = 1
    `).all(p.id);

    return res.json({ success: true, data: p });
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
    const prodId = generateId('prod');
    const now = new Date().toISOString();

    const insertProd = db.prepare(`
      INSERT INTO products (id, name, type, sales_price, cost_price, notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const insertVar = db.prepare(`
      INSERT INTO product_variants (id, product_id, variant_name, price_adjustment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      insertProd.run(prodId, name.trim(), type || 'Software', parsedSalesPrice, parsedCostPrice, notes || null, now, now);

      if (variants && Array.isArray(variants)) {
        for (const v of variants) {
          if (v.variantName) {
            insertVar.run(
              generateId('var'),
              prodId,
              v.variantName.trim(),
              parseFloat(v.priceAdjustment) || 0.0,
              now,
              now
            );
          }
        }
      }
    });

    tx();

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'CREATE', 'PRODUCT', prodId, `Created product "${name}" with sales price ₹${parsedSalesPrice}`, now);

    return res.status(201).json({ success: true, message: 'Product created successfully.', data: { id: prodId } });
  } catch (error: any) {
    console.error('Create product error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create product.' });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, type, salesPrice, costPrice, notes, isActive } = req.body;

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          sales_price = COALESCE(?, sales_price),
          cost_price = COALESCE(?, cost_price),
          notes = COALESCE(?, notes),
          is_active = COALESCE(?, is_active),
          updated_at = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      type || null,
      salesPrice !== undefined ? parseFloat(salesPrice) : null,
      costPrice !== undefined ? parseFloat(costPrice) : null,
      notes !== undefined ? notes : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      now,
      id
    );

    return res.json({ success: true, message: 'Product updated successfully.' });
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

    const varId = generateId('var');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO product_variants (id, product_id, variant_name, price_adjustment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(varId, id, variantName.trim(), parseFloat(priceAdjustment) || 0.0, now, now);

    return res.status(201).json({ success: true, message: 'Variant added successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to add variant.' });
  }
}
