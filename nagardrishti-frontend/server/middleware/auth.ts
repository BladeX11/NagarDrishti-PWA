import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Cache per-role demo user IDs so we don't hit the DB every request
const demoUserCache: Record<string, { id: string; role: string; name: string }> = {};

export async function getDemoUser(role: string): Promise<{ id: string; role: string; name: string }> {
  if (demoUserCache[role]) {
    return demoUserCache[role];
  }
  try {
    const [dbUser] = await db.select().from(users).where(eq(users.role, role)).limit(1);
    const user = dbUser
      ? { id: dbUser.id, role: dbUser.role, name: dbUser.displayName }
      : { id: `demo-${role}`, role, name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo` };
    demoUserCache[role] = user;
    return user;
  } catch {
    return { id: `demo-${role}`, role, name: `${role} Demo` };
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const role = (req.headers['x-demo-role'] as string) || req.cookies?.role;
  if (!role) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const user = await getDemoUser(role);
  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}
