import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, generateId } from '../db.js';
import { validateUserRegistration, validateEmail, validatePassword } from '../utils/validation.js';
import { generateToken, AuthenticatedRequest } from '../middleware/auth.js';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, companyName, phone, street, city, country } = req.body;

    const validation = validateUserRegistration({ name, email, password });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        errors: ['An account with this email address already exists. Please log in or use a different email.']
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = generateId('usr');
    const customerId = generateId('cust');
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, user_id, company_name, contact_name, email, phone, street, city, country, payment_terms, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Pure SQLite transaction
    const executeTx = db.transaction(() => {
      insertUser.run(userId, cleanEmail, name.trim(), passwordHash, 'CUSTOMER', now, now);
      insertCustomer.run(
        customerId,
        userId,
        (companyName && companyName.trim()) || name.trim(),
        name.trim(),
        cleanEmail,
        phone || null,
        street || null,
        city || null,
        country || 'India',
        'Net 15',
        'ACTIVE',
        now,
        now
      );
    });

    executeTx();

    const token = generateToken({
      id: userId,
      email: cleanEmail,
      role: 'CUSTOMER',
      name: name.trim(),
      customerId
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to Brightloop.',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role: 'CUSTOMER',
        customerId
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const emailVal = validateEmail(email || '');
    if (!emailVal.isValid) {
      return res.status(400).json({ success: false, errors: [emailVal.error || 'Invalid email address.'] });
    }

    if (!password) {
      return res.status(400).json({ success: false, errors: ['Password is required.'] });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.password_hash, u.role, c.id as customer_id
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.id
      WHERE u.email = ?
    `).get(cleanEmail) as any;

    if (!user) {
      return res.status(401).json({ success: false, errors: ['Invalid email or password.'] });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, errors: ['Invalid email or password.'] });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      customerId: user.customer_id || null
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        customerId: user.customer_id || null
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();

    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail) as any;
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched to your inbox.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000).toISOString();

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?')
      .run(resetToken, resetExpiry, user.id);

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

    return res.json({
      success: true,
      message: `Password reset link generated and dispatched to ${user.email}.`,
      resetLink,
      token: resetToken
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to process password reset request.' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, errors: ['Reset token is required.'] });
    }

    const passVal = validatePassword(newPassword || '');
    if (!passVal.isValid) {
      return res.status(400).json({ success: false, errors: [passVal.error || 'Password does not meet security criteria.'] });
    }

    const now = new Date().toISOString();
    const user = db.prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?').get(token, now) as any;

    if (!user) {
      return res.status(400).json({ success: false, errors: ['Invalid or expired reset token. Please request a new reset link.'] });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = ? WHERE id = ?')
      .run(passwordHash, null, user.id);

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, c.id as customer_id, c.company_name
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.id
      WHERE u.id = ?
    `).get(req.user.id) as any;

    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        customer: user.customer_id ? { id: user.customer_id, companyName: user.company_name } : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile.' });
  }
}
