import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pushSubscriptions } from '../db/schema.js';

const vapidReady = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
if (vapidReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

export const notificationService = {
  enabled() { return vapidReady; },
  publicKey() { return process.env.VAPID_PUBLIC_KEY || null; },
  async sendToUser(userId: string, payload: { title: string; body: string; url?: string }) {
    if (!vapidReady) return { sent: 0, skipped: true };
    const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    let sent = 0;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload));
        sent += 1;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
        else console.error('[push] delivery failed', error?.message || error);
      }
    }
    return { sent, skipped: false };
  },
};
