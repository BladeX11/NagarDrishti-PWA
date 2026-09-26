import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const role = req.headers['x-demo-role'] || req.cookies?.role;
  if (!role) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  // Attach demo user info based on role
  req.user = {
    id: `user-${role}-001`,
    role: role as string,
    name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo`
  };
  
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
