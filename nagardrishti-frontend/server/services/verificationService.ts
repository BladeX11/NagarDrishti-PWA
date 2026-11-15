import { db } from '../db/index.js';
import { verificationVotes, issues } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { workflowService } from './workflowService.js';

const REOPEN_THRESHOLD = 2;     // 2+ "not_fixed" votes -> auto-reopen
const VERIFY_MIN_VOTES = 3;     // Need at least 3 total votes to auto-verify
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_VOTES = new Set(['fixed', 'not_fixed', 'unsure']);

async function resolveIssueForVerification(issueIdOrRef: string) {
  const trimmed = issueIdOrRef.trim();
  if (!trimmed) return null;
  const [issue] = await db
    .select({
      id: issues.id,
      status: issues.status,
      reopenCount: issues.reopenCount,
    })
    .from(issues)
    .where(UUID_RE.test(trimmed) ? eq(issues.id, trimmed) : eq(issues.publicRef, trimmed))
    .limit(1);
  return issue ?? null;
}

export const verificationService = {
  /**
   * Cast a citizen verification vote on a claimed-resolved issue.
   * Validates: issue is Claimed Resolved, one vote per user per proof version.
   * After voting, checks thresholds for auto-reopen or auto-verify.
   */
  async castVote(
    issueIdOrRef: string,
    userId: string,
    vote: 'fixed' | 'not_fixed' | 'unsure',
    proofVersion?: number
  ) {
    if (!VALID_VOTES.has(vote)) {
      throw new Error('Vote must be one of: fixed, not_fixed, unsure');
    }

    // 1. Validate issue exists and is in correct state
    const issue = await resolveIssueForVerification(issueIdOrRef);
    if (!issue) throw new Error('Issue not found');
    if (issue.status !== 'Claimed Resolved') {
      throw new Error('Can only verify issues in "Claimed Resolved" state');
    }

    const resolvedIssueId = issue.id;
    const currentCycle = (issue.reopenCount ?? 0) + 1;
    const activeProofVersion =
      typeof proofVersion === 'number' && Number.isInteger(proofVersion) && proofVersion >= currentCycle
        ? proofVersion
        : currentCycle;

    // 2. Check for existing vote (one per user per proof version)
    const existing = await db
      .select()
      .from(verificationVotes)
      .where(
        and(
          eq(verificationVotes.issueId, resolvedIssueId),
          eq(verificationVotes.userId, userId),
          eq(verificationVotes.proofVersion, activeProofVersion)
        )
      );

    if (existing.length > 0) {
      throw new Error('You have already voted on this proof submission');
    }

    // 3. Insert vote
    const [newVote] = await db
      .insert(verificationVotes)
      .values({
        issueId: resolvedIssueId,
        userId,
        vote,
        proofVersion: activeProofVersion,
      })
      .returning();

    // 4. Check thresholds for auto-transitions scoped to this proof cycle
    await this.checkThresholds(resolvedIssueId, activeProofVersion);

    return newVote;
  },

  /**
   * Check vote thresholds and trigger auto-transitions for the active proof cycle.
   * - 2+ "not_fixed" -> auto-reopen (system actor)
   * - Majority "fixed" with 3+ total -> auto-verify (system actor)
   */
  async checkThresholds(issueIdOrRef: string, proofVersion?: number) {
    const issue = await resolveIssueForVerification(issueIdOrRef);
    if (!issue) throw new Error('Issue not found');

    const targetVersion =
      typeof proofVersion === 'number' && Number.isInteger(proofVersion) && proofVersion >= 1
        ? proofVersion
        : (issue.reopenCount ?? 0) + 1;

    const summary = await this.getVoteSummary(issue.id, targetVersion);

    // Auto-REOPEN: 2+ citizens voted "not fixed"
    if (summary.notFixed >= REOPEN_THRESHOLD) {
      await workflowService.transitionStatus(
        issue.id,
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
        issue.id,
        'Verified Fixed',
        'SYSTEM',
        'system',
        `Verified: ${summary.fixed}/${summary.total} citizen(s) voted "fixed"`
      );
    }
  },

  /**
   * Get vote summary for an issue scoped to the active (or specified) proof cycle.
   */
  async getVoteSummary(issueIdOrRef: string, proofVersion?: number) {
    const issue = await resolveIssueForVerification(issueIdOrRef);
    if (!issue) throw new Error('Issue not found');

    const targetVersion =
      typeof proofVersion === 'number' && Number.isInteger(proofVersion) && proofVersion >= 1
        ? proofVersion
        : (issue.reopenCount ?? 0) + 1;

    const allVotes = await db
      .select()
      .from(verificationVotes)
      .where(eq(verificationVotes.issueId, issue.id));

    const votes = allVotes.filter((v) => (v.proofVersion ?? 1) === targetVersion);

    return {
      fixed: votes.filter((v) => v.vote === 'fixed').length,
      notFixed: votes.filter((v) => v.vote === 'not_fixed').length,
      unsure: votes.filter((v) => v.vote === 'unsure').length,
      total: votes.length,
      proofVersion: targetVersion,
    };
  },
};
