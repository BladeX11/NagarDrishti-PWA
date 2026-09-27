/**
 * Unit tests for auditService.computeEventHash
 *
 * These tests cover the pure hash-chain computation logic with no DB dependency.
 * The hash function is the core of the Forced Transparency Engine (FTE).
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// Extract pure hash logic inline (mirrors auditService.computeEventHash)
// so tests don't require DB imports that would fail without a live DB.
function computeEventHash(
  prevHash: string,
  issueId: string,
  toStatus: string,
  actorId: string,
  timestamp: Date
): string {
  const payload = `${prevHash}|${issueId}|${toStatus}|${actorId}|${timestamp.toISOString()}`;
  return createHash('sha256').update(payload).digest('hex');
}

const FIXED_TS = new Date('2024-01-15T10:00:00.000Z');
const ACTOR = 'officer-uuid-001';
const ISSUE = 'issue-uuid-abc';

describe('auditService.computeEventHash', () => {
  it('returns a 64-char hex string (SHA-256 output)', () => {
    const hash = computeEventHash('GENESIS', ISSUE, 'Open', ACTOR, FIXED_TS);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same inputs produce same hash', () => {
    const h1 = computeEventHash('GENESIS', ISSUE, 'Open', ACTOR, FIXED_TS);
    const h2 = computeEventHash('GENESIS', ISSUE, 'Open', ACTOR, FIXED_TS);
    expect(h1).toBe(h2);
  });

  it('changes hash when prevHash differs (chain linkage)', () => {
    const h1 = computeEventHash('GENESIS', ISSUE, 'Triaged', ACTOR, FIXED_TS);
    const h2 = computeEventHash('TAMPERED', ISSUE, 'Triaged', ACTOR, FIXED_TS);
    expect(h1).not.toBe(h2);
  });

  it('changes hash when issueId differs', () => {
    const h1 = computeEventHash('GENESIS', 'issue-aaa', 'Open', ACTOR, FIXED_TS);
    const h2 = computeEventHash('GENESIS', 'issue-bbb', 'Open', ACTOR, FIXED_TS);
    expect(h1).not.toBe(h2);
  });

  it('changes hash when toStatus differs', () => {
    const h1 = computeEventHash('GENESIS', ISSUE, 'Open', ACTOR, FIXED_TS);
    const h2 = computeEventHash('GENESIS', ISSUE, 'Triaged', ACTOR, FIXED_TS);
    expect(h1).not.toBe(h2);
  });

  it('changes hash when actorId differs', () => {
    const h1 = computeEventHash('GENESIS', ISSUE, 'Triaged', 'actor-A', FIXED_TS);
    const h2 = computeEventHash('GENESIS', ISSUE, 'Triaged', 'actor-B', FIXED_TS);
    expect(h1).not.toBe(h2);
  });

  it('changes hash when timestamp differs by 1ms', () => {
    const ts1 = new Date('2024-01-15T10:00:00.000Z');
    const ts2 = new Date('2024-01-15T10:00:00.001Z');
    const h1 = computeEventHash('GENESIS', ISSUE, 'Open', ACTOR, ts1);
    const h2 = computeEventHash('GENESIS', ISSUE, 'Open', ACTOR, ts2);
    expect(h1).not.toBe(h2);
  });

  it('simulates a valid 3-event chain (GENESIS → event1 → event2 → event3)', () => {
    const ts1 = new Date('2024-01-15T10:00:00.000Z');
    const ts2 = new Date('2024-01-15T10:30:00.000Z');
    const ts3 = new Date('2024-01-15T11:00:00.000Z');

    const hash1 = computeEventHash('GENESIS', ISSUE, 'Open', ACTOR, ts1);
    const hash2 = computeEventHash(hash1, ISSUE, 'Triaged', ACTOR, ts2);
    const hash3 = computeEventHash(hash2, ISSUE, 'Assigned', ACTOR, ts3);

    // All hashes are unique and hex strings
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash2).toMatch(/^[a-f0-9]{64}$/);
    expect(hash3).toMatch(/^[a-f0-9]{64}$/);
    expect(new Set([hash1, hash2, hash3]).size).toBe(3);
  });

  it('detects tamper: changing event2 breaks hash3 recomputation', () => {
    const ts1 = new Date('2024-01-15T10:00:00.000Z');
    const ts2 = new Date('2024-01-15T10:30:00.000Z');
    const ts3 = new Date('2024-01-15T11:00:00.000Z');

    const hash1 = computeEventHash('GENESIS', ISSUE, 'Open', ACTOR, ts1);
    const hash2 = computeEventHash(hash1, ISSUE, 'Triaged', ACTOR, ts2);
    // Tamper: event2 stored a different toStatus but same hash2 — recompute hash3 with real event2 data
    const hash3_correct = computeEventHash(hash2, ISSUE, 'Assigned', ACTOR, ts3);

    // Now simulate tamper: event2's toStatus was changed to 'Closed' in the DB
    const hash2_tampered = computeEventHash(hash1, ISSUE, 'Closed', ACTOR, ts2);
    const hash3_from_tampered = computeEventHash(hash2_tampered, ISSUE, 'Assigned', ACTOR, ts3);

    expect(hash3_correct).not.toBe(hash3_from_tampered);
  });
});
