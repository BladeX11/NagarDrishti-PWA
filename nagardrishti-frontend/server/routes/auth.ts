import { Router } from 'express';
import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { otpChallenges, sessions, users } from '../db/schema.js';

const router = Router();

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

async function sendOtp(destination: string, channel: 'email' | 'sms', code: string) {
  if (channel === 'email' && process.env.RESEND_API_KEY && process.env.OTP_FROM_EMAIL) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.OTP_FROM_EMAIL, to: [destination], subject: 'Your NagarDrishti verification code', text: `Your NagarDrishti verification code is ${code}. It expires in 10 minutes.` }),
    });
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

async function createSession(user: { id: string; role: string; displayName: string }, res: any) {
  const token = randomBytes(32).toString('hex');
  await db.insert(sessions).values({ id: randomUUID(), userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  res.cookie('nd_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
  return { id: user.id, role: user.role, name: user.displayName };
}

router.post('/request-otp', async (req, res) => {
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

router.post('/verify-otp', async (req, res) => {
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
    await db.update(otpChallenges).set({ consumedAt: new Date() }).where(eq(otpChallenges.id, challenge.id));
    const destinationColumn = channel === 'email' ? { emailHash: destinationHash } : { phoneHash: destinationHash };
    let [user] = channel === 'email'
      ? await db.select().from(users).where(eq(users.emailHash, destinationHash)).limit(1)
      : await db.select().from(users).where(eq(users.phoneHash, destinationHash)).limit(1);
    if (!user) {
      const role = req.body.role === 'officer' || req.body.role === 'admin' || req.body.role === 'researcher' ? req.body.role : 'citizen';
      if (role !== 'citizen' && process.env.NODE_ENV === 'production') return res.status(403).json({ success: false, error: 'This account must be provisioned by an administrator' });
      [user] = await db.insert(users).values({ ...destinationColumn, displayName: req.body.displayName || 'NagarDrishti Citizen', role }).returning();
    }
    res.json({ success: true, data: await createSession(user, res) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_LOGIN !== 'true') return res.status(410).json({ success: false, error: 'Role-based login is disabled. Use OTP verification.' });
    const { role } = req.body;
    if (!['citizen', 'officer', 'admin', 'researcher'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    let [user] = await db.select().from(users).where(eq(users.role, role)).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({ displayName: req.body.displayName || `${role.charAt(0).toUpperCase() + role.slice(1)} Demo`, role }).returning();
    }
    const token = randomBytes(32).toString('hex');
    await db.insert(sessions).values({ id: randomUUID(), userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    res.cookie('nd_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ success: true, data: { id: user.id, role: user.role, name: user.displayName } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.nd_session;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).catch(() => undefined);
  res.clearCookie('nd_session');
  res.json({ success: true });
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.nd_session;
    if (token) {
      const [row] = await db.select({ user: users, session: sessions }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(eq(sessions.tokenHash, hashToken(token))).limit(1);
      if (row?.session.expiresAt && row.session.expiresAt > new Date()) return res.json({ success: true, data: { id: row.user.id, role: row.user.role, name: row.user.displayName } });
    }
    const role = process.env.NODE_ENV === 'production' ? undefined : (req.headers['x-demo-role'] || req.cookies?.role);
    if (!role) {
      return res.json({ success: true, data: null });
    }
    
    res.json({ 
      success: true, 
      data: {
        id: `user-${role}-001`,
        role,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo`
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
