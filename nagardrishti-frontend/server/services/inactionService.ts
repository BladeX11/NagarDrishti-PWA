import { db } from '../db/index.js';
import { statusEvents, wards } from '../db/schema.js';
import { inArray, desc } from 'drizzle-orm';

// The strict set of forward transitions that constitute "meaningful action"
const FORWARD_TRANSITIONS = new Set([
  'Open->Triaged',
  'Triaged->Assigned',
  'Assigned->In Progress',
  'In Progress->Claimed Resolved',
]);

export interface TierData {
  tier: 0 | 1 | 2 | 3 | 4;
  inactionDays: number;
}

export const inactionService = {
  /**
   * Computes the inaction tier based on days without meaningful forward progress.
   */
  computeTier(inactionDays: number): 0 | 1 | 2 | 3 | 4 {
    if (inactionDays <= 3) return 0; // Normal
    if (inactionDays <= 7) return 1; // Highlighted
    if (inactionDays <= 14) return 2; // Escalated
    if (inactionDays <= 30) return 3; // Amplified
    return 4; // Critical
  },

  /**
   * Batch computes tiers for a list of issues to avoid N+1 query problems.
   */
  async batchComputeTiers(issueInput: { id: string; createdAt: Date | null }[]): Promise<Map<string, TierData>> {
    const result = new Map<string, TierData>();
    if (issueInput.length === 0) return result;

    const issueIds = issueInput.map((i) => i.id);

    // Fetch all status events for these issues in one query
    const events = await db
      .select({
        issueId: statusEvents.issueId,
        fromStatus: statusEvents.fromStatus,
        toStatus: statusEvents.toStatus,
        createdAt: statusEvents.createdAt,
      })
      .from(statusEvents)
      .where(inArray(statusEvents.issueId, issueIds))
      .orderBy(desc(statusEvents.sequenceNum)); // Newest first

    // Group events by issueId
    const eventsByIssue = new Map<string, typeof events>();
    for (const event of events) {
      if (!event.issueId) continue;
      const list = eventsByIssue.get(event.issueId) || [];
      list.push(event);
      eventsByIssue.set(event.issueId, list);
    }

    const now = Date.now();

    for (const issue of issueInput) {
      const issueEvents = eventsByIssue.get(issue.id) || [];
      
      let lastForwardAt = issue.createdAt ? new Date(issue.createdAt).getTime() : now;

      // Find the most recent forward transition
      for (const event of issueEvents) {
        if (!event.fromStatus || !event.toStatus) continue;
        const transition = `${event.fromStatus}->${event.toStatus}`;
        if (FORWARD_TRANSITIONS.has(transition)) {
          lastForwardAt = event.createdAt ? new Date(event.createdAt).getTime() : now;
          break; // Stop at the most recent one since we ordered by desc
        }
      }

      const diffMs = now - lastForwardAt;
      const inactionDays = Math.max(0, Math.floor(diffMs / 86_400_000));
      
      result.set(issue.id, {
        tier: this.computeTier(inactionDays),
        inactionDays,
      });
    }

    return result;
  },

  /**
   * Computes which wards qualify as "Neglect Zones" (5+ T2+ issues).
   */
  async computeNeglectZones(enrichedIssues: { wardId: string | null; tier: number }[]): Promise<{ wardIds: string[]; wardNames: Record<string, string> }> {
    const t2CountsByWard = new Map<string, number>();

    for (const issue of enrichedIssues) {
      if (issue.wardId && issue.tier >= 2) {
        t2CountsByWard.set(issue.wardId, (t2CountsByWard.get(issue.wardId) || 0) + 1);
      }
    }

    const neglectWardIds = Array.from(t2CountsByWard.entries())
      .filter(([, count]) => count >= 5)
      .map(([wardId]) => wardId);

    const result = { wardIds: neglectWardIds, wardNames: {} as Record<string, string> };
    
    // In a real scenario we'd fetch names from the DB, but for now we'll do a quick map
    if (neglectWardIds.length > 0) {
        const wardRows = await db.select({ id: wards.id, name: wards.name }).from(wards).where(inArray(wards.id, neglectWardIds));
        for(const row of wardRows) {
            result.wardNames[row.id] = row.name;
        }
    }

    return result;
  }
};
