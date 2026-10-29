import { db } from '../db/index.js';
import { issues, issueMedia, issueSupporters, verificationVotes, statusEvents, users } from '../db/schema.js';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { privacyService } from './privacyService.js';
import { auditService } from './auditService.js';
import { priorityService } from './priorityService.js';
import { nanoid } from 'nanoid';
import { aiQueue } from '../ai/queue.js';
import { inactionService } from './inactionService.js';
import { WARD_NAMES } from '../../shared/types.js';

function generatePublicRef(): string {
  // Use timestamp + random to avoid collisions with seeded ND-101..ND-125 after server restarts
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ND-${ts}${rand}`;
}

function computeAge(createdAt: Date): { age: string; ageInDays: number } {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 0) return { age: `${diffDays}d ago`, ageInDays: diffDays };
  if (diffHours > 0) return { age: `${diffHours}h ago`, ageInDays: 0 };
  return { age: 'just now', ageInDays: 0 };
}

export const issueService = {
  /**
   * Create a new issue with privacy coarsening and SLA.
   */
  async createIssue(
    data: {
      title: string;
      description?: string;
      category: string;
      language?: string;
      latitude: number;
      longitude: number;
      photoDataUrl?: string;
    },
    reporterId: string
  ) {
    let fileHash: string | null = null;
    let perceptualHash: string | null = null;
    let privateMediaPath: string | null = null;
    let publicMediaPath: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;

    if (data.photoDataUrl) {
      const { createHash } = await import('crypto');
      const fs = await import('fs/promises');
      const path = await import('path');

      const matches = data.photoDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        fileSize = buffer.length;
        fileHash = createHash('sha256').update(buffer).digest('hex');
        perceptualHash = fileHash.substring(0, 16);

        const existingMedia = await db.select().from(issueMedia).where(eq(issueMedia.fileHash, fileHash));
        if (existingMedia.length > 0) {
          throw new Error('An identical image has already been submitted for another issue.');
        }

        const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
        const privateFilename = `${nanoid(12)}_${Date.now()}.${ext}`;
        const privateDir = path.resolve(process.cwd(), 'uploads', 'private');
        await fs.mkdir(privateDir, { recursive: true });
        await fs.writeFile(path.join(privateDir, privateFilename), buffer);
        privateMediaPath = `/uploads/private/${privateFilename}`;

        // Generate sanitized EXIF-stripped public WebP derivative using sharp
        try {
          const sharpModule = await import('sharp');
          const sharp = sharpModule.default || sharpModule;
          const publicFilename = `${nanoid(12)}_${Date.now()}.webp`;
          const publicDir = path.resolve(process.cwd(), 'uploads', 'public');
          await fs.mkdir(publicDir, { recursive: true });
          const sanitizedBuffer = await sharp(buffer)
            .rotate()
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          await fs.writeFile(path.join(publicDir, publicFilename), sanitizedBuffer);
          publicMediaPath = `/uploads/public/${publicFilename}`;
        } catch {
          // Safe fallback if buffer parsing encounters atypical format
          const publicFilename = `${nanoid(12)}_${Date.now()}.${ext}`;
          const publicDir = path.resolve(process.cwd(), 'uploads', 'public');
          await fs.mkdir(publicDir, { recursive: true });
          await fs.writeFile(path.join(publicDir, publicFilename), buffer);
          publicMediaPath = `/uploads/public/${publicFilename}`;
        }
      } else {
        fileHash = createHash('sha256').update(data.photoDataUrl).digest('hex');
        perceptualHash = fileHash.substring(0, 16);
        privateMediaPath = data.photoDataUrl;
        publicMediaPath = data.photoDataUrl;
      }
    }

    // 1. Coarsen location for privacy
    const coarsened = privacyService.coarsenLocation(data.latitude, data.longitude);

    // 2. Compute SLA deadline (default 7 days)
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 7);

    // 3. Compute priority
    const priorityResult = priorityService.computePriority({
      category: data.category,
      supporterCount: 0,
      ageInDays: 0,
      slaBreach: false,
    });

    // 4. Resolve reporterId if demo or non-uuid string
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reporterId);
    let resolvedReporterId = reporterId;
    if (!isUserUuid) {
      try {
        const [u] = await db.select().from(users).where(eq(users.role, 'citizen')).limit(1);
        resolvedReporterId = u ? u.id : '00000000-0000-0000-0000-000000000001';
      } catch {
        resolvedReporterId = '00000000-0000-0000-0000-000000000001';
      }
    }

    // 5. Insert issue
    const [issue] = await db
      .insert(issues)
      .values({
        publicRef: generatePublicRef(),
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        language: data.language ?? 'en',
        status: 'Open',
        privateLat: data.latitude,
        privateLng: data.longitude,
        publicGeohash: coarsened.geohash,
        publicLat: coarsened.publicLat,
        publicLng: coarsened.publicLng,
        wardId: coarsened.wardId,
        slaDeadline,
        priority: priorityResult.priority,
        urgencyExplanation: priorityResult.explanation,
        reporterId: resolvedReporterId,
      })
      .returning();

    if (fileHash && privateMediaPath && publicMediaPath) {
      await db.insert(issueMedia).values({
        issueId: issue.id,
        type: 'before',
        privatePath: privateMediaPath,
        publicPath: publicMediaPath,
        fileHash,
        perceptualHash,
        fileSize: fileSize ?? undefined,
        mimeType: mimeType ?? undefined,
      });
    }

    // 5. Create initial audit ledger entry
    await auditService.appendStatusEvent({
      issueId: issue.id,
      fromStatus: null,
      toStatus: 'Open',
      actorId: reporterId,
      actorRole: 'citizen',
      reason: 'Issue reported by citizen',
    });

    void aiQueue.enqueueIssueInference(issue.id);

    return issue;
  },

  /**
   * Get a single issue by ID or publicRef, with media.
   */
  async getIssue(idOrRef: string, currentUserId?: string) {
    let issue = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
    
    if (isUuid) {
      const results = await db.select().from(issues).where(eq(issues.id, idOrRef));
      issue = results[0];
    } else {
      const results = await db.select().from(issues).where(eq(issues.publicRef, idOrRef));
      issue = results[0];
    }

    if (!issue) return null;

    let hasSupported = false;
    if (currentUserId) {
      try {
        const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserId);
        let checkUserId = currentUserId;
        if (!isUserUuid) {
          const [u] = await db.select().from(users).where(eq(users.role, 'citizen')).limit(1);
          if (u) checkUserId = u.id;
        }
        const sup = await db
          .select()
          .from(issueSupporters)
          .where(
            and(
              eq(issueSupporters.issueId, issue.id),
              eq(issueSupporters.userId, checkUserId)
            )
          );
        hasSupported = sup.length > 0;
      } catch {
        // Fallback
      }
    }

    const media = await db
      .select()
      .from(issueMedia)
      .where(eq(issueMedia.issueId, issue.id));

    const dateStr = issue.createdAt;
    const dateObj = typeof dateStr === 'string' ? new Date(dateStr) : (dateStr || new Date());
    const { age, ageInDays } = computeAge(dateObj);

    const updateDateStr = issue.updatedAt;
    const updateDateObj = typeof updateDateStr === 'string' ? new Date(updateDateStr) : (updateDateStr || dateObj);
    const updatedAge = computeAge(updateDateObj).age;

    // Fetch verification votes
    let fixedVotes = 0;
    let notFixedVotes = 0;
    let unsureVotes = 0;
    let totalVotes = 0;
    try {
      const votes = await db
        .select()
        .from(verificationVotes)
        .where(eq(verificationVotes.issueId, issue.id));
      fixedVotes = votes.filter((v) => v.vote === 'fixed').length;
      notFixedVotes = votes.filter((v) => v.vote === 'not_fixed').length;
      unsureVotes = votes.filter((v) => v.vote === 'unsure').length;
      totalVotes = votes.length;
    } catch {
      // Fallback if table not ready
    }

    // Fetch status events for timeline
    let formattedEvents: any[] = [];
    try {
      const eventsList = await db
        .select()
        .from(statusEvents)
        .where(eq(statusEvents.issueId, issue.id))
        .orderBy(statusEvents.sequenceNum);
      formattedEvents = eventsList.map((e) => ({
        id: e.id,
        issueId: e.issueId,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        actor: e.actorId === issue.reporterId ? 'Citizen' : e.actorRole === 'system' ? 'System AI' : 'Officer',
        actorRole: e.actorRole,
        timestamp: (e.createdAt ?? new Date()).toISOString(),
        reason: e.reason,
      }));
    } catch {
      // Fallback
    }

    const wardName = issue.wardId ? (WARD_NAMES[issue.wardId] || issue.wardId) : 'Ward 11';

    const fullIssue = {
      ...issue,
      // Public location (coarsened)
      latitude: issue.publicLat,
      longitude: issue.publicLng,
      age,
      updatedAge,
      ageInDays,
      ward: wardName,
      supporters: issue.supporterCount ?? 0,
      supporterCount: issue.supporterCount ?? 0,
      hasSupported,
      media,
      verificationVotes: {
        fixed: fixedVotes,
        notFixed: notFixedVotes,
        unsure: unsureVotes,
        total: totalVotes,
      },
      events: formattedEvents,
    };

    if (currentUserId && currentUserId === issue.reporterId) {
      return fullIssue;
    }

    return privacyService.redactForPublic(fullIssue) as typeof fullIssue;
  },

  /**
   * List issues with pagination and filters.
   */
  async listIssues(filters: {
    status?: string;
    category?: string;
    wardId?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }, currentUserId?: string) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    if (filters.status) conditions.push(eq(issues.status, filters.status));
    if (filters.category) conditions.push(eq(issues.category, filters.category));
    if (filters.wardId) conditions.push(eq(issues.wardId, filters.wardId));
    if (filters.departmentId) conditions.push(eq(issues.departmentId, filters.departmentId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(issues)
      .where(whereClause)
      .orderBy(desc(issues.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(whereClause);

    const total = Number(countResult[0]?.count ?? 0);

    let supportedSet = new Set<string>();
    if (currentUserId) {
      try {
        const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserId);
        let checkUserId = currentUserId;
        if (!isUserUuid) {
          const [u] = await db.select().from(users).where(eq(users.role, 'citizen')).limit(1);
          if (u) checkUserId = u.id;
        }
        const userSups = await db
          .select({ issueId: issueSupporters.issueId })
          .from(issueSupporters)
          .where(eq(issueSupporters.userId, checkUserId));
        supportedSet = new Set(userSups.map((s) => s.issueId).filter(Boolean) as string[]);
      } catch {
        // Fallback
      }
    }

    const issueIds = results.map((r) => r.id);
    const mediaByIssue = new Map<string, any[]>();
    if (issueIds.length > 0) {
      try {
        const mediaList = await db
          .select()
          .from(issueMedia)
          .where(inArray(issueMedia.issueId, issueIds));
        for (const m of mediaList) {
          if (m.issueId) {
            const list = mediaByIssue.get(m.issueId) || [];
            list.push(m);
            mediaByIssue.set(m.issueId, list);
          }
        }
      } catch {
        // Fallback
      }
    }

    const items = results.map((issue) => {
      const { age, ageInDays } = computeAge(issue.createdAt!);
      const updatedAge = computeAge(issue.updatedAt || issue.createdAt!).age;
      const wardName = issue.wardId ? (WARD_NAMES[issue.wardId] || issue.wardId) : 'Ward 11';
      const slaDeadlineDays = issue.slaDeadline ? Math.max(1, Math.round((new Date(issue.slaDeadline).getTime() - new Date(issue.createdAt!).getTime()) / 86400000)) : 3;
      const slaBreach = issue.slaDeadline ? (new Date(issue.slaDeadline).getTime() < Date.now() && issue.status !== 'Verified Fixed' && issue.status !== 'Claimed Resolved') : false;
      const issueMediaList = (mediaByIssue.get(issue.id) || []).map((m: any) => {
        const { exifLat, exifLng, privatePath, ...safeMedia } = m;
        return safeMedia;
      });
      const beforeMediaItem = issueMediaList.find((m: any) => m.type === 'before');
      const photoUrl = beforeMediaItem?.publicPath;

      const rawItem = {
        ...issue,
        ward: wardName,
        supporters: issue.supporterCount ?? 0,
        supporterCount: issue.supporterCount ?? 0,
        hasSupported: supportedSet.has(issue.id),
        slaBreach,
        slaDeadlineDays,
        latitude: issue.publicLat,
        longitude: issue.publicLng,
        age,
        updatedAge,
        ageInDays,
        media: issueMediaList,
        photoUrl,
      };

      return privacyService.redactForPublic(rawItem) as any;
    });

    return {
      items,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    };
  },

  /**
   * Update editable issue fields (officer action).
   */
  async updateIssue(id: string, data: Partial<{
    category: string;
    departmentId: string;
    priority: number;
    urgencyExplanation: string;
  }>) {
    const [updated] = await db
      .update(issues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();

    if (!updated) throw new Error('Issue not found');
    return updated;
  },

  /**
   * Support (upvote) an issue.
   */
  async supportIssue(issueId: string, userId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issueId);
    let issue = null;
    if (isUuid) {
      const results = await db.select().from(issues).where(eq(issues.id, issueId));
      issue = results[0];
    } else {
      const results = await db.select().from(issues).where(eq(issues.publicRef, issueId));
      issue = results[0];
    }
    if (!issue) throw new Error('Issue not found');

    const realIssueId = issue.id;

    // Resolve userId if demo or non-uuid
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    let realUserId = userId;
    if (!isUserUuid) {
      const [u] = await db.select().from(users).where(eq(users.role, 'citizen')).limit(1);
      if (u) realUserId = u.id;
    }

    // Check if already supporting
    const existing = await db
      .select()
      .from(issueSupporters)
      .where(
        and(
          eq(issueSupporters.issueId, realIssueId),
          eq(issueSupporters.userId, realUserId)
        )
      );

    if (existing.length > 0) {
      throw new Error('You are already supporting this issue');
    }

    // Add supporter
    await db.insert(issueSupporters).values({ issueId: realIssueId, userId: realUserId });

    // Increment count
    const [updated] = await db
      .update(issues)
      .set({
        supporterCount: (issue.supporterCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, realIssueId))
      .returning();

    return {
      ...updated,
      supporters: updated.supporterCount ?? 0,
      supporterCount: updated.supporterCount ?? 0,
      hasSupported: true,
    };
  },

  /**
   * Get map markers (public, coarsened locations).
   */
  async getMapMarkers(filters?: { status?: string; category?: string; wardId?: string }) {
    const conditions = [];
    if (filters?.status) conditions.push(eq(issues.status, filters.status));
    if (filters?.category) conditions.push(eq(issues.category, filters.category));
    if (filters?.wardId) conditions.push(eq(issues.wardId, filters.wardId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: issues.id,
        publicRef: issues.publicRef,
        latitude: issues.publicLat,
        longitude: issues.publicLng,
        category: issues.category,
        status: issues.status,
        title: issues.title,
        supporterCount: issues.supporterCount,
        createdAt: issues.createdAt,
        wardId: issues.wardId,
      })
      .from(issues)
      .where(whereClause);

    const tierMap = await inactionService.batchComputeTiers(results);

    return results.map((m) => {
      const tierData = tierMap.get(m.id) || { tier: 0, inactionDays: 0 };
      return {
        ...m,
        age: computeAge(m.createdAt!).age,
        tier: tierData.tier,
        inactionDays: tierData.inactionDays,
        wardId: m.wardId,
      };
    });
  },

  /**
   * Submit proof of fix (marks proof state as 'submitted').
   */
  async submitProof(issueId: string, note?: string) {
    const [updated] = await db
      .update(issues)
      .set({ proofState: 'submitted', updatedAt: new Date() })
      .where(eq(issues.id, issueId))
      .returning();

    if (!updated) throw new Error('Issue not found');
    return updated;
  },
};
