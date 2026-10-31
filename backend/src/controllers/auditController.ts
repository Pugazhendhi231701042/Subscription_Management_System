import { Response } from 'express';
import { prisma } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const { entityType, search, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (entityType) where.entityType = String(entityType).toUpperCase();

    if (search) {
      where.OR = [
        { details: { contains: String(search) } },
        { action: { contains: String(search) } },
        { user: { name: { contains: String(search) } } }
      ];
    }

    const pageNum = parseInt(String(page)) || 1;
    const limitNum = Math.min(100, parseInt(String(limit)) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve audit trail logs.' });
  }
}
