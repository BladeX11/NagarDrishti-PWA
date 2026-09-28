import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inactionService } from '../server/services/inactionService.js';
import { db } from '../server/db/index.js';

// Mock the db with a stable chain that survives vi.resetAllMocks()
vi.mock('../server/db/index.js', () => {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockResolvedValue([]);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockResolvedValue([]);
  return { db: chain };
});

describe('inactionService', () => {
  beforeEach(() => {
    // Only reset call counts — do NOT reset implementations
    vi.clearAllMocks();
    // Re-stub the terminal .orderBy and .where to return empty by default
    (db as any).orderBy.mockResolvedValue([]);
    (db as any).where.mockResolvedValue([]);
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
