import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Cache per-role demo user IDs so we don't hit the DB every request
const demoUserCache: Record<string, { id: string; role: string; name: string }> = {};

const DEMO_FALLBACK_UUIDS: Record<string, string> = {
  citizen: '00000000-0000-0000-0000-000000000001',
  officer: '00000000-0000-0000-0000-000000000002',
  admin: '00000000-0000-0000-0000-000000000003',
  researcher: '00000000-0000-0000-0000-000000000004',
};

export async function getDemoUser(role: string): Promise<{ id: string; role: string; name: string }> {
  if (demoUserCache[role]) {
    return demoUserCache[role];
  }
  const fallbackId = DEMO_FALLBACK_UUIDS[role] || '00000000-0000-0000-0000-000000000001';
  try {
    const [dbUser] = await db.select().from(users).where(eq(users.role, role)).limit(1);
    const user = dbUser
      ? { id: dbUser.id, role: dbUser.role, name: dbUser.displayName }
      : { id: fallbackId, role, name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo` };
    demoUserCache[role] = user;
    return user;
  } catch {
    return { id: fallbackId, role, name: `${role} Demo` };
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const headerRole = req.headers['x-demo-role'] as string | undefined;
  const cookieRole = req.cookies?.role as string | undefined;
  const role = headerRole || cookieRole;

  if (!role) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Security Gate: Reject unauthenticated role escalation
  // Privileged roles (officer, admin, researcher) require an authenticated session cookie
  if (['officer', 'admin', 'researcher'].includes(role)) {
    if (process.env.NODE_ENV === 'production') {
      if (!cookieRole || cookieRole !== role) {
        return res.status(403).json({ success: false, error: 'Privileged role requires authenticated session' });
      }
    } else if (headerRole && headerRole !== 'citizen' && !cookieRole) {
      return res.status(403).json({ success: false, error: 'Privileged role escalation via header rejected' });
    }
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
