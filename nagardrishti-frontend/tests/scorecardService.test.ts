import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issues, wards, departments, scorecardSnapshots } from '../server/db/schema.js';

const mockTableRows = vi.hoisted(() => new Map<unknown, unknown[]>());

vi.mock('../server/db/index.js', () => {
  const db: any = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => Promise.resolve(mockTableRows.get(table) ?? [])),
    })),
  };
  return { db };
});

import { scorecardService } from '../server/services/scorecardService.js';

describe('scorecardService.computeScorecard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTableRows.clear();
  });

  it('computes live totals, snapshots, byWard, and byDepartment aggregations from DB issues', async () => {
    const now = Date.now();
    mockTableRows.set(wards, [
      { id: 'ward-11', name: 'Ward 11' },
      { id: 'ward-12', name: 'Ward 12' },
    ]);
    mockTableRows.set(departments, [
      { id: 'roads', name: 'Roads & Infrastructure' },
      { id: 'water', name: 'Water Supply' },
    ]);
    mockTableRows.set(issues, [
      {
        id: 'i1',
        wardId: 'ward-11',
        departmentId: 'roads',
        status: 'Verified Fixed',
        slaDeadline: new Date(now + 2 * 86_400_000),
        slaBreach: false,
        reopenCount: 0,
        createdAt: new Date(now - 4 * 86_400_000),
        updatedAt: new Date(now - 1 * 86_400_000),
      },
      {
        id: 'i2',
        wardId: 'ward-11',
        departmentId: 'water',
        status: 'Open',
        slaDeadline: new Date(now - 2 * 86_400_000),
        slaBreach: true,
        reopenCount: 1,
        createdAt: new Date(now - 5 * 86_400_000),
        updatedAt: new Date(now - 2 * 86_400_000),
      },
      {
        id: 'i3',
        wardId: 'ward-12',
        departmentId: 'roads',
        status: 'In Progress',
        slaDeadline: new Date(now + 3 * 86_400_000),
        slaBreach: false,
        reopenCount: 0,
        createdAt: new Date(now - 2 * 86_400_000),
        updatedAt: new Date(now - 1 * 86_400_000),
      },
    ]);

    const res = await scorecardService.computeScorecard();

    expect(res.total).toBe(3);
    expect(res.resolved).toBe(1);
    expect(res.active).toBe(2);
    expect(res.pastSLA).toBe(1);
    expect(res.byWard).toHaveLength(2);
    expect(res.byDepartment).toHaveLength(2);
    expect(res.snapshots).toHaveLength(3);

    const ward11 = res.byWard.find((w) => w.wardId === 'ward-11');
    expect(ward11).toMatchObject({
      wardName: 'Ward 11',
      totalIssues: 2,
      resolvedIssues: 1,
      activeIssues: 1,
      slaCompliance: 50,
      medianResolutionDays: 3,
      reopenRate: 50,
    });

    const roads = res.byDepartment.find((d) => d.departmentId === 'roads');
    expect(roads).toMatchObject({
      departmentName: 'Roads & Infrastructure',
      totalIssues: 2,
      resolvedIssues: 1,
      activeIssues: 1,
      slaCompliance: 100,
    });
  });

  it('normalizes Ward N filter and falls back to scorecardSnapshots when issues table is empty', async () => {
    mockTableRows.set(issues, []);
    mockTableRows.set(wards, [{ id: 'ward-12', name: 'Ward 12' }]);
    mockTableRows.set(departments, [{ id: 'roads', name: 'Roads & Infrastructure' }]);
    mockTableRows.set(scorecardSnapshots, [
      {
        wardId: 'ward-12',
        departmentId: 'roads',
        period: 'Last 30 days',
        totalIssues: 10,
        resolvedIssues: 8,
        activeIssues: 2,
        slaCompliance: 80,
        medianResolutionDays: 2.5,
        reopenRate: 10,
        methodVersion: 'v1.0',
      },
      {
        wardId: 'ward-11',
        departmentId: 'water',
        period: 'Last 30 days',
        totalIssues: 5,
        resolvedIssues: 1,
        activeIssues: 4,
        slaCompliance: 40,
        medianResolutionDays: 6.0,
        reopenRate: 20,
        methodVersion: 'v1.0',
      },
    ]);

    const res = await scorecardService.computeScorecard('Ward 12');

    expect(res.total).toBe(0);
    expect(res.snapshots).toHaveLength(1);
    expect(res.snapshots[0]).toMatchObject({
      wardId: 'ward-12',
      wardName: 'Ward 12',
      departmentName: 'Roads & Infrastructure',
      slaCompliance: 80,
    });
    expect(res.weeklyMetrics).toHaveLength(12);
    expect(res.weeklyMetrics.every((w) => w.filed === 0 && w.resolved === 0 && w.days === 0)).toBe(true);
  });

  it('computes 12-week live weeklyMetrics citywide and per ward/department excluding issues older than 12 weeks', async () => {
    vi.useFakeTimers();
    try {
      const fixedNow = new Date('2026-11-15T12:00:00Z');
      vi.setSystemTime(fixedNow);
      const dayMs = 86_400_000;
      const nowMs = fixedNow.getTime();

      mockTableRows.set(wards, [{ id: 'ward-11', name: 'Ward 11' }]);
      mockTableRows.set(departments, [{ id: 'roads', name: 'Roads & Infrastructure' }]);
      mockTableRows.set(issues, [
        {
          id: 'recent-fixed',
          wardId: 'ward-11',
          departmentId: 'roads',
          status: 'Verified Fixed',
          slaDeadline: new Date(nowMs + dayMs),
          slaBreach: false,
          reopenCount: 0,
          createdAt: new Date(nowMs - 3 * dayMs),
          updatedAt: new Date(nowMs - 1 * dayMs),
        },
        {
          id: 'week-10-open',
          wardId: 'ward-11',
          departmentId: 'roads',
          status: 'Open',
          slaDeadline: new Date(nowMs + dayMs),
          slaBreach: false,
          reopenCount: 0,
          createdAt: new Date(nowMs - 16 * dayMs),
          updatedAt: new Date(nowMs - 15 * dayMs),
        },
        {
          id: 'too-old-for-12w',
          wardId: 'ward-11',
          departmentId: 'roads',
          status: 'Open',
          slaDeadline: new Date(nowMs - 5 * dayMs),
          slaBreach: true,
          reopenCount: 0,
          createdAt: new Date(nowMs - 100 * dayMs),
          updatedAt: new Date(nowMs - 99 * dayMs),
        },
      ]);

      const res = await scorecardService.computeScorecard();
      expect(res.total).toBe(3);
      expect(res.weeklyMetrics).toHaveLength(12);

      // W12 covers [now - 7d, now], W10 covers [now - 21d, now - 14d)
      expect(res.weeklyMetrics[11]).toEqual({ week: 'W12', filed: 1, resolved: 1, days: 2 });
      expect(res.weeklyMetrics[9]).toEqual({ week: 'W10', filed: 1, resolved: 0, days: 0 });
      expect(res.weeklyMetrics.reduce((s, w) => s + w.filed, 0)).toBe(2);
      expect(res.byWard[0].weeklyMetrics[11]).toEqual({ week: 'W12', filed: 1, resolved: 1, days: 2 });
      expect(res.byDepartment[0].weeklyMetrics[11]).toEqual({ week: 'W12', filed: 1, resolved: 1, days: 2 });
    } finally {
      vi.useRealTimers();
    }
  });
});
