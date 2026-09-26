import { createHash } from 'crypto';
import { db } from '../db/index.js';
import { statusEvents } from '../db/schema.js';
import { desc, asc, eq } from 'drizzle-orm';

export const auditService = {
  /**
   * Compute SHA-256 hash for a status event (tamper-evident chain).
   * Hash = SHA-256(prevHash | issueId | toStatus | actorId | timestamp)
   */
  computeEventHash(
    prevHash: string,
    issueId: string,
    toStatus: string,
    actorId: string,
    timestamp: Date
  ): string {
    const payload = `${prevHash}|${issueId}|${toStatus}|${actorId}|${timestamp.toISOString()}`;
    return createHash('sha256').update(payload).digest('hex');
  },

  /**
   * Append a new status event to the hash-chained audit ledger.
   * Gets the last event's hash, computes the new hash, and inserts.
   */
  async appendStatusEvent(data: {
    issueId: string;
    fromStatus?: string | null;
    toStatus: string;
    actorId: string;
    actorRole: string;
    reason?: string;
  }) {
    // Get previous event hash for this issue
    const lastEvents = await db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.issueId, data.issueId))
      .orderBy(desc(statusEvents.sequenceNum))
      .limit(1);

    const prevHash = lastEvents.length > 0
      ? lastEvents[0].eventHash
      : 'GENESIS';

    const timestamp = new Date();
    const eventHash = this.computeEventHash(
      prevHash,
      data.issueId,
      data.toStatus,
      data.actorId,
      timestamp
    );

    const [newEvent] = await db
      .insert(statusEvents)
      .values({
        issueId: data.issueId,
        fromStatus: data.fromStatus ?? null,
        toStatus: data.toStatus,
        actorId: data.actorId,
        actorRole: data.actorRole,
        reason: data.reason,
        prevHash,
        eventHash,
        createdAt: timestamp,
      })
      .returning();

    return newEvent;
  },

  /**
   * Get all status events for an issue, ordered by sequence.
   */
  async getIssueTimeline(issueId: string) {
    return db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.issueId, issueId))
      .orderBy(asc(statusEvents.sequenceNum));
  },

  /**
   * Verify the entire hash chain integrity.
   * Walks through all events per issue and recomputes hashes.
   * If any hash doesn't match, the chain has been tampered with.
   */
  async verifyChainIntegrity(): Promise<{
    valid: boolean;
    totalEvents: number;
    brokenAt?: string;
    checkedAt: string;
  }> {
    const allEvents = await db
      .select()
      .from(statusEvents)
      .orderBy(asc(statusEvents.sequenceNum));

    // Group events by issueId
    const chains: Record<string, typeof allEvents> = {};
    for (const event of allEvents) {
      const key = event.issueId!;
      if (!chains[key]) chains[key] = [];
      chains[key].push(event);
    }

    let totalEvents = 0;

    for (const [, events] of Object.entries(chains)) {
      let expectedPrev = 'GENESIS';

      for (const event of events) {
        totalEvents++;

        // Check prev_hash linkage
        if (event.prevHash !== expectedPrev) {
          return {
            valid: false,
            totalEvents,
            brokenAt: event.id,
            checkedAt: new Date().toISOString(),
          };
        }

        // Recompute hash and verify
        const recomputed = this.computeEventHash(
          event.prevHash,
          event.issueId!,
          event.toStatus,
          event.actorId!,
          event.createdAt!
        );

        if (recomputed !== event.eventHash) {
          return {
            valid: false,
            totalEvents,
            brokenAt: event.id,
            checkedAt: new Date().toISOString(),
          };
        }

        expectedPrev = event.eventHash;
      }
    }

    return {
      valid: true,
      totalEvents,
      checkedAt: new Date().toISOString(),
    };
  },
};
