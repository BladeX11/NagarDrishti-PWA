import { db } from '../db/index.js';
import { issues, wards, statusEvents } from '../db/schema.js';
import { eq, inArray, desc } from 'drizzle-orm';
import type { Category, WardType } from '../../shared/types.js';

export interface EquityMetric {
  wardType: WardType;
  totalIssues: number;
  resolvedIssues: number;
  medianResponseDays: number;
  medianResolutionDays: number;
  slaComplianceRate: number;
  reopenRate: number;
}

export interface StatisticalTestResult {
  hStatistic: number;
  pValue: number;
  degreesOfFreedom: number;
  significant: boolean;
  underservedWardType: WardType | null;
  effectSizeDays: number;
  note?: string;
}

export interface CategoryEquityGap {
  plannedMedianResponse: number;
  unplannedMedianResponse: number;
  gapDays: number;
  disparityRatio: number;
}

export interface CategoryEquity {
  category: Category;
  metricsByWardType: Partial<Record<WardType, EquityMetric>>;
  gap: CategoryEquityGap;
  statisticalTest: StatisticalTestResult;
}

export interface FairnessAlert {
  category: string;
  message: string;
  disparityRatio: number;
  severity: 'low' | 'medium' | 'high';
}

export interface EquityAnalysisResult {
  overallByWardType: Partial<Record<WardType, EquityMetric>>;
  categories: CategoryEquity[];
  alerts: FairnessAlert[];
  totalIssuesAnalyzed: number;
  generatedAt: string;
}

// ── Math & Statistical Helpers ────────────────────────────────────────────────

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const val = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(val * 10) / 10;
}

function logGamma(z: number): number {
  const p = [
    676.5203681287693,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109584907124,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1);
  }
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function regularizedGammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return (Math.pow(x, a) * Math.exp(-x) * sum) / Math.exp(logGamma(a));
  } else {
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 100; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    const q = (Math.pow(x, a) * Math.exp(-x) * h) / Math.exp(logGamma(a));
    return 1 - q;
  }
}

export function chiSquareSurvival(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 1.0;
  return Math.max(0, Math.min(1, 1 - regularizedGammaP(df / 2, x / 2)));
}

/**
 * Kruskal-Wallis non-parametric H-test across k groups.
 * Handles ties with correction factor.
 */
export function kruskalWallisTest(groups: { label: WardType; values: number[] }[]): StatisticalTestResult {
  const activeGroups = groups.filter((g) => g.values.length > 0);
  if (activeGroups.length < 2) {
    return {
      hStatistic: 0,
      pValue: 1.0,
      degreesOfFreedom: 0,
      significant: false,
      underservedWardType: null,
      effectSizeDays: 0,
      note: 'Fewer than 2 groups with observations',
    };
  }

  interface RankItem {
    value: number;
    groupIndex: number;
    rank: number;
  }

  const allItems: RankItem[] = [];
  activeGroups.forEach((g, gIdx) => {
    g.values.forEach((val) => {
      allItems.push({ value: val, groupIndex: gIdx, rank: 0 });
    });
  });

  const N = allItems.length;
  if (N < 3) {
    return {
      hStatistic: 0,
      pValue: 1.0,
      degreesOfFreedom: activeGroups.length - 1,
      significant: false,
      underservedWardType: null,
      effectSizeDays: 0,
      note: 'Total observations too small for Kruskal-Wallis',
    };
  }

  allItems.sort((a, b) => a.value - b.value);

  // Assign average rank for ties
  let i = 0;
  let tieSum = 0;
  while (i < N) {
    let j = i;
    while (j < N && allItems[j].value === allItems[i].value) {
      j++;
    }
    const count = j - i;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      allItems[k].rank = avgRank;
    }
    if (count > 1) {
      tieSum += count * count * count - count;
    }
    i = j;
  }

  // Calculate sum of ranks per group
  const rankSums = new Array(activeGroups.length).fill(0);
  for (const item of allItems) {
    rankSums[item.groupIndex] += item.rank;
  }

  let sumR2OverN = 0;
  activeGroups.forEach((g, idx) => {
    sumR2OverN += (rankSums[idx] * rankSums[idx]) / g.values.length;
  });

  const hRaw = (12 / (N * (N + 1))) * sumR2OverN - 3 * (N + 1);
  const tieCorrection = 1 - tieSum / (N * N * N - N);
  const hStat = tieCorrection > 0 ? hRaw / tieCorrection : hRaw;
  const df = activeGroups.length - 1;
  const pVal = chiSquareSurvival(hStat, df);

  // Determine underserved group (highest median response time)
  const medians = activeGroups.map((g) => ({
    label: g.label,
    median: computeMedian(g.values),
  }));
  medians.sort((a, b) => b.median - a.median);

  const underserved = medians[0]?.label ?? null;
  const best = medians[medians.length - 1]?.median ?? 0;
  const worst = medians[0]?.median ?? 0;
  const effectSize = Math.round((worst - best) * 10) / 10;

  return {
    hStatistic: Math.round(hStat * 100) / 100,
    pValue: Math.round(pVal * 1000) / 1000,
    degreesOfFreedom: df,
    significant: pVal < 0.05,
    underservedWardType: underserved,
    effectSizeDays: effectSize,
  };
}

// ── Equity Service Implementation ─────────────────────────────────────────────

const WARD_TYPES: WardType[] = ['planned', 'unplanned', 'mixed', 'peri-urban'];

export const equityService = {
  /**
   * Computes city-wide equity metrics and category-level breakdowns across ward types.
   */
  async computeEquityMetrics(): Promise<EquityAnalysisResult> {
    // 1. Fetch all issues joined with their ward metadata
    const issueRows = await db
      .select({
        id: issues.id,
        category: issues.category,
        priority: issues.priority,
        status: issues.status,
        slaBreach: issues.slaBreach,
        slaDeadline: issues.slaDeadline,
        reopenCount: issues.reopenCount,
        createdAt: issues.createdAt,
        wardId: issues.wardId,
        wardType: wards.wardType,
      })
      .from(issues)
      .leftJoin(wards, eq(issues.wardId, wards.id));

    if (issueRows.length === 0) {
      return {
        overallByWardType: {},
        categories: [],
        alerts: [],
        totalIssuesAnalyzed: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    const issueIds = issueRows.map((i) => i.id);

    // 2. Fetch status events to calculate response and resolution timestamps
    const events = await db
      .select({
        issueId: statusEvents.issueId,
        fromStatus: statusEvents.fromStatus,
        toStatus: statusEvents.toStatus,
        createdAt: statusEvents.createdAt,
      })
      .from(statusEvents)
      .where(inArray(statusEvents.issueId, issueIds))
      .orderBy(statusEvents.createdAt);

    // Group events by issueId
    const eventsByIssue = new Map<string, typeof events>();
    for (const ev of events) {
      if (!ev.issueId) continue;
      const list = eventsByIssue.get(ev.issueId) || [];
      list.push(ev);
      eventsByIssue.set(ev.issueId, list);
    }

    // 3. Enrich issues with response time and resolution time
    interface EnrichedIssue {
      id: string;
      category: Category;
      priority: number;
      status: string;
      wardType: WardType;
      slaBreach: boolean;
      reopenCount: number;
      responseDays?: number;
      resolutionDays?: number;
    }

    const enrichedIssues: EnrichedIssue[] = [];

    for (const issue of issueRows) {
      // Map wardType with safe fallback
      const rawWardType = (issue.wardType as WardType) || 'unplanned';
      const wardType: WardType = WARD_TYPES.includes(rawWardType) ? rawWardType : 'unplanned';

      const issueEvents = eventsByIssue.get(issue.id) || [];
      const createdTime = issue.createdAt ? new Date(issue.createdAt).getTime() : Date.now();

      // Find first forward transition past Open (first response)
      let responseDays: number | undefined;
      const responseEvent = issueEvents.find((e) =>
        ['Triaged', 'Assigned', 'In Progress', 'Claimed Resolved', 'Verified Fixed'].includes(e.toStatus)
      );

      if (responseEvent?.createdAt) {
        const responseTime = new Date(responseEvent.createdAt).getTime();
        responseDays = Math.max(0, (responseTime - createdTime) / 86_400_000);
      } else if (['Triaged', 'Assigned', 'In Progress', 'Claimed Resolved', 'Verified Fixed'].includes(issue.status)) {
        // If status moved but event timestamps missing, fallback to 1.0 day
        responseDays = 1.0;
      }

      // Find resolution event (Verified Fixed)
      let resolutionDays: number | undefined;
      const resolvedEvent = issueEvents.find((e) => e.toStatus === 'Verified Fixed' || e.toStatus === 'Claimed Resolved');
      if (resolvedEvent?.createdAt) {
        const resTime = new Date(resolvedEvent.createdAt).getTime();
        resolutionDays = Math.max(0, (resTime - createdTime) / 86_400_000);
      } else if (['Claimed Resolved', 'Verified Fixed'].includes(issue.status)) {
        resolutionDays = 2.0;
      }

      enrichedIssues.push({
        id: issue.id,
        category: issue.category as Category,
        priority: issue.priority ?? 3,
        status: issue.status,
        wardType,
        slaBreach: issue.slaBreach ?? false,
        reopenCount: issue.reopenCount ?? 0,
        responseDays,
        resolutionDays,
      });
    }

    // 4. Helper to aggregate a subset of issues for a specific wardType
    function aggregateGroup(groupIssues: EnrichedIssue[], type: WardType): EquityMetric {
      const total = groupIssues.length;
      const resolved = groupIssues.filter((i) => ['Claimed Resolved', 'Verified Fixed'].includes(i.status)).length;
      const responseTimes = groupIssues
        .map((i) => i.responseDays)
        .filter((d): d is number => d !== undefined);
      const resolutionTimes = groupIssues
        .map((i) => i.resolutionDays)
        .filter((d): d is number => d !== undefined);

      const compliantCount = groupIssues.filter((i) => !i.slaBreach).length;
      const reopenedCount = groupIssues.filter((i) => i.reopenCount > 0 || i.status === 'Reopened').length;

      return {
        wardType: type,
        totalIssues: total,
        resolvedIssues: resolved,
        medianResponseDays: computeMedian(responseTimes),
        medianResolutionDays: computeMedian(resolutionTimes),
        slaComplianceRate: total > 0 ? Math.round((compliantCount / total) * 1000) / 10 : 0,
        reopenRate: total > 0 ? Math.round((reopenedCount / total) * 1000) / 10 : 0,
      };
    }

    // 5. City-wide overall by wardType
    const overallByWardType: Partial<Record<WardType, EquityMetric>> = {};
    for (const wType of WARD_TYPES) {
      const issuesForType = enrichedIssues.filter((i) => i.wardType === wType);
      if (issuesForType.length > 0) {
        overallByWardType[wType] = aggregateGroup(issuesForType, wType);
      }
    }

    // 6. Category-level breakdowns
    const categoriesSet = Array.from(new Set(enrichedIssues.map((i) => i.category)));
    const categories: CategoryEquity[] = [];
    const alerts: FairnessAlert[] = [];

    for (const cat of categoriesSet) {
      const catIssues = enrichedIssues.filter((i) => i.category === cat);
      const metricsByWardType: Partial<Record<WardType, EquityMetric>> = {};

      const kwGroups: { label: WardType; values: number[] }[] = [];

      for (const wType of WARD_TYPES) {
        const issuesForType = catIssues.filter((i) => i.wardType === wType);
        if (issuesForType.length > 0) {
          metricsByWardType[wType] = aggregateGroup(issuesForType, wType);
          const responseTimes = issuesForType
            .map((i) => i.responseDays)
            .filter((d): d is number => d !== undefined);
          kwGroups.push({ label: wType, values: responseTimes });
        }
      }

      // Statistical Kruskal-Wallis test across ward types for this category
      const statisticalTest = kruskalWallisTest(kwGroups);

      // Gap comparison (Planned vs Unplanned)
      const plannedMedian = metricsByWardType.planned?.medianResponseDays ?? 0;
      const unplannedMedian = metricsByWardType.unplanned?.medianResponseDays ?? 0;
      const gapDays = Math.round((unplannedMedian - plannedMedian) * 10) / 10;
      const denominator = plannedMedian > 0 ? plannedMedian : 0.5;
      const disparityRatio = Math.round((unplannedMedian / denominator) * 10) / 10;

      categories.push({
        category: cat,
        metricsByWardType,
        gap: {
          plannedMedianResponse: plannedMedian,
          unplannedMedianResponse: unplannedMedian,
          gapDays,
          disparityRatio,
        },
        statisticalTest,
      });

      // Generate fairness alert if noticeable disparity exists
      if (unplannedMedian > plannedMedian && disparityRatio >= 1.5 && catIssues.length >= 2) {
        const severity: 'low' | 'medium' | 'high' = disparityRatio >= 3.0 ? 'high' : disparityRatio >= 2.0 ? 'medium' : 'low';
        alerts.push({
          category: cat,
          message: `For ${cat} issues, unplanned wards wait ${disparityRatio}x longer than planned wards for first response (${unplannedMedian}d vs ${plannedMedian}d).`,
          disparityRatio,
          severity,
        });
      }
    }

    // Sort alerts by highest disparity
    alerts.sort((a, b) => b.disparityRatio - a.disparityRatio);

    return {
      overallByWardType,
      categories,
      alerts,
      totalIssuesAnalyzed: enrichedIssues.length,
      generatedAt: new Date().toISOString(),
    };
  },
};
