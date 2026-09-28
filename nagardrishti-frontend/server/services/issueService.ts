import { db } from '../db/index.js';
import { issues, issueMedia, issueSupporters } from '../db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { privacyService } from './privacyService.js';
import { auditService } from './auditService.js';
import { priorityService } from './priorityService.js';
import { nanoid } from 'nanoid';
import { aiQueue } from '../ai/queue.js';
import { inactionService } from './inactionService.js';

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

    if (data.photoDataUrl) {
      const { createHash } = await import('crypto');
      fileHash = createHash('sha256').update(data.photoDataUrl).digest('hex');
      perceptualHash = fileHash.substring(0, 16);

      const existingMedia = await db.select().from(issueMedia).where(eq(issueMedia.fileHash, fileHash));
      if (existingMedia.length > 0) {
        throw new Error('An identical image has already been submitted for another issue.');
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

    // 4. Insert issue
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
        reporterId,
      })
      .returning();

    if (fileHash && data.photoDataUrl) {
      await db.insert(issueMedia).values({
        issueId: issue.id,
        type: 'before',
        privatePath: data.photoDataUrl,
        fileHash,
        perceptualHash,
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
  async getIssue(idOrRef: string) {
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

    return {
      ...issue,
      // Public location (coarsened)
      latitude: issue.publicLat,
      longitude: issue.publicLng,
      age,
      updatedAge,
      ageInDays,
      media,
    };
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
  }) {
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

    const items = results.map((issue) => {
      const { age, ageInDays } = computeAge(issue.createdAt!);
      const updatedAge = computeAge(issue.updatedAt || issue.createdAt!).age;
      return {
        ...issue,
        latitude: issue.publicLat,
        longitude: issue.publicLng,
        age,
        updatedAge,
        ageInDays,
      };
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
    // Check if already supporting
    const existing = await db
      .select()
      .from(issueSupporters)
      .where(
        and(
          eq(issueSupporters.issueId, issueId),
          eq(issueSupporters.userId, userId)
        )
      );

    if (existing.length > 0) {
      throw new Error('You are already supporting this issue');
    }

    // Add supporter
    await db.insert(issueSupporters).values({ issueId, userId });

    // Increment count
    const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));
    if (!issue) throw new Error('Issue not found');

    const [updated] = await db
      .update(issues)
      .set({
        supporterCount: (issue.supporterCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, issueId))
      .returning();

    return updated;
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
