import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { requireAuth, requireRole } from '../server/middleware/auth.js';
import { db } from '../server/db/index.js';

vi.mock('../server/db/index.js', () => {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue([]);
  return { db: chain };
});

describe('requireAuth middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('rejects x-demo-role in production mode when no session cookie is provided', async () => {
    process.env.NODE_ENV = 'production';

    const req: any = {
      cookies: {},
      headers: { 'x-demo-role': 'citizen' },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('authenticates user with a valid nd_session cookie in production mode', async () => {
    process.env.NODE_ENV = 'production';

    const token = 'valid-session-token-123';
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const mockUser = {
      id: '11111111-1111-1111-1111-111111111111',
      role: 'citizen',
      displayName: 'Citizen Jane',
    };
    const mockSession = {
      id: 'session-001',
      tokenHash,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour in future
    };

    (db as any).limit.mockResolvedValueOnce([{ user: mockUser, session: mockSession }]);

    const req: any = {
      cookies: { nd_session: token },
      headers: {},
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: mockUser.id,
      role: 'citizen',
      name: 'Citizen Jane',
    });
  });

  it('rejects expired nd_session cookie in production mode', async () => {
    process.env.NODE_ENV = 'production';

    const token = 'expired-session-token-456';
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const mockUser = {
      id: '11111111-1111-1111-1111-111111111111',
      role: 'citizen',
      displayName: 'Citizen Jane',
    };
    const mockSession = {
      id: 'session-002',
      tokenHash,
      expiresAt: new Date(Date.now() - 3600 * 1000), // expired 1 hour ago
    };

    (db as any).limit.mockResolvedValueOnce([{ user: mockUser, session: mockSession }]);

    const req: any = {
      cookies: { nd_session: token },
      headers: {},
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole middleware', () => {
  it('allows request when user has authorized role', () => {
    const req: any = { user: { id: 'u1', role: 'officer' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    requireRole('officer', 'admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 Forbidden when user does not have authorized role', () => {
    const req: any = { user: { id: 'u1', role: 'citizen' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    requireRole('officer', 'admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});
