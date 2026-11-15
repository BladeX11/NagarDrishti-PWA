import { Router } from "express";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { issues, pushSubscriptions, statusEvents } from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notificationService } from "../services/notificationService.js";

const router = Router();
const NOTIFICATION_ROLES = ["citizen", "officer", "admin", "researcher"] as const;

router.get("/", requireAuth, requireRole(...NOTIFICATION_ROLES), async (req, res) => {
  try {
    const issueScope =
      req.user!.role === "officer" || req.user!.role === "admin"
        ? or(eq(issues.reporterId, req.user!.id), eq(issues.assignedTo, req.user!.id))
        : eq(issues.reporterId, req.user!.id);

    const userIssues = await db
      .select({
        id: issues.id,
        publicRef: issues.publicRef,
        title: issues.title,
        status: issues.status,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .where(issueScope)
      .orderBy(desc(issues.updatedAt))
      .limit(50);

    const issueIds = userIssues.map((issue) => issue.id);
    const issueById = new Map(userIssues.map((issue) => [issue.id, issue]));
    const events = issueIds.length
      ? await db
          .select()
          .from(statusEvents)
          .where(inArray(statusEvents.issueId, issueIds))
          .orderBy(desc(statusEvents.createdAt))
          .limit(100)
      : [];
    const data = events.map((event) => {
      const issue = event.issueId ? issueById.get(event.issueId) : undefined;
      return {
        id: event.id,
        issueId: event.issueId,
        title: `${issue?.publicRef || "Issue"} status updated`,
        body: `${issue?.title || "Your issue"} moved to ${event.toStatus}.`,
        kind: event.toStatus === "Claimed Resolved" ? "verification" : "status",
        time: event.createdAt,
        unread: true,
      };
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/vapid-public-key", (_req, res) => {
  res.json({
    success: true,
    data: {
      enabled: notificationService.enabled(),
      publicKey: notificationService.publicKey(),
    },
  });
});

router.post(
  "/subscribe",
  requireAuth,
  requireRole(...NOTIFICATION_ROLES),
  async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth)
        return res
          .status(400)
          .json({
            success: false,
            error: "A valid push subscription is required",
          });
      await db
        .insert(pushSubscriptions)
        .values({
          userId: req.user!.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: req.get("user-agent"),
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            userId: req.user!.id,
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: req.get("user-agent"),
            updatedAt: new Date(),
          },
        });
      res.json({ success: true, data: { subscribed: true } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.delete(
  "/subscribe",
  requireAuth,
  requireRole(...NOTIFICATION_ROLES),
  async (req, res) => {
    try {
      const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
      if (endpoint) {
        await db
          .delete(pushSubscriptions)
          .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, req.user!.id)));
      }
      res.json({ success: true, data: { subscribed: false } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
