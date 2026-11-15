import { Router, type Request, type Response } from 'express';
import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { otpChallenges, sessions, users } from '../db/schema.js';
import { findDemoUser, getDemoRoleFromRequest } from '../middleware/auth.js';

const router = Router();
const VALID_ROLES = new Set(['citizen', 'officer', 'admin', 'researcher']);
const PRIVILEGED_ROLES = new Set(['officer', 'admin', 'researcher']);

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeDestination(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function hashSecret(value: string) {
  return createHmac('sha256', process.env.OTP_SECRET || process.env.SESSION_SECRET || 'development-otp-secret').update(value).digest('hex');
}

function createOtp() {
  return randomBytes(4).readUInt32BE(0).toString().padStart(6, '0').slice(-6);
}

function parseProvisionedEmails(raw?: string): Set<string> {
  return new Set(
    (raw || '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isEmailProvisionedForRole(role: string, destination: string, channel: 'email' | 'sms'): boolean {
  if (channel !== 'email') return false;
  if (role === 'officer') return parseProvisionedEmails(process.env.OFFICER_EMAILS).has(destination);
  if (role === 'admin') return parseProvisionedEmails(process.env.ADMIN_EMAILS).has(destination);
  if (role === 'researcher') return parseProvisionedEmails(process.env.RESEARCHER_EMAILS).has(destination);
  return role === 'citizen';
}

function isSecureCookie(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const isForwardedHttps = Array.isArray(forwardedProto)
    ? forwardedProto.some((value) => value.split(',')[0].trim().toLowerCase() === 'https')
    : typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  return config.NODE_ENV === 'production' && (req.secure || isForwardedHttps);
}

function createOtpRateLimiter(options: {
  windowMs: number;
  max: number;
  byDestination?: boolean;
  message: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: options.message },
    skip: options.byDestination
      ? (req: Request) => !normalizeDestination(req.body?.destination)
      : undefined,
    keyGenerator: options.byDestination
      ? (req: Request) => `dest:${hashSecret(normalizeDestination(req.body?.destination))}`
      : undefined,
  });
}

const requestOtpIpLimiter = createOtpRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many OTP requests from this IP. Please try again later.',
});

const requestOtpDestLimiter = createOtpRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  byDestination: true,
  message: 'Too many OTP requests for this destination. Please try again later.',
});

const verifyOtpIpLimiter = createOtpRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many verification attempts from this IP. Please try again later.',
});

const verifyOtpDestLimiter = createOtpRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  byDestination: true,
  message: 'Too many verification attempts for this destination. Please try again later.',
});

async function sendOtp(destination: string, channel: 'email' | 'sms', code: string) {
  if (channel === 'email' && process.env.RESEND_API_KEY && process.env.OTP_FROM_EMAIL) {
    const sendEmail = (to: string) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.OTP_FROM_EMAIL,
          to: [to],
          subject: 'Your NagarDrishti verification code',
          text: `Your NagarDrishti verification code for ${destination} is ${code}. It expires in 10 minutes.`,
        }),
      });
    let response = await sendEmail(destination);
    if (!response.ok && process.env.OTP_FALLBACK_EMAIL && process.env.OTP_FALLBACK_EMAIL.trim().toLowerCase() !== destination) {
      response = await sendEmail(process.env.OTP_FALLBACK_EMAIL.trim());
    }
    if (!response.ok) throw new Error('Email provider rejected the OTP');
    return;
  }

  if (channel === 'sms' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    const body = new URLSearchParams({ To: destination, From: process.env.TWILIO_FROM_NUMBER, Body: `NagarDrishti verification code: ${code}. Expires in 10 minutes.` });
    const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok) throw new Error('SMS provider rejected the OTP');
    return;
  }

  if (process.env.NODE_ENV === 'production') throw new Error('No OTP provider is configured');
  console.info(`[otp:${channel}] ${destination}: ${code}`);
}

async function createSession(user: { id: string; role: string; displayName: string }, req: Request, res: Response) {
  const token = randomBytes(32).toString('hex');
  await db.insert(sessions).values({ id: randomUUID(), userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  res.cookie('nd_session', token, { httpOnly: true, sameSite: 'lax', secure: isSecureCookie(req), maxAge: 7 * 24 * 60 * 60 * 1000 });
  return { id: user.id, role: user.role, name: user.displayName };
}

router.post('/request-otp', requestOtpIpLimiter, requestOtpDestLimiter, async (req, res) => {
  try {
    const destination = normalizeDestination(req.body.destination);
    const channel = req.body.channel === 'sms' ? 'sms' : 'email';
    if (!destination || (channel === 'email' && !/^\S+@\S+\.\S+$/.test(destination)) || (channel === 'sms' && !/^\+?[1-9]\d{7,14}$/.test(destination))) return res.status(400).json({ success: false, error: 'A valid email address or phone number is required' });
    const code = createOtp();
    await db.insert(otpChallenges).values({ destinationHash: hashSecret(destination), channel, codeHash: hashSecret(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOtp(destination, channel, code);
    res.json({ success: true, data: { expiresInSeconds: 600 } });
  } catch (error: any) {
    res.status(503).json({ success: false, error: error.message });
  }
});

router.post('/verify-otp', verifyOtpIpLimiter, verifyOtpDestLimiter, async (req, res) => {
  try {
    const destination = normalizeDestination(req.body.destination);
    const code = String(req.body.code ?? '').trim();
    const channel = req.body.channel === 'sms' ? 'sms' : 'email';
    if (!destination || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, error: 'A six-digit verification code is required' });
    const destinationHash = hashSecret(destination);
    const [challenge] = await db.select().from(otpChallenges).where(eq(otpChallenges.destinationHash, destinationHash)).orderBy(desc(otpChallenges.createdAt)).limit(1);
    if (!challenge || challenge.channel !== channel || challenge.consumedAt || challenge.expiresAt < new Date()) return res.status(400).json({ success: false, error: 'Code expired or not found' });
    if (challenge.attempts >= 5) return res.status(429).json({ success: false, error: 'Too many attempts. Request a new code.' });
    if (challenge.codeHash !== hashSecret(code)) {
      await db.update(otpChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(otpChallenges.id, challenge.id));
      return res.status(401).json({ success: false, error: 'Incorrect verification code' });
    }

    const requestedRoleRaw = req.body.role;
    if (requestedRoleRaw !== undefined && requestedRoleRaw !== '' && (typeof requestedRoleRaw !== 'string' || !VALID_ROLES.has(requestedRoleRaw))) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    const requestedRole = typeof requestedRoleRaw === 'string' && VALID_ROLES.has(requestedRoleRaw) ? requestedRoleRaw : 'citizen';

    const destinationColumn = channel === 'email' ? { emailHash: destinationHash } : { phoneHash: destinationHash };
    let [user] = channel === 'email'
      ? await db.select().from(users).where(eq(users.emailHash, destinationHash)).limit(1)
      : await db.select().from(users).where(eq(users.phoneHash, destinationHash)).limit(1);

    const allowDevDemoSelfAssign = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_LOGIN === 'true';
    const isPrivilegedRequest = PRIVILEGED_ROLES.has(requestedRole);
    const hasExistingMatchingRole = Boolean(user && user.role === requestedRole);
    const isProvisioned = isEmailProvisionedForRole(requestedRole, destination, channel);

    // Check role eligibility before consuming OTP so rejected role attempts do not burn the challenge
    if (isPrivilegedRequest && !hasExistingMatchingRole && !allowDevDemoSelfAssign && !isProvisioned) {
      return res.status(403).json({ success: false, error: 'This account must be provisioned by an administrator' });
    }

    const [consumed] = await db
      .update(otpChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpChallenges.id, challenge.id), isNull(otpChallenges.consumedAt)))
      .returning();
    if (!consumed) {
      return res.status(400).json({ success: false, error: 'Code expired or not found' });
    }

    if (!user) {
      const displayName =
        typeof req.body.displayName === 'string' && req.body.displayName.trim()
          ? req.body.displayName.trim().slice(0, 80)
          : `NagarDrishti ${requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)}`;
      [user] = await db.insert(users).values({ ...destinationColumn, displayName, role: requestedRole }).returning();
    } else if (user.role === 'citizen' && isPrivilegedRequest && isProvisioned) {
      [user] = await db
        .update(users)
        .set({ role: requestedRole, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
    }
    res.json({ success: true, data: await createSession(user, req, res) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/mode', (_req, res) => {
  res.json({
    success: true,
    data: {
      demoLoginEnabled: process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_LOGIN === 'true',
    },
  });
});

router.post('/login', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_LOGIN !== 'true') return res.status(410).json({ success: false, error: 'Role-based login is disabled. Use OTP verification.' });
    const { role } = req.body;
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    let [user] = await db.select().from(users).where(eq(users.role, role)).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({ displayName: req.body.displayName || `${role.charAt(0).toUpperCase() + role.slice(1)} Demo`, role }).returning();
    }
    res.json({ success: true, data: await createSession(user, req, res) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.nd_session;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).catch(() => undefined);
  res.clearCookie('nd_session', { httpOnly: true, sameSite: 'lax', secure: isSecureCookie(req) });
  res.json({ success: true });
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.nd_session;
    if (token) {
      const [row] = await db.select({ user: users, session: sessions }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(eq(sessions.tokenHash, hashToken(token))).limit(1);
      if (row?.session.expiresAt && row.session.expiresAt > new Date()) return res.json({ success: true, data: { id: row.user.id, role: row.user.role, name: row.user.displayName } });
    }
    const role = getDemoRoleFromRequest(req);
    if (!role) {
      return res.json({ success: true, data: null });
    }

    const demoUser = await findDemoUser(role);
    return res.json({ success: true, data: demoUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
