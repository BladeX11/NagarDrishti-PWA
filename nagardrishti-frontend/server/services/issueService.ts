import { db } from "../db/index.js";
import {
  issues,
  issueMedia,
  issueSupporters,
  verificationVotes,
  statusEvents,
  users,
  modelPredictions,
} from "../db/schema.js";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { privacyService, isSafePublicMediaUrl } from "./privacyService.js";
import { auditService } from "./auditService.js";
import { priorityService } from "./priorityService.js";
import { aiQueue } from "../ai/queue.js";
import { inactionService } from "./inactionService.js";
import { storeIssueImage } from "./objectStorage.js";
import { CATEGORY_DEPARTMENTS } from "../ai/rules.js";
import type { Category } from "../../shared/types.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_AI_CONFIDENCE = 0.85;

export const CANONICAL_DEPARTMENT_IDS = [
  "roads",
  "waste",
  "water",
  "drainage",
  "electrical",
  "animals",
  "civic-works",
] as const;

export const DEPARTMENT_NAMES: Record<string, string> = {
  roads: "Roads & Infrastructure",
  waste: "Solid Waste Management",
  water: "Water Supply",
  drainage: "Drainage & Sewage",
  electrical: "Electrical & Streetlights",
  animals: "Stray Animal Control",
  "civic-works": "Civic Works",
  // Legacy aliases if older rows exist
  "animal-welfare": "Stray Animal Control",
  "drainage-water": "Drainage & Sewage",
  "solid-waste": "Solid Waste Management",
};

export function formatDepartmentName(
  departmentId: string | null | undefined,
  category?: string | null
): string | null {
  if (departmentId) {
    return DEPARTMENT_NAMES[departmentId] ?? departmentId;
  }
  if (category) {
    const mappedId =
      CATEGORY_DEPARTMENTS[category.trim().toLowerCase() as Category];
    if (mappedId) return DEPARTMENT_NAMES[mappedId] ?? mappedId;
  }
  return null;
}

export function formatWardName(wardId: string | null | undefined): string | null {
  if (!wardId) return null;
  const trimmed = wardId.trim();
  if (!trimmed) return null;
  if (/^ward-/i.test(trimmed)) {
    return `Ward ${trimmed.replace(/^ward-/i, "")}`;
  }
  if (/^ward\s+/i.test(trimmed)) {
    return `Ward ${trimmed.replace(/^ward\s+/i, "")}`;
  }
  return trimmed;
}

function normalizeWardIdFilter(wardId?: string): string | undefined {
  if (!wardId) return undefined;
  const trimmed = wardId.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^ward[\s-]+(\d+)$/i);
  if (match) return `ward-${match[1]}`;
  return trimmed;
}

function computeSlaDeadlineDays(
  slaDeadline: Date | string | null | undefined,
  createdAt: Date | string | null | undefined
): number {
  if (!slaDeadline || !createdAt) return 7;
  const diffDays = Math.round(
    (new Date(slaDeadline).getTime() - new Date(createdAt).getTime()) /
      86_400_000
  );
  return Number.isFinite(diffDays) && diffDays > 0 ? diffDays : 7;
}

function extensionFromMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  return "jpg";
}

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
  return { age: "just now", ageInDays: 0 };
}

export const issueService = {
  /**
   * Resolve a UUID or publicRef (e.g. "ND-104") to the issue's UUID.
   */
  async resolveIssueId(idOrRef: string): Promise<string | null> {
    const trimmed = String(idOrRef ?? "").trim();
    if (!trimmed) return null;
    const [row] = await db
      .select({ id: issues.id })
      .from(issues)
      .where(
        UUID_RE.test(trimmed)
          ? eq(issues.id, trimmed)
          : eq(issues.publicRef, trimmed)
      )
      .limit(1);
    return row?.id ?? null;
  },

  /**
   * Resolve an issue's UUID and reporterId for route-level ownership checks.
   */
  async resolveIssueOwner(
    idOrRef: string
  ): Promise<{ id: string; reporterId: string | null } | null> {
    const trimmed = String(idOrRef ?? "").trim();
    if (!trimmed) return null;
    const [row] = await db
      .select({ id: issues.id, reporterId: issues.reporterId })
      .from(issues)
      .where(
        UUID_RE.test(trimmed)
          ? eq(issues.id, trimmed)
          : eq(issues.publicRef, trimmed)
      )
      .limit(1);
    return row ?? null;
  },

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
      photo?: {
        buffer: Buffer;
        originalName?: string;
        mimeType: string;
        size?: number;
      };
    },
    reporterId: string
  ) {
    let fileHash: string | null = null;
    let perceptualHash: string | null = null;
    let storedMediaPath: string | null = null;
    let publicMediaPath: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;

    const { createHash } = await import("crypto");

    if (data.photo && data.photo.buffer && data.photo.buffer.length > 0) {
      const buffer = data.photo.buffer;
      mimeType = data.photo.mimeType || "image/jpeg";
      fileSize = data.photo.size ?? buffer.length;
      fileHash = createHash("sha256").update(buffer).digest("hex");
      perceptualHash = fileHash.substring(0, 16);

      const existingMedia = await db
        .select({ id: issueMedia.id })
        .from(issueMedia)
        .where(eq(issueMedia.fileHash, fileHash))
        .limit(1);
      if (existingMedia.length > 0) {
        throw new Error(
          "An identical image has already been submitted for another issue."
        );
      }

      const stored = await storeIssueImage({
        buffer,
        mimeType,
        extension: extensionFromMime(mimeType),
      });
      storedMediaPath = stored.privatePath;
      publicMediaPath = stored.publicPath;
    } else if (data.photoDataUrl) {
      const matches = data.photoDataUrl.match(
        /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i
      );
      if (matches) {
        mimeType = matches[1].toLowerCase();
        const buffer = Buffer.from(matches[2].replace(/\s+/g, ""), "base64");
        if (buffer.length > 0) {
          fileSize = buffer.length;
          fileHash = createHash("sha256").update(buffer).digest("hex");
          perceptualHash = fileHash.substring(0, 16);

          const existingMedia = await db
            .select({ id: issueMedia.id })
            .from(issueMedia)
            .where(eq(issueMedia.fileHash, fileHash))
            .limit(1);
          if (existingMedia.length > 0) {
            throw new Error(
              "An identical image has already been submitted for another issue."
            );
          }

          const stored = await storeIssueImage({
            buffer,
            mimeType,
            extension: extensionFromMime(mimeType),
          });
          storedMediaPath = stored.privatePath;
          publicMediaPath = stored.publicPath;
        }
      } else if (isSafePublicMediaUrl(data.photoDataUrl)) {
        fileHash = createHash("sha256").update(data.photoDataUrl).digest("hex");
        perceptualHash = fileHash.substring(0, 16);
        storedMediaPath = data.photoDataUrl;
        publicMediaPath = data.photoDataUrl;
      }
    }

    // 1. Coarsen location for privacy
    const coarsened = privacyService.coarsenLocation(
      data.latitude,
      data.longitude
    );

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

    const defaultDepartmentId =
      CATEGORY_DEPARTMENTS[data.category.trim().toLowerCase() as Category] ??
      "civic-works";

    // 4. Insert issue
    const [issue] = await db
      .insert(issues)
      .values({
        publicRef: generatePublicRef(),
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        departmentId: defaultDepartmentId,
        language: data.language ?? "en",
        status: "Open",
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

    if (fileHash && storedMediaPath) {
      await db.insert(issueMedia).values({
        issueId: issue.id,
        type: "before",
        privatePath: storedMediaPath,
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
      toStatus: "Open",
      actorId: reporterId,
      actorRole: "citizen",
      reason: "Issue reported by citizen",
    });

    void aiQueue.enqueueIssueInference(issue.id);

    return (await this.getIssue(issue.id)) ?? privacyService.redactForPublic(issue);
  },

  /**
   * Get a single issue by ID or publicRef, with sanitized public media and enriched metadata.
   */
  async getIssue(idOrRef: string) {
    const trimmed = String(idOrRef ?? "").trim();
    if (!trimmed) return null;

    const results = await db
      .select()
      .from(issues)
      .where(
        UUID_RE.test(trimmed)
          ? eq(issues.id, trimmed)
          : eq(issues.publicRef, trimmed)
      )
      .limit(1);
    const issue = results[0];

    if (!issue) return null;

    const rawMedia = await db
      .select()
      .from(issueMedia)
      .where(eq(issueMedia.issueId, issue.id));
    const media = privacyService.sanitizePublicMedia(rawMedia);

    const dateStr = issue.createdAt;
    const dateObj =
      typeof dateStr === "string" ? new Date(dateStr) : dateStr || new Date();
    const { age, ageInDays } = computeAge(dateObj);

    const updateDateStr = issue.updatedAt;
    const updateDateObj =
      typeof updateDateStr === "string"
        ? new Date(updateDateStr)
        : updateDateStr || dateObj;
    const updatedAge = computeAge(updateDateObj).age;

    let assignedOfficer: string | null = null;
    if (issue.assignedTo) {
      try {
        const [officer] = await db
          .select({ displayName: users.displayName })
          .from(users)
          .where(eq(users.id, issue.assignedTo))
          .limit(1);
        assignedOfficer = officer?.displayName ?? null;
      } catch {
        assignedOfficer = null;
      }
    }

    let aiConfidence = DEFAULT_AI_CONFIDENCE;
    try {
      const latestPredictions = await db
        .select({
          module: modelPredictions.module,
          confidence: modelPredictions.confidence,
          calibratedConfidence: modelPredictions.calibratedConfidence,
        })
        .from(modelPredictions)
        .where(eq(modelPredictions.issueId, issue.id))
        .orderBy(desc(modelPredictions.createdAt))
        .limit(5);
      const preferred =
        latestPredictions.find((p) => p.module === "M1") ?? latestPredictions[0];
      const raw = preferred?.calibratedConfidence ?? preferred?.confidence;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        aiConfidence = Math.min(1, Math.max(0, raw));
      }
    } catch {
      aiConfidence = DEFAULT_AI_CONFIDENCE;
    }

    // Fetch verification votes scoped to current proof cycle
    const currentProofVersion = (issue.reopenCount ?? 0) + 1;
    let fixedVotes = 0;
    let notFixedVotes = 0;
    let unsureVotes = 0;
    let totalVotes = 0;
    try {
      const allVotes = await db
        .select()
        .from(verificationVotes)
        .where(eq(verificationVotes.issueId, issue.id));
      const votes = allVotes.filter(
        (v) => (v.proofVersion ?? 1) === currentProofVersion
      );
      fixedVotes = votes.filter((v) => v.vote === "fixed").length;
      notFixedVotes = votes.filter((v) => v.vote === "not_fixed").length;
      unsureVotes = votes.filter((v) => v.vote === "unsure").length;
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
      formattedEvents = eventsList.map((e) => {
        const iso = (e.createdAt ?? new Date()).toISOString();
        return {
          id: e.id,
          issueId: e.issueId,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          actor:
            e.actorId === issue.reporterId
              ? "Citizen"
              : e.actorRole === "system"
                ? "System AI"
                : "Officer",
          actorRole: e.actorRole,
          timestamp: iso,
          createdAt: iso,
          reason: e.reason,
        };
      });
    } catch {
      // Fallback
    }

    return privacyService.redactForPublic({
      ...issue,
      department: formatDepartmentName(issue.departmentId, issue.category),
      assignedOfficer,
      aiConfidence,
      ward: formatWardName(issue.wardId),
      supporters: issue.supporterCount ?? 0,
      slaDeadlineDays: computeSlaDeadlineDays(issue.slaDeadline, dateObj),
      // Public location (coarsened)
      latitude: issue.publicLat,
      longitude: issue.publicLng,
      age,
      updatedAge,
      ageInDays,
      media,
      verificationVotes: {
        fixed: fixedVotes,
        notFixed: notFixedVotes,
        unsure: unsureVotes,
        total: totalVotes,
      },
      events: formattedEvents,
    });
  },

  /**
   * List issues with pagination and filters (redacted public DTOs + batch-loaded enrichment).
   */
  async listIssues(filters: {
    status?: string;
    category?: string;
    wardId?: string;
    departmentId?: string;
    reporterId?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;
    const normalizedWardId = normalizeWardIdFilter(filters.wardId);

    // Build conditions
    const conditions = [];
    if (filters.status) conditions.push(eq(issues.status, filters.status));
    if (filters.category)
      conditions.push(eq(issues.category, filters.category));
    if (normalizedWardId)
      conditions.push(eq(issues.wardId, normalizedWardId));
    if (filters.departmentId)
      conditions.push(eq(issues.departmentId, filters.departmentId));
    if (filters.reporterId)
      conditions.push(eq(issues.reporterId, filters.reporterId));

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

    // Batch-load assigned officers, latest AI confidences, and sanitized media
    const issueIds = results.map((r) => r.id);
    const officerIds = Array.from(
      new Set(results.map((r) => r.assignedTo).filter((id): id is string => Boolean(id)))
    );

    const officerMap = new Map<string, string>();
    if (officerIds.length > 0) {
      try {
        const officerRows = await db
          .select({ id: users.id, displayName: users.displayName })
          .from(users)
          .where(inArray(users.id, officerIds));
        for (const row of officerRows) {
          officerMap.set(row.id, row.displayName);
        }
      } catch {
        // Safe fallback
      }
    }

    const confidenceMap = new Map<string, number>();
    const mediaMap = new Map<string, Array<Record<string, unknown>>>();
    if (issueIds.length > 0) {
      try {
        const predictionRows = await db
          .select({
            issueId: modelPredictions.issueId,
            module: modelPredictions.module,
            confidence: modelPredictions.confidence,
            calibratedConfidence: modelPredictions.calibratedConfidence,
          })
          .from(modelPredictions)
          .where(inArray(modelPredictions.issueId, issueIds))
          .orderBy(desc(modelPredictions.createdAt));
        for (const row of predictionRows) {
          if (!row.issueId) continue;
          const val = row.calibratedConfidence ?? row.confidence;
          if (typeof val !== "number" || !Number.isFinite(val)) continue;
          // Prefer M1 or the latest prediction
          if (!confidenceMap.has(row.issueId) || row.module === "M1") {
            confidenceMap.set(row.issueId, Math.min(1, Math.max(0, val)));
          }
        }
      } catch {
        // Safe fallback
      }

      try {
        const mediaRows = await db
          .select()
          .from(issueMedia)
          .where(inArray(issueMedia.issueId, issueIds));
        for (const m of mediaRows) {
          if (!m.issueId) continue;
          const existing = mediaMap.get(m.issueId) ?? [];
          existing.push(m);
          mediaMap.set(m.issueId, existing);
        }
      } catch {
        // Safe fallback
      }
    }

    const items = results.map((issue) => {
      const createdAt = issue.createdAt ?? new Date();
      const { age, ageInDays } = computeAge(createdAt);
      const updatedAge = computeAge(issue.updatedAt || createdAt).age;
      const rawMedia = mediaMap.get(issue.id) ?? [];

      return privacyService.redactForPublic({
        ...issue,
        department: formatDepartmentName(issue.departmentId, issue.category),
        assignedOfficer: issue.assignedTo
          ? officerMap.get(issue.assignedTo) ?? null
          : null,
        aiConfidence: confidenceMap.get(issue.id) ?? DEFAULT_AI_CONFIDENCE,
        ward: formatWardName(issue.wardId),
        supporters: issue.supporterCount ?? 0,
        slaDeadlineDays: computeSlaDeadlineDays(issue.slaDeadline, createdAt),
        latitude: issue.publicLat,
        longitude: issue.publicLng,
        age,
        updatedAge,
        ageInDays,
        media: privacyService.sanitizePublicMedia(rawMedia),
      });
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
  async updateIssue(
    idOrRef: string,
    data: Partial<{
      category: string;
      departmentId: string;
      assignedTo: string;
      priority: number;
      urgencyExplanation: string;
    }>
  ) {
    const resolvedId = await this.resolveIssueId(idOrRef);
    if (!resolvedId) throw new Error("Issue not found");

    const [updated] = await db
      .update(issues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(issues.id, resolvedId))
      .returning();

    if (!updated) throw new Error("Issue not found");
    return updated;
  },

  /**
   * Support (upvote) an issue.
   */
  async supportIssue(issueIdOrRef: string, userId: string) {
    const resolvedId = await this.resolveIssueId(issueIdOrRef);
    if (!resolvedId) throw new Error("Issue not found");

    // Check if already supporting
    const existing = await db
      .select()
      .from(issueSupporters)
      .where(
        and(
          eq(issueSupporters.issueId, resolvedId),
          eq(issueSupporters.userId, userId)
        )
      );

    if (existing.length > 0) {
      throw new Error("You are already supporting this issue");
    }

    // Add supporter
    await db.insert(issueSupporters).values({ issueId: resolvedId, userId });

    // Increment count
    const [issue] = await db
      .select()
      .from(issues)
      .where(eq(issues.id, resolvedId));
    if (!issue) throw new Error("Issue not found");

    const [updated] = await db
      .update(issues)
      .set({
        supporterCount: (issue.supporterCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, resolvedId))
      .returning();

    return updated;
  },

  /**
   * Get map markers (public, coarsened locations).
   */
  async getMapMarkers(filters?: {
    status?: string;
    category?: string;
    wardId?: string;
  }) {
    const normalizedWardId = normalizeWardIdFilter(filters?.wardId);
    const conditions = [];
    if (filters?.status) conditions.push(eq(issues.status, filters.status));
    if (filters?.category)
      conditions.push(eq(issues.category, filters.category));
    if (normalizedWardId) conditions.push(eq(issues.wardId, normalizedWardId));

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
        departmentId: issues.departmentId,
      })
      .from(issues)
      .where(whereClause);

    const tierMap = await inactionService.batchComputeTiers(results);

    return results.map((m) => {
      const tierData = tierMap.get(m.id) || { tier: 0, inactionDays: 0 };
      return {
        ...m,
        ward: formatWardName(m.wardId),
        department: formatDepartmentName(m.departmentId, m.category),
        supporters: m.supporterCount ?? 0,
        age: m.createdAt ? computeAge(m.createdAt).age : "Recent",
        tier: tierData.tier,
        inactionDays: tierData.inactionDays,
        wardId: m.wardId,
      };
    });
  },

  /**
   * Submit proof of fix (marks proof state as 'submitted').
   */
  async submitProof(issueIdOrRef: string, _note?: string) {
    const resolvedId = await this.resolveIssueId(issueIdOrRef);
    if (!resolvedId) throw new Error("Issue not found");

    const [updated] = await db
      .update(issues)
      .set({ proofState: "submitted", updatedAt: new Date() })
      .where(eq(issues.id, resolvedId))
      .returning();

    if (!updated) throw new Error("Issue not found");
    return updated;
  },

  async reviewProof(issueIdOrRef: string, decision: "accepted" | "rejected") {
    const resolvedId = await this.resolveIssueId(issueIdOrRef);
    if (!resolvedId) throw new Error("Issue not found");

    const [updated] = await db
      .update(issues)
      .set({ proofState: decision, updatedAt: new Date() })
      .where(eq(issues.id, resolvedId))
      .returning();
    if (!updated) throw new Error("Issue not found");
    return updated;
  },
};
