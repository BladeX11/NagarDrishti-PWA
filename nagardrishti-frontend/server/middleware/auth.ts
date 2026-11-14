import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Cache per-role demo user IDs so we don't hit the DB every request
const demoUserCache: Record<string, { id: string; role: string; name: string }> = {};

async function getAuthenticatedUser(req: Request) {
  const sessionToken = req.cookies?.nd_session as string | undefined;
  if (sessionToken) {
    const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
    const [row] = await db.select({ user: users, session: sessions }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(eq(sessions.tokenHash, tokenHash)).limit(1);
    if (row?.session.expiresAt && row.session.expiresAt > new Date()) {
      return { id: row.user.id, role: row.user.role, name: row.user.displayName };
    }
  }

  const role = process.env.NODE_ENV === 'production' ? undefined : ((req.headers['x-demo-role'] as string) || req.cookies?.role);
  if (!role) return undefined;
  if (demoUserCache[role]) return demoUserCache[role];

  const [dbUser] = await db.select().from(users).where(eq(users.role, role)).limit(1);
  const user = dbUser
    ? { id: dbUser.id, role: dbUser.role, name: dbUser.displayName }
    : { id: `demo-${role}`, role, name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo` };
  demoUserCache[role] = user;
  return user;
}

function getDevelopmentFallback(req: Request) {
  if (process.env.NODE_ENV === 'production') return undefined;
  const role = (req.headers['x-demo-role'] as string) || req.cookies?.role;
  return role ? { id: `demo-${role}`, role, name: `${role} Demo` } : undefined;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = await getAuthenticatedUser(req);
  } catch {
    req.user = getDevelopmentFallback(req);
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    req.user = await getAuthenticatedUser(req);
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    return next();
  } catch {
    // In development, preserve the old demo fallback when the database is unavailable.
    req.user = getDevelopmentFallback(req);
    if (!req.user) return res.status(503).json({ success: false, error: 'Authentication service unavailable' });
    return next();
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
