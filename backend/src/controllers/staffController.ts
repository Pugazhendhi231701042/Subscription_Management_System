import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { validateUserRegistration } from '../utils/validation.js';

export async function listStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'STAFF'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

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

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        errors: ['An account with this email address already exists.']
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: assignedRole
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entityType: 'STAFF',
        entityId: user.id,
        details: `Created new ${assignedRole} member: ${user.name} (${user.email})`
      }
    });

    return res.status(201).json({
      success: true,
      message: `Staff member ${user.name} successfully created.`,
      data: user
    });
  } catch (error: any) {
    console.error('Create staff error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create staff member.' });
  }
}
