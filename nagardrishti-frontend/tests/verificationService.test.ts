import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, auditMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  auditMock: {
    appendStatusEvent: vi.fn(async () => ({ id: 'event-reopen' })),
  },
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ kind: 'eq', column, value }),
    and: (...conditions: unknown[]) => ({ kind: 'and', conditions }),
  };
});

vi.mock('../server/db/index.js', () => ({ db: dbMock }));
vi.mock('../server/services/auditService.js', () => ({ auditService: auditMock }));

import { verificationService } from '../server/services/verificationService.js';
import { issues, verificationVotes } from '../server/db/schema.js';

const ISSUE_ID = 'c64e0416-c17e-4784-a893-358adf811760';
let issueState: { id: string; status: string; reopenCount: number; proofState: string };
let votes: Array<{ id: string; issueId: string; userId: string; vote: string; proofVersion: number }>;

function matches(condition: any, row: Record<string, unknown>): boolean {
  if (!condition) return true;
  if (condition.kind === 'and') return condition.conditions.every((item: unknown) => matches(item, row));
  if (condition.kind !== 'eq') return false;
  if (condition.column === issues.id) return row.id === condition.value;
  if (condition.column === issues.publicRef) return row.publicRef === condition.value;
  if (condition.column === verificationVotes.issueId) return row.issueId === condition.value;
  if (condition.column === verificationVotes.userId) return row.userId === condition.value;
  if (condition.column === verificationVotes.proofVersion) return row.proofVersion === condition.value;
  return false;
}

describe('verification voting reopen threshold', () => {
  beforeEach(() => {
    issueState = { id: ISSUE_ID, status: 'Claimed Resolved', reopenCount: 0, proofState: 'submitted' };
    votes = [];
    auditMock.appendStatusEvent.mockClear();

    dbMock.select.mockImplementation(() => {
      let table: unknown;
      const query: any = {
        from(source: unknown) {
          table = source;
          return query;
        },
        where: async (condition: unknown) => {
          if (table === issues) return matches(condition, issueState) ? [{ ...issueState }] : [];
          if (table === verificationVotes) return votes.filter((vote) => matches(condition, vote)).map((vote) => ({ ...vote }));
          return [];
        },
        orderBy() { return query; },
        limit() { return query; },
      };
      return query;
    });

    dbMock.insert.mockImplementation(() => {
      let values: Record<string, unknown>;
      const query: any = {
        values(input: Record<string, unknown>) {
          values = input;
          return query;
        },
        returning: async () => {
          const row = { id: `vote-${votes.length + 1}`, ...values } as typeof votes[number];
          votes.push(row);
          return [{ ...row }];
        },
      };
      return query;
    });

    dbMock.update.mockImplementation((table: unknown) => {
      let values: Record<string, unknown>;
      let condition: unknown;
      const query: any = {
        set(input: Record<string, unknown>) {
          values = input;
          return query;
        },
        where(input: unknown) {
          condition = input;
          return query;
        },
        returning: async () => {
          if (table === issues && matches(condition, issueState)) Object.assign(issueState, values);
          return [{ ...issueState }];
        },
      };
      return query;
    });
  });

  it('reopens after two not_fixed votes from different users and increments reopenCount', async () => {
    await verificationService.castVote(ISSUE_ID, 'citizen-1', 'not_fixed');
    await verificationService.castVote(ISSUE_ID, 'citizen-2', 'not_fixed');

    expect(issueState).toMatchObject({ status: 'Reopened', reopenCount: 1 });
    expect(auditMock.appendStatusEvent).toHaveBeenCalledWith(expect.objectContaining({
      fromStatus: 'Claimed Resolved',
      toStatus: 'Reopened',
      actorRole: 'system',
    }));
  });

  it('does not reopen after only one not_fixed vote', async () => {
    await verificationService.castVote(ISSUE_ID, 'citizen-1', 'not_fixed');

    expect(issueState).toMatchObject({ status: 'Claimed Resolved', reopenCount: 0 });
    expect(auditMock.appendStatusEvent).not.toHaveBeenCalled();
  });

  it('rejects a duplicate vote by the same user for the same proof version', async () => {
    await verificationService.castVote(ISSUE_ID, 'citizen-1', 'not_fixed');

    await expect(verificationService.castVote(ISSUE_ID, 'citizen-1', 'not_fixed'))
      .rejects.toThrow('You have already voted on this proof submission');
    expect(votes).toHaveLength(1);
    expect(issueState.status).toBe('Claimed Resolved');
  });

  it('reopens when two users vote not_fixed even after a third user votes fixed', async () => {
    await verificationService.castVote(ISSUE_ID, 'citizen-fixed', 'fixed');
    await verificationService.castVote(ISSUE_ID, 'citizen-not-fixed-1', 'not_fixed');
    await verificationService.castVote(ISSUE_ID, 'citizen-not-fixed-2', 'not_fixed');

    expect(issueState).toMatchObject({ status: 'Reopened', reopenCount: 1 });
    expect(votes.map((vote) => vote.userId)).toEqual([
      'citizen-fixed', 'citizen-not-fixed-1', 'citizen-not-fixed-2',
    ]);
  });
});
