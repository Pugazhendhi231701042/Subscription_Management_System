import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, generateId } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { validateUserRegistration } from '../utils/validation.js';

export async function listStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const staff = db.prepare(`
      SELECT id, name, email, role, created_at as createdAt
      FROM users
      WHERE role IN ('ADMIN', 'STAFF')
      ORDER BY created_at DESC
    `).all();

    return res.json({ success: true, data: staff });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch staff members.' });
  }
}

export async function createStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, email, password, role } = req.body;

    const validation = validateUserRegistration({ name, email, password });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    const cleanEmail = email.toLowerCase().trim();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        errors: ['An account with this email address already exists.']
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const id = generateId('usr');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanEmail, name.trim(), passwordHash, assignedRole, now, now);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId('log'), req.user?.id || null, 'CREATE', 'STAFF', id, `Created new ${assignedRole} member: ${name.trim()} (${cleanEmail})`, now);

    const created = { id, name: name.trim(), email: cleanEmail, role: assignedRole, createdAt: now };

    return res.status(201).json({
      success: true,
      message: `Staff member ${name} successfully created.`,
      data: created
    });
  } catch (error: any) {
    console.error('Create staff error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create staff member.' });
  }
}
