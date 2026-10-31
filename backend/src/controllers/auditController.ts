import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const { entityType, search } = req.query;

    let query = `
      SELECT l.id, l.user_id as userId, l.action, l.entity_type as entityType,
             l.entity_id as entityId, l.details, l.created_at as createdAt,
             u.name as userName, u.email as userEmail, u.role as userRole
      FROM audit_logs l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (entityType) {
      query += ' AND l.entity_type = ?';
      params.push(String(entityType).toUpperCase());
    }

    if (search) {
      query += ' AND (l.details LIKE ? OR l.action LIKE ? OR u.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY l.created_at DESC LIMIT 50';

    const logs = db.prepare(query).all(...params) as any[];

    const formatted = logs.map(l => ({
      ...l,
      user: l.userName ? { id: l.userId, name: l.userName, email: l.userEmail, role: l.userRole } : null
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve audit trail logs.' });
  }
}
