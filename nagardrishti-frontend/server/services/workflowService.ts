import { db } from '../db/index.js';
import { adversarialFlags, issues, statusEvents } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { auditService } from './auditService.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ═══════════════════════════════════════════════════════
// VALID STATUS TRANSITIONS (backend-enforced)
// ═══════════════════════════════════════════════════════
const VALID_TRANSITIONS: Record<string, string[]> = {
  'Open':              ['Triaged'],
  'Triaged':           ['Assigned'],
  'Assigned':          ['In Progress'],
  'In Progress':       ['Claimed Resolved'],
  'Claimed Resolved':  ['Verified Fixed', 'Reopened'],
  'Verified Fixed':    [], // Terminal state
  'Reopened':          ['Triaged', 'Assigned', 'In Progress'],
};

// WHO CAN TRIGGER EACH TARGET STATUS
const TRANSITION_ROLES: Record<string, string[]> = {
  'Triaged':           ['officer', 'admin'],
  'Assigned':          ['officer', 'admin'],
  'In Progress':       ['officer'],
  'Claimed Resolved':  ['officer'],
  'Verified Fixed':    ['system'],  // ONLY by citizen verification vote threshold
  'Reopened':          ['system'],  // ONLY by 2+ "not fixed" votes
};

export const workflowService = {
  /**
   * Transition an issue's status with full validation.
   * - Validates the transition is allowed from current status
   * - Validates the actor's role is permitted for this transition
   * - Enforces proof requirement for "Claimed Resolved"
   * - Enforces system-only transitions for "Verified Fixed" and "Reopened"
   * - Creates audit ledger entry
   * - Updates issue status
   */
  async transitionStatus(
    issueIdOrRef: string,
    toStatus: string,
    actorId: string,
    actorRole: string,
    reason?: string
  ) {
    return db.transaction(async (tx) => {
      const trimmed = issueIdOrRef.trim();
      const [issue] = await tx
        .select()
        .from(issues)
        .where(UUID_RE.test(trimmed) ? eq(issues.id, trimmed) : eq(issues.publicRef, trimmed))
        .for('update');

      if (!issue) {
        throw new Error('Issue not found');
      }

      const fromStatus = issue.status;

      // 1. Validate transition is allowed
      const allowed = VALID_TRANSITIONS[fromStatus];
      if (!allowed || !allowed.includes(toStatus)) {
        throw new Error(
          `Invalid status transition: "${fromStatus}" -> "${toStatus}". ` +
          `Allowed: [${allowed?.join(', ') || 'none'}]`
        );
      }

      // 2. Validate role is authorized
      const allowedRoles = TRANSITION_ROLES[toStatus];
      if (!allowedRoles || !allowedRoles.includes(actorRole)) {
        throw new Error(
          `Role "${actorRole}" is not authorized to transition to "${toStatus}". ` +
          `Allowed roles: [${allowedRoles?.join(', ') || 'none'}]`
        );
      }

      // 3. Special rule: valid submitted or accepted proof required for "Claimed Resolved"
      if (
        toStatus === 'Claimed Resolved' &&
        issue.proofState !== 'submitted' &&
        issue.proofState !== 'accepted'
      ) {
        throw new Error(
          'Cannot transition to "Claimed Resolved" without valid submitted or accepted proof. ' +
          'Upload proof-of-fix evidence first.'
        );
      }

      // 4. Adversarial check for Verified Fixed (read within transaction)
      if (toStatus === 'Verified Fixed') {
        const activeFlags = await tx
          .select()
          .from(adversarialFlags)
          .where(eq(adversarialFlags.issueId, issue.id));
        const highFlags = activeFlags.filter((f) => f.severity === 'high' && !f.resolvedAt);
        if (highFlags.length > 0) {
          throw new Error(
            `Cannot advance to "Verified Fixed": ${highFlags.length} high-severity adversarial flag(s) are active. ` +
            `Admin must review flags first.`
          );
        }
      }

      // 5. Append to audit ledger inside the same transaction so prevHash cannot fork concurrently
      const lastEvents = await tx
        .select()
        .from(statusEvents)
        .where(eq(statusEvents.issueId, issue.id))
        .orderBy(desc(statusEvents.sequenceNum))
        .limit(1);

      const prevHash = lastEvents.length > 0 ? lastEvents[0].eventHash : 'GENESIS';
      const timestamp = new Date();
      const eventHash = auditService.computeEventHash(
        prevHash,
        issue.id,
        toStatus,
        actorId,
        timestamp
      );

      await tx.insert(statusEvents).values({
        issueId: issue.id,
        fromStatus,
        toStatus,
        actorId,
        actorRole,
        reason,
        prevHash,
        eventHash,
        createdAt: timestamp,
      });

      // 6. Update issue status
      const updateData: {
        status: string;
        updatedAt: Date;
        reopenCount?: number;
      } = {
        status: toStatus,
        updatedAt: new Date(),
      };

      // Track reopen count
      if (toStatus === 'Reopened') {
        updateData.reopenCount = (issue.reopenCount ?? 0) + 1;
      }

      const [updated] = await tx
        .update(issues)
        .set(updateData)
        .where(eq(issues.id, issue.id))
        .returning();

      return updated;
    });
  },

  /**
   * Check if a transition is valid without executing it.
   */
  canTransition(fromStatus: string, toStatus: string, role: string): boolean {
    const allowed = VALID_TRANSITIONS[fromStatus];
    if (!allowed || !allowed.includes(toStatus)) return false;
    const allowedRoles = TRANSITION_ROLES[toStatus];
    if (!allowedRoles || !allowedRoles.includes(role)) return false;
    return true;
  },

  /**
   * Get all valid next statuses for a given status and role.
   */
  getAvailableTransitions(fromStatus: string, role: string): string[] {
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    return allowed.filter((toStatus) => {
      const allowedRoles = TRANSITION_ROLES[toStatus];
      return allowedRoles && allowedRoles.includes(role);
    });
  },
};
