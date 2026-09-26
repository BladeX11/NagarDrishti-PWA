import { db } from '../db/index.js';
import { issues } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { auditService } from './auditService.js';

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
    issueId: string,
    toStatus: string,
    actorId: string,
    actorRole: string,
    reason?: string
  ) {
    const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));
    if (!issue) {
      throw new Error('Issue not found');
    }

    const fromStatus = issue.status;

    // 1. Validate transition is allowed
    const allowed = VALID_TRANSITIONS[fromStatus];
    if (!allowed || !allowed.includes(toStatus)) {
      throw new Error(
        `Invalid status transition: "${fromStatus}" → "${toStatus}". ` +
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

    // 3. Special rule: proof required for "Claimed Resolved"
    if (toStatus === 'Claimed Resolved' && issue.proofState === 'none') {
      throw new Error(
        'Cannot transition to "Claimed Resolved" without submitting proof. ' +
        'Upload proof-of-fix evidence first.'
      );
    }

    // 4. Append to audit ledger (hash-chained)
    await auditService.appendStatusEvent({
      issueId,
      fromStatus,
      toStatus,
      actorId,
      actorRole,
      reason,
    });

    // 5. Update issue status
    const updateData: Record<string, unknown> = {
      status: toStatus,
      updatedAt: new Date(),
    };

    // Track reopen count
    if (toStatus === 'Reopened') {
      updateData.reopenCount = (issue.reopenCount ?? 0) + 1;
    }

    const [updated] = await db
      .update(issues)
      .set(updateData)
      .where(eq(issues.id, issueId))
      .returning();

    return updated;
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
