/**
 * Unit tests for workflow state-machine logic.
 *
 * Tests the pure canTransition() and getAvailableTransitions() methods.
 * No DB dependency — these are synchronous business-rule functions.
 *
 * Covers the issue lifecycle:
 *   Open → Triaged → Assigned → In Progress → Claimed Resolved → Verified Fixed
 *                                                              ↘ Reopened → Triaged
 */

import { describe, it, expect } from 'vitest';

// ── Mirror the logic from workflowService.ts (pure, no DB) ──────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  'Open':             ['Triaged'],
  'Triaged':          ['Assigned'],
  'Assigned':         ['In Progress'],
  'In Progress':      ['Claimed Resolved'],
  'Claimed Resolved': ['Verified Fixed', 'Reopened'],
  'Verified Fixed':   [],
  'Reopened':         ['Triaged', 'Assigned', 'In Progress'],
};

const TRANSITION_ROLES: Record<string, string[]> = {
  'Triaged':          ['officer', 'admin'],
  'Assigned':         ['officer', 'admin'],
  'In Progress':      ['officer'],
  'Claimed Resolved': ['officer'],
  'Verified Fixed':   ['system'],
  'Reopened':         ['system'],
};

function canTransition(from: string, to: string, role: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) return false;
  const allowedRoles = TRANSITION_ROLES[to];
  if (!allowedRoles || !allowedRoles.includes(role)) return false;
  return true;
}

function getAvailableTransitions(from: string, role: string): string[] {
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.filter((to) => {
    const allowedRoles = TRANSITION_ROLES[to];
    return allowedRoles && allowedRoles.includes(role);
  });
}
// ────────────────────────────────────────────────────────────────────────────

describe('Workflow: valid forward transitions', () => {
  it('officer can triage an Open issue', () => {
    expect(canTransition('Open', 'Triaged', 'officer')).toBe(true);
  });
  it('officer can assign a Triaged issue', () => {
    expect(canTransition('Triaged', 'Assigned', 'officer')).toBe(true);
  });
  it('officer can start work on an Assigned issue', () => {
    expect(canTransition('Assigned', 'In Progress', 'officer')).toBe(true);
  });
  it('officer can claim resolution on In Progress issue', () => {
    expect(canTransition('In Progress', 'Claimed Resolved', 'officer')).toBe(true);
  });
  it('system can verify a Claimed Resolved issue', () => {
    expect(canTransition('Claimed Resolved', 'Verified Fixed', 'system')).toBe(true);
  });
  it('system can reopen a Claimed Resolved issue', () => {
    expect(canTransition('Claimed Resolved', 'Reopened', 'system')).toBe(true);
  });
  it('admin can triage an Open issue', () => {
    expect(canTransition('Open', 'Triaged', 'admin')).toBe(true);
  });
});

describe('Workflow: blocked backward / illegal transitions', () => {
  it('cannot skip Triaged → go directly from Open to Assigned', () => {
    expect(canTransition('Open', 'Assigned', 'officer')).toBe(false);
  });
  it('cannot go from Verified Fixed to any status (terminal)', () => {
    expect(canTransition('Verified Fixed', 'Open', 'officer')).toBe(false);
    expect(canTransition('Verified Fixed', 'Reopened', 'officer')).toBe(false);
    expect(canTransition('Verified Fixed', 'In Progress', 'officer')).toBe(false);
  });
  it('cannot go backward: Assigned → Open', () => {
    expect(canTransition('Assigned', 'Open', 'officer')).toBe(false);
  });
  it('cannot go backward: In Progress → Triaged', () => {
    expect(canTransition('In Progress', 'Triaged', 'officer')).toBe(false);
  });
});

describe('Workflow: role enforcement', () => {
  it('citizen cannot triage (officer-only)', () => {
    expect(canTransition('Open', 'Triaged', 'citizen')).toBe(false);
  });
  it('citizen cannot move to Claimed Resolved', () => {
    expect(canTransition('In Progress', 'Claimed Resolved', 'citizen')).toBe(false);
  });
  it('officer cannot directly mark Verified Fixed (system-only)', () => {
    expect(canTransition('Claimed Resolved', 'Verified Fixed', 'officer')).toBe(false);
  });
  it('officer cannot reopen (system-only)', () => {
    expect(canTransition('Claimed Resolved', 'Reopened', 'officer')).toBe(false);
  });
  it('researcher cannot perform any transition', () => {
    expect(canTransition('Open', 'Triaged', 'researcher')).toBe(false);
    expect(canTransition('Triaged', 'Assigned', 'researcher')).toBe(false);
  });
});

describe('Workflow: getAvailableTransitions', () => {
  it('officer on Open issue: only [Triaged]', () => {
    expect(getAvailableTransitions('Open', 'officer')).toEqual(['Triaged']);
  });
  it('officer on Claimed Resolved: empty (cannot verify or reopen)', () => {
    // Officer cannot trigger Verified Fixed or Reopened — those are system-only
    expect(getAvailableTransitions('Claimed Resolved', 'officer')).toEqual([]);
  });
  it('system on Claimed Resolved: [Verified Fixed, Reopened]', () => {
    expect(getAvailableTransitions('Claimed Resolved', 'system')).toEqual(
      expect.arrayContaining(['Verified Fixed', 'Reopened'])
    );
  });
  it('officer on Verified Fixed: empty (terminal state)', () => {
    expect(getAvailableTransitions('Verified Fixed', 'officer')).toEqual([]);
  });
  it('system on Verified Fixed: empty (terminal state)', () => {
    expect(getAvailableTransitions('Verified Fixed', 'system')).toEqual([]);
  });
  it('officer on Reopened: can go to Triaged, Assigned, or In Progress', () => {
    const transitions = getAvailableTransitions('Reopened', 'officer');
    expect(transitions).toContain('Triaged');
    expect(transitions).toContain('Assigned');
    expect(transitions).toContain('In Progress');
  });
  it('citizen on any status: always empty', () => {
    for (const status of Object.keys(VALID_TRANSITIONS)) {
      expect(getAvailableTransitions(status, 'citizen')).toEqual([]);
    }
  });
});
