import { db } from '../db/index.js';
import { verificationVotes, issues } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { workflowService } from './workflowService.js';

const REOPEN_THRESHOLD = 2;     // 2+ "not_fixed" votes → auto-reopen
const VERIFY_MIN_VOTES = 3;     // Need at least 3 total votes to auto-verify

export const verificationService = {
  /**
   * Cast a citizen verification vote on a claimed-resolved issue.
   * Validates: issue is Claimed Resolved, one vote per user per proof version.
   * After voting, checks thresholds for auto-reopen or auto-verify.
   */
  async castVote(
    issueId: string,
    userId: string,
    vote: 'fixed' | 'not_fixed' | 'unsure',
    proofVersion: number = 1
  ) {
    // 1. Validate issue exists and is in correct state
    const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));
    if (!issue) throw new Error('Issue not found');
    if (issue.status !== 'Claimed Resolved') {
      throw new Error('Can only verify issues in "Claimed Resolved" state');
    }

    // 2. Check for existing vote (one per user per proof version)
    const existing = await db
      .select()
      .from(verificationVotes)
      .where(
        and(
          eq(verificationVotes.issueId, issueId),
          eq(verificationVotes.userId, userId),
          eq(verificationVotes.proofVersion, proofVersion)
        )
      );

    if (existing.length > 0) {
      throw new Error('You have already voted on this proof submission');
    }

    // 3. Insert vote
    const [newVote] = await db
      .insert(verificationVotes)
      .values({
        issueId,
        userId,
        vote,
        proofVersion,
      })
      .returning();

    // 4. Check thresholds for auto-transitions
    await this.checkThresholds(issueId);

    return newVote;
  },

  /**
   * Check vote thresholds and trigger auto-transitions.
   * - 2+ "not_fixed" → auto-reopen (system actor)
   * - Majority "fixed" with 3+ total → auto-verify (system actor)
   */
  async checkThresholds(issueId: string) {
    const summary = await this.getVoteSummary(issueId);

    // Auto-REOPEN: 2+ citizens voted "not fixed"
    if (summary.notFixed >= REOPEN_THRESHOLD) {
      await workflowService.transitionStatus(
        issueId,
        'Reopened',
        'SYSTEM',
        'system',
        `Reopened: ${summary.notFixed} citizen(s) voted "not fixed"`
      );
      return;
    }

    // Auto-VERIFY: majority "fixed" with enough votes
    if (
      summary.total >= VERIFY_MIN_VOTES &&
      summary.fixed > summary.total / 2
    ) {
      await workflowService.transitionStatus(
        issueId,
        'Verified Fixed',
        'SYSTEM',
        'system',
        `Verified: ${summary.fixed}/${summary.total} citizen(s) voted "fixed"`
      );
    }
  },

  /**
   * Get vote summary for an issue.
   */
  async getVoteSummary(issueId: string) {
    const votes = await db
      .select()
      .from(verificationVotes)
      .where(eq(verificationVotes.issueId, issueId));

    return {
      fixed: votes.filter((v) => v.vote === 'fixed').length,
      notFixed: votes.filter((v) => v.vote === 'not_fixed').length,
      unsure: votes.filter((v) => v.vote === 'unsure').length,
      total: votes.length,
    };
  },
};
