import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const role = req.headers['x-demo-role'] || req.cookies?.role;
  if (!role) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.role, String(role))).limit(1);
    if (!user) return res.status(401).json({ success: false, error: 'Demo user not found' });

    req.user = {
      id: user.id,
      role: user.role,
      name: user.displayName,
    };
    next();
  } catch {
    res.status(503).json({ success: false, error: 'Authentication service unavailable' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}
