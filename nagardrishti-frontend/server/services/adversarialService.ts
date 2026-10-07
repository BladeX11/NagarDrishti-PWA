import { db } from '../db/index.js';
import { adversarialFlags, issueMedia, issues, statusEvents } from '../db/schema.js';
import { and, desc, eq, gt, isNotNull, ne, notInArray, sql } from 'drizzle-orm';

const CATEGORY_MEDIAN_FALLBACK_HOURS: Record<string, number> = {
  'pothole/road': 120, 
  'garbage/waste': 48, 
  'drainage/sewage': 96,
  'water supply': 72, 
  'streetlight/electrical': 24,
  'stray animals': 48, 
  'encroachment': 240, 
  'other': 96,
};

// Pure JS hex hamming distance
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

// Pure JS haversine distance (meters)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const adversarialService = {
  /**
   * Main entrypoint after proof is submitted.
   */
  async runProofChecks(issueId: string, mediaId: string) {
    try {
      await Promise.allSettled([
        this.checkPhotoReuse(mediaId, issueId),
        this.checkTemporalImpossibility(issueId),
        this.checkGpsMismatch(issueId, mediaId),
      ]);
    } catch (e) {
      console.error('[adversarialService] Check failed:', e);
    }
  },

  /**
   * Rule 1: Photo Reuse Detection
   */
  async checkPhotoReuse(mediaId: string, issueId: string) {
    const [media] = await db.select().from(issueMedia).where(eq(issueMedia.id, mediaId));
    if (!media || !media.perceptualHash) return;

    // Fetch all other 'after' and 'proof' media across the system
    const candidates = await db.select({
      id: issueMedia.id,
      issueId: issueMedia.issueId,
      perceptualHash: issueMedia.perceptualHash
    })
    .from(issueMedia)
    .where(
      and(
        isNotNull(issueMedia.perceptualHash),
        notInArray(issueMedia.type, ['before']),
        ne(issueMedia.issueId, issueId)
      )
    );

    let closestDistance = 64;
    let closestCandidate = null;

    for (const candidate of candidates) {
      if (!candidate.perceptualHash) continue;
      const distance = hammingDistance(media.perceptualHash, candidate.perceptualHash);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCandidate = candidate;
      }
    }

    if (closestDistance <= 8 && closestCandidate && closestCandidate.issueId) {
      const severity = closestDistance <= 4 ? 'high' : 'medium';
      await this._insertFlag(issueId, 'PHOTO_REUSE', severity, {
        matchedIssueId: closestCandidate.issueId,
        matchedMediaId: closestCandidate.id,
        hammingDistance: closestDistance
      });
    }
  },

  /**
   * Rule 2: Temporal Impossibility
   */
  async checkTemporalImpossibility(issueId: string) {
    const [issue] = await db.select({
      createdAt: issues.createdAt,
      category: issues.category
    }).from(issues).where(eq(issues.id, issueId));
    
    if (!issue || !issue.createdAt) return;

    const [event] = await db.select({
      createdAt: statusEvents.createdAt
    })
    .from(statusEvents)
    .where(
      and(
        eq(statusEvents.issueId, issueId),
        eq(statusEvents.toStatus, 'Claimed Resolved')
      )
    )
    .orderBy(desc(statusEvents.sequenceNum))
    .limit(1);

    if (!event || !event.createdAt) return;

    const resolutionHours = (event.createdAt.getTime() - issue.createdAt.getTime()) / 3_600_000;
    const medianHours = CATEGORY_MEDIAN_FALLBACK_HOURS[issue.category] || 96;

    if (resolutionHours / medianHours < 0.10) {
      await this._insertFlag(issueId, 'TEMPORAL', 'high', {
        resolutionHours: Math.round(resolutionHours * 10) / 10,
        medianHours,
        ratioToMedian: Math.round((resolutionHours / medianHours) * 100) / 100,
        category: issue.category
      });
    }
  },

  /**
   * Rule 3: GPS Mismatch (Opportunistic)
   */
  async checkGpsMismatch(issueId: string, mediaId: string) {
    const [media] = await db.select().from(issueMedia).where(eq(issueMedia.id, mediaId));
    if (!media || media.exifLat === null || media.exifLng === null) return;

    const [issue] = await db.select({
      privateLat: issues.privateLat,
      privateLng: issues.privateLng
    }).from(issues).where(eq(issues.id, issueId));

    if (!issue) return;

    const distanceMeters = haversineDistance(media.exifLat, media.exifLng, issue.privateLat, issue.privateLng);

    if (distanceMeters > 500) {
      const severity = distanceMeters > 2000 ? 'high' : 'medium';
      await this._insertFlag(issueId, 'GPS_MISMATCH', severity, {
        photoLat: media.exifLat,
        photoLng: media.exifLng,
        distanceMeters: Math.round(distanceMeters)
      });
    }
  },

  /**
   * Rule 4: Bulk Closure Anomaly (Cron)
   */
  async checkBulkClosureAnomaly() {
    // 1. Find officers with closures today
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const todayEvents = await db.select({
      actorId: statusEvents.actorId,
      issueId: statusEvents.issueId,
      createdAt: statusEvents.createdAt
    })
    .from(statusEvents)
    .where(
      and(
        eq(statusEvents.toStatus, 'Claimed Resolved'),
        gt(statusEvents.createdAt, oneDayAgo),
        isNotNull(statusEvents.actorId)
      )
    );

    const officerClosuresToday = new Map<string, string[]>();
    for (const ev of todayEvents) {
      if (!ev.actorId || !ev.issueId) continue;
      if (!officerClosuresToday.has(ev.actorId)) officerClosuresToday.set(ev.actorId, []);
      officerClosuresToday.get(ev.actorId)!.push(ev.issueId);
    }

    // 2. For each officer, check 30-day baseline
    for (const [officerId, issueIds] of officerClosuresToday.entries()) {
      if (issueIds.length < 5) continue; // Skip if fewer than 5 closures today

      const historyEvents = await db.select({
        createdAt: statusEvents.createdAt
      })
      .from(statusEvents)
      .where(
        and(
          eq(statusEvents.actorId, officerId),
          eq(statusEvents.toStatus, 'Claimed Resolved'),
          gt(statusEvents.createdAt, thirtyDaysAgo)
        )
      );

      // Group by day (YYYY-MM-DD string as key)
      const dailyCounts = new Map<string, number>();
      for (const ev of historyEvents) {
        if (!ev.createdAt) continue;
        const dayKey = ev.createdAt.toISOString().split('T')[0];
        dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
      }

      const activeDays = dailyCounts.size;
      if (activeDays < 5) continue; // Not enough history baseline

      const counts = Array.from(dailyCounts.values());
      const mean = counts.reduce((a, b) => a + b, 0) / activeDays;
      const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / activeDays;
      const stddev = Math.sqrt(variance);

      const limit = mean + 2 * stddev;

      if (issueIds.length > limit) {
        // Flag all issues closed today by this officer
        for (const issueId of issueIds) {
          await this._insertFlag(issueId, 'BULK_CLOSURE', 'medium', {
            officerId,
            closuresToday: issueIds.length,
            officerMedian: Math.round(mean),
            officerStddev: Math.round(stddev * 10) / 10
          });
        }
      }
    }
  },

  async getActiveFlags(issueId: string) {
    return await db.select()
      .from(adversarialFlags)
      .where(eq(adversarialFlags.issueId, issueId));
  },

  async resolveFlag(flagId: string, resolution: string, resolvedBy: string) {
    await db.update(adversarialFlags)
      .set({
        resolution,
        resolvedBy,
        resolvedAt: new Date()
      })
      .where(eq(adversarialFlags.id, flagId));
  },

  async _insertFlag(issueId: string, rule: string, severity: string, details: any) {
    // Check if flag already exists (active) to prevent duplicates
    const [existing] = await db.select()
      .from(adversarialFlags)
      .where(
        and(
          eq(adversarialFlags.issueId, issueId),
          eq(adversarialFlags.rule, rule),
          sql`${adversarialFlags.resolvedAt} IS NULL`
        )
      );
    
    if (existing) return; // Don't flag same rule twice while active

    await db.insert(adversarialFlags).values({
      issueId,
      rule,
      severity,
      details
    });
  }
};
