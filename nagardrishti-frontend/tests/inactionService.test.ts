import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inactionService } from '../server/services/inactionService.js';
import { db } from '../server/db/index.js';

// Mock the db with a chainable and awaitable proxy that supports .where(...).orderBy(...)
const { chain, rawWhere, rawOrderBy, rawLimit, rawValues, rawSet } = vi.hoisted(() => {
  function attachChaining(target: any, c: any) {
    if (target && target !== c && (typeof target === 'object' || typeof target === 'function')) {
      target.select = (...args: any[]) => c.select(...args);
      target.from = (...args: any[]) => c.from(...args);
      target.where = (...args: any[]) => c.where(...args);
      target.orderBy = (...args: any[]) => c.orderBy(...args);
      target.limit = (...args: any[]) => c.limit(...args);
      target.offset = (...args: any[]) => c.offset(...args);
      target.update = (...args: any[]) => c.update(...args);
      target.set = (...args: any[]) => c.set(...args);
      target.insert = (...args: any[]) => c.insert(...args);
      target.values = (...args: any[]) => c.values(...args);
    }
    return target;
  }

  const rawWhere = vi.fn();
  const rawOrderBy = vi.fn();
  const rawLimit = vi.fn();
  const rawValues = vi.fn();
  const rawSet = vi.fn();

  const c: any = {};
  c.select = vi.fn().mockReturnValue(c);
  c.from = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);

  c.where = new Proxy(rawWhere, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

  c.orderBy = new Proxy(rawOrderBy, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

  c.limit = new Proxy(rawLimit, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

  c.values = new Proxy(rawValues, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

  c.set = new Proxy(rawSet, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? c, c);
    },
  });

  return { chain: c, rawWhere, rawOrderBy, rawLimit, rawValues, rawSet };
});

vi.mock('../server/db/index.js', () => ({
  db: chain,
}));

describe('inactionService', () => {
  beforeEach(() => {
    rawWhere.mockReset();
    rawOrderBy.mockReset();
    rawLimit.mockReset();
    rawValues.mockReset();
    rawSet.mockReset();

    chain.select.mockReturnValue(chain);
    chain.from.mockReturnValue(chain);
    chain.update.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);

    rawWhere.mockResolvedValue([]);
    rawOrderBy.mockResolvedValue([]);
    rawLimit.mockResolvedValue([]);
    rawValues.mockResolvedValue([]);
    rawSet.mockReturnValue(chain);
  });

  describe('computeTier', () => {
    it('returns T0 for <= 3 days', () => {
      expect(inactionService.computeTier(0)).toBe(0);
      expect(inactionService.computeTier(3)).toBe(0);
    });

    it('returns T1 for 4-7 days', () => {
      expect(inactionService.computeTier(4)).toBe(1);
      expect(inactionService.computeTier(7)).toBe(1);
    });

    it('returns T2 for 8-14 days', () => {
      expect(inactionService.computeTier(8)).toBe(2);
      expect(inactionService.computeTier(14)).toBe(2);
    });

    it('returns T3 for 15-30 days', () => {
      expect(inactionService.computeTier(15)).toBe(3);
      expect(inactionService.computeTier(30)).toBe(3);
    });

    it('returns T4 for 31+ days', () => {
      expect(inactionService.computeTier(31)).toBe(4);
      expect(inactionService.computeTier(100)).toBe(4);
    });
  });

  describe('batchComputeTiers', () => {
    it('computes tiers correctly from status events', async () => {
      const now = Date.now();
      
      const issueInput = [
        { id: 'iss-1', createdAt: new Date(now - 40 * 86_400_000) }, // 40 days old
        { id: 'iss-2', createdAt: new Date(now - 10 * 86_400_000) }, // 10 days old
        { id: 'iss-3', createdAt: new Date(now - 10 * 86_400_000) }, // 10 days old, but recent action
      ];

      (db as any).orderBy.mockResolvedValue([
        // iss-1: no forward transitions, so it should be based on createdAt (40 days = T4)
        { issueId: 'iss-1', fromStatus: 'Open', toStatus: 'Open', createdAt: new Date(now - 35 * 86_400_000) }, // Lateral

        // iss-2: last forward transition was 10 days ago -> T2
        { issueId: 'iss-2', fromStatus: 'Open', toStatus: 'Triaged', createdAt: new Date(now - 10 * 86_400_000) },

        // iss-3: last forward transition was 2 days ago -> T0
        { issueId: 'iss-3', fromStatus: 'Triaged', toStatus: 'Assigned', createdAt: new Date(now - 2 * 86_400_000) },
        { issueId: 'iss-3', fromStatus: 'Open', toStatus: 'Triaged', createdAt: new Date(now - 10 * 86_400_000) },
      ]);

      const result = await inactionService.batchComputeTiers(issueInput);

      expect(result.get('iss-1')?.tier).toBe(4);
      expect(result.get('iss-1')?.inactionDays).toBe(40);

      expect(result.get('iss-2')?.tier).toBe(2);
      expect(result.get('iss-2')?.inactionDays).toBe(10);

      expect(result.get('iss-3')?.tier).toBe(0);
      expect(result.get('iss-3')?.inactionDays).toBe(2);
    });

    it('does not reset clock for non-forward transitions', async () => {
      const now = Date.now();
      const issueInput = [{ id: 'iss-1', createdAt: new Date(now - 20 * 86_400_000) }];
      
      (db as any).orderBy.mockResolvedValue([
        // Lateral reassignment — should NOT reset the clock
        { issueId: 'iss-1', fromStatus: 'Assigned', toStatus: 'Assigned', createdAt: new Date(now - 1 * 86_400_000) },
        // Last real forward transition 20 days ago -> T3
        { issueId: 'iss-1', fromStatus: 'Triaged', toStatus: 'Assigned', createdAt: new Date(now - 20 * 86_400_000) },
      ]);

      const result = await inactionService.batchComputeTiers(issueInput);
      
      expect(result.get('iss-1')?.tier).toBe(3);
      expect(result.get('iss-1')?.inactionDays).toBe(20);
    });

    it('returns T0 for empty issue list', async () => {
      const result = await inactionService.batchComputeTiers([]);
      expect(result.size).toBe(0);
    });
  });

  describe('computeNeglectZones', () => {
    it('returns ward IDs that have 5 or more T2+ issues', async () => {
      (db as any).where.mockResolvedValue([
        { id: 'ward-11', name: 'Kothrud' }
      ]);

      const enrichedIssues = [
        // Ward 11 has 5 T2+ issues
        { wardId: 'ward-11', tier: 2 },
        { wardId: 'ward-11', tier: 3 },
        { wardId: 'ward-11', tier: 4 },
        { wardId: 'ward-11', tier: 2 },
        { wardId: 'ward-11', tier: 2 },
        { wardId: 'ward-11', tier: 1 }, // T1 — should NOT count
        // Ward 12 has 4 T2+ issues (below threshold)
        { wardId: 'ward-12', tier: 2 },
        { wardId: 'ward-12', tier: 3 },
        { wardId: 'ward-12', tier: 4 },
        { wardId: 'ward-12', tier: 2 },
      ];

      const result = await inactionService.computeNeglectZones(enrichedIssues);

      expect(result.wardIds).toContain('ward-11');
      expect(result.wardIds).not.toContain('ward-12');
      expect(result.wardNames['ward-11']).toBe('Kothrud');
    });

    it('returns empty results for no T2+ issues', async () => {
      (db as any).where.mockResolvedValue([]);
      const enrichedIssues = [
        { wardId: 'ward-11', tier: 1 },
        { wardId: 'ward-12', tier: 0 },
      ];
      const result = await inactionService.computeNeglectZones(enrichedIssues);
      expect(result.wardIds).toHaveLength(0);
    });

    it('does not count null wardId issues', async () => {
      (db as any).where.mockResolvedValue([]);
      const enrichedIssues = [
        { wardId: null, tier: 4 },
        { wardId: null, tier: 3 },
        { wardId: null, tier: 2 },
        { wardId: null, tier: 2 },
        { wardId: null, tier: 2 },
      ];
      const result = await inactionService.computeNeglectZones(enrichedIssues);
      expect(result.wardIds).toHaveLength(0);
    });
  });
});
