import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  equityService,
  computeMedian,
  chiSquareSurvival,
  kruskalWallisTest,
} from '../server/services/equityService.js';

// Mock the db with a chainable and awaitable proxy supporting leftJoin, where, orderBy
const { chain, rawWhere, rawOrderBy, rawLimit, rawLeftJoin, rawFrom } = vi.hoisted(() => {
  function attachChaining(target: any, c: any) {
    if (target && target !== c && (typeof target === 'object' || typeof target === 'function')) {
      target.select = (...args: any[]) => c.select(...args);
      target.from = (...args: any[]) => c.from(...args);
      target.leftJoin = (...args: any[]) => c.leftJoin(...args);
      target.where = (...args: any[]) => c.where(...args);
      target.orderBy = (...args: any[]) => c.orderBy(...args);
      target.limit = (...args: any[]) => c.limit(...args);
    }
    return target;
  }

  const rawWhere = vi.fn();
  const rawOrderBy = vi.fn();
  const rawLimit = vi.fn();
  const rawLeftJoin = vi.fn();
  const rawFrom = vi.fn();

  const c: any = {};
  c.select = vi.fn().mockReturnValue(c);

  c.from = new Proxy(rawFrom, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? c, c);
    },
  });

  c.leftJoin = new Proxy(rawLeftJoin, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

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

  return { chain: c, rawWhere, rawOrderBy, rawLimit, rawLeftJoin, rawFrom };
});

vi.mock('../server/db/index.js', () => ({
  db: chain,
}));

describe('equityService', () => {
  beforeEach(() => {
    rawWhere.mockReset();
    rawOrderBy.mockReset();
    rawLimit.mockReset();
    rawLeftJoin.mockReset();
    rawFrom.mockReset();

    chain.select.mockReturnValue(chain);

    rawFrom.mockReturnValue(chain);
    rawLeftJoin.mockResolvedValue([]);
    rawWhere.mockResolvedValue([]);
    rawOrderBy.mockResolvedValue([]);
  });

  describe('computeMedian', () => {
    it('returns 0 for empty array', () => {
      expect(computeMedian([])).toBe(0);
    });

    it('returns element for single item', () => {
      expect(computeMedian([4.5])).toBe(4.5);
    });

    it('returns middle element for odd length', () => {
      expect(computeMedian([1, 5, 2])).toBe(2);
      expect(computeMedian([9, 1, 4, 7, 3])).toBe(4);
    });

    it('returns average of two middle elements for even length', () => {
      expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
      expect(computeMedian([10, 20])).toBe(15);
    });
  });

  describe('chiSquareSurvival', () => {
    it('returns 1.0 for x <= 0 or df <= 0', () => {
      expect(chiSquareSurvival(0, 1)).toBe(1.0);
      expect(chiSquareSurvival(-2, 2)).toBe(1.0);
      expect(chiSquareSurvival(5, 0)).toBe(1.0);
    });

    it('computes reasonable p-value for known values', () => {
      // Chi-square with df=1 at 3.84 is approximately p=0.05
      const p = chiSquareSurvival(3.841, 1);
      expect(p).toBeGreaterThan(0.04);
      expect(p).toBeLessThan(0.06);

      // Large chi-square has near 0 p-value
      expect(chiSquareSurvival(25, 2)).toBeLessThan(0.001);
    });
  });

  describe('kruskalWallisTest', () => {
    it('handles fewer than 2 active groups', () => {
      const res = kruskalWallisTest([{ label: 'planned', values: [1, 2, 3] }]);
      expect(res.significant).toBe(false);
      expect(res.note).toBe('Fewer than 2 groups with observations');
    });

    it('handles total observations < 3', () => {
      const res = kruskalWallisTest([
        { label: 'planned', values: [1] },
        { label: 'unplanned', values: [2] },
      ]);
      expect(res.significant).toBe(false);
      expect(res.note).toBe('Total observations too small for Kruskal-Wallis');
    });

    it('detects significant disparity between disparate groups', () => {
      const res = kruskalWallisTest([
        { label: 'planned', values: [1, 1.2, 1.5, 2.0] },
        { label: 'unplanned', values: [12.0, 14.5, 15.0, 18.2] },
      ]);
      expect(res.significant).toBe(true);
      expect(res.pValue).toBeLessThan(0.05);
      expect(res.underservedWardType).toBe('unplanned');
      expect(res.effectSizeDays).toBeGreaterThan(10);
    });

    it('handles ties correctly without crashing', () => {
      const res = kruskalWallisTest([
        { label: 'planned', values: [2, 2, 2, 2] },
        { label: 'unplanned', values: [2, 2, 2, 2] },
      ]);
      expect(res.significant).toBe(false);
      expect(res.hStatistic).toBe(0);
    });
  });

  describe('computeEquityMetrics', () => {
    it('returns empty result when no issues exist in database', async () => {
      rawLeftJoin.mockResolvedValueOnce([]);

      const result = await equityService.computeEquityMetrics();
      expect(result.totalIssuesAnalyzed).toBe(0);
      expect(result.categories).toHaveLength(0);
      expect(result.alerts).toHaveLength(0);
    });

    it('computes metrics, gap ratio, and fairness alerts for issues across ward types', async () => {
      const baseDate = new Date('2026-09-01T10:00:00Z');
      const plannedResponseDate = new Date('2026-09-02T10:00:00Z'); // 1 day later
      const unplannedResponseDate = new Date('2026-09-05T10:00:00Z'); // 4 days later

      const mockIssues = [
        {
          id: 'issue-planned-1',
          category: 'pothole/road',
          priority: 3,
          status: 'In Progress',
          slaBreach: false,
          slaDeadline: new Date('2026-09-10'),
          reopenCount: 0,
          createdAt: baseDate,
          wardId: 'ward-11',
          wardType: 'planned',
        },
        {
          id: 'issue-planned-2',
          category: 'pothole/road',
          priority: 3,
          status: 'Verified Fixed',
          slaBreach: false,
          slaDeadline: new Date('2026-09-10'),
          reopenCount: 0,
          createdAt: baseDate,
          wardId: 'ward-11',
          wardType: 'planned',
        },
        {
          id: 'issue-unplanned-1',
          category: 'pothole/road',
          priority: 3,
          status: 'In Progress',
          slaBreach: true,
          slaDeadline: new Date('2026-09-03'),
          reopenCount: 1,
          createdAt: baseDate,
          wardId: 'ward-14',
          wardType: 'unplanned',
        },
        {
          id: 'issue-unplanned-2',
          category: 'pothole/road',
          priority: 3,
          status: 'In Progress',
          slaBreach: true,
          slaDeadline: new Date('2026-09-03'),
          reopenCount: 0,
          createdAt: baseDate,
          wardId: 'ward-14',
          wardType: 'unplanned',
        },
      ];

      const mockEvents = [
        {
          issueId: 'issue-planned-1',
          fromStatus: 'Open',
          toStatus: 'Triaged',
          createdAt: plannedResponseDate,
        },
        {
          issueId: 'issue-planned-2',
          fromStatus: 'Open',
          toStatus: 'Assigned',
          createdAt: plannedResponseDate,
        },
        {
          issueId: 'issue-planned-2',
          fromStatus: 'Claimed Resolved',
          toStatus: 'Verified Fixed',
          createdAt: new Date('2026-09-03T10:00:00Z'),
        },
        {
          issueId: 'issue-unplanned-1',
          fromStatus: 'Open',
          toStatus: 'Triaged',
          createdAt: unplannedResponseDate,
        },
        {
          issueId: 'issue-unplanned-2',
          fromStatus: 'Open',
          toStatus: 'Assigned',
          createdAt: unplannedResponseDate,
        },
      ];

      rawLeftJoin.mockResolvedValueOnce(mockIssues);
      rawOrderBy.mockResolvedValueOnce(mockEvents);

      const result = await equityService.computeEquityMetrics();

      expect(result.totalIssuesAnalyzed).toBe(4);
      expect(result.overallByWardType.planned?.totalIssues).toBe(2);
      expect(result.overallByWardType.unplanned?.totalIssues).toBe(2);

      // Planned median response: 1.0 day
      expect(result.overallByWardType.planned?.medianResponseDays).toBe(1);
      // Unplanned median response: 4.0 days
      expect(result.overallByWardType.unplanned?.medianResponseDays).toBe(4);

      // SLA Compliance
      expect(result.overallByWardType.planned?.slaComplianceRate).toBe(100);
      expect(result.overallByWardType.unplanned?.slaComplianceRate).toBe(0);

      // Reopen rate
      expect(result.overallByWardType.unplanned?.reopenRate).toBe(50);

      // Category breakdown
      const roadCat = result.categories.find((c) => c.category === 'pothole/road');
      expect(roadCat).toBeDefined();
      expect(roadCat?.gap.plannedMedianResponse).toBe(1);
      expect(roadCat?.gap.unplannedMedianResponse).toBe(4);
      expect(roadCat?.gap.gapDays).toBe(3);
      expect(roadCat?.gap.disparityRatio).toBe(4);

      // Fairness alerts: disparityRatio 4 >= 1.5, triggers alert
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].category).toBe('pothole/road');
      expect(result.alerts[0].disparityRatio).toBe(4);
    });
  });
});
