import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const VALID_DEMO_ROLES = new Set(['citizen', 'officer', 'admin', 'researcher']);

// Cache per-role DB user UUIDs in non-production so we don't hit the DB every request
const demoUserCache: Record<string, { id: string; role: string; name: string }> = {};

export function getDemoRoleFromRequest(req: Request): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  const rawRole =
    (req.headers['x-demo-role'] as string | undefined) ||
    (req.cookies?.role as string | undefined);
  if (typeof rawRole !== 'string') return undefined;
  const normalized = rawRole.trim().toLowerCase();
  return VALID_DEMO_ROLES.has(normalized) ? normalized : undefined;
}

export async function findDemoUser(
  role: string
): Promise<{ id: string; role: string; name: string } | null> {
  if (process.env.NODE_ENV === 'production' || !VALID_DEMO_ROLES.has(role)) {
    return null;
  }
  if (process.env.NODE_ENV !== 'test' && demoUserCache[role]) {
    return demoUserCache[role];
  }
  const [dbUser] = await db.select().from(users).where(eq(users.role, role)).limit(1);
  if (!dbUser) {
    return null;
  }
  const user = { id: dbUser.id, role: dbUser.role, name: dbUser.displayName };
  if (process.env.NODE_ENV !== 'test') {
    demoUserCache[role] = user;
  }
  return user;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies?.nd_session as string | undefined;
    if (sessionToken) {
      const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
      const [row] = await db
        .select({ user: users, session: sessions })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.tokenHash, tokenHash))
        .limit(1);
      if (row?.session.expiresAt && row.session.expiresAt > new Date()) {
        req.user = { id: row.user.id, role: row.user.role, name: row.user.displayName };
        return next();
      }
    }

    const role = getDemoRoleFromRequest(req);
    if (!role) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await findDemoUser(role);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(503).json({ success: false, error: 'Authentication service unavailable' });
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
