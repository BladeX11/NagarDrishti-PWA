import { db } from '../db/index.js';
import { departments, issues, scorecardSnapshots, wards } from '../db/schema.js';
import { lt, and, inArray } from 'drizzle-orm';
import { priorityService } from './priorityService.js';
import { inactionService } from './inactionService.js';
import { privacyService } from './privacyService.js';
import { formatDepartmentName, formatWardName } from './issueService.js';

const ACTIVE_STATUSES = ['Open', 'Triaged', 'Assigned', 'In Progress', 'Reopened'];

function normalizeWardFilter(wardId?: string): string | undefined {
  if (!wardId) return undefined;
  const trimmed = wardId.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^ward[\s-]+(\d+)$/i);
  return match ? `ward-${match[1]}` : trimmed;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const val = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(val * 10) / 10;
}

function computeGroupMetrics(groupIssues: Array<typeof issues.$inferSelect>, nowMs: number) {
  const totalIssues = groupIssues.length;
  const resolvedIssues = groupIssues.filter((i) => i.status === 'Verified Fixed').length;
  const activeIssues = totalIssues - resolvedIssues;
  const withinSla = groupIssues.filter((i) => {
    const pastDeadline = i.slaDeadline && new Date(i.slaDeadline).getTime() < nowMs && i.status !== 'Verified Fixed';
    return !(i.slaBreach || pastDeadline);
  }).length;
  const slaCompliance = totalIssues > 0 ? Math.round((withinSla / totalIssues) * 1000) / 10 : 100;
  const resolutionDays = groupIssues
    .filter((i) => i.status === 'Verified Fixed' && i.createdAt && i.updatedAt)
    .map((i) => Math.max(0, (new Date(i.updatedAt!).getTime() - new Date(i.createdAt!).getTime()) / 86_400_000));
  const medianResolutionDays = median(resolutionDays);
  const reopenedCount = groupIssues.filter((i) => (i.reopenCount ?? 0) > 0 || i.status === 'Reopened').length;
  const reopenRate = totalIssues > 0 ? Math.round((reopenedCount / totalIssues) * 1000) / 10 : 0;

  return {
    totalIssues,
    resolvedIssues,
    activeIssues,
    slaCompliance,
    medianResolutionDays,
    reopenRate,
  };
}

function computeAgeDisplay(createdAt: Date | null | undefined): { age: string; ageInDays: number } {
  if (!createdAt) return { age: 'Recent', ageInDays: 0 };
  const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const ageInDays = Math.floor(diffMs / 86_400_000);
  const ageInHours = Math.floor(diffMs / 3_600_000);
  if (ageInDays > 0) return { age: `${ageInDays}d ago`, ageInDays };
  if (ageInHours > 0) return { age: `${ageInHours}h ago`, ageInDays: 0 };
  return { age: 'just now', ageInDays: 0 };
}

function computeSlaDays(slaDeadline: Date | null | undefined, createdAt: Date | null | undefined): number {
  if (!slaDeadline || !createdAt) return 7;
  const diff = Math.round((new Date(slaDeadline).getTime() - new Date(createdAt).getTime()) / 86_400_000);
  return Number.isFinite(diff) && diff > 0 ? diff : 7;
}

export const scorecardService = {
  async computeScorecard(wardId?: string, departmentId?: string, period?: string) {
    const now = new Date();
    const nowMs = now.getTime();
    const normalizedWardId = normalizeWardFilter(wardId);
    const activePeriod = period || 'Last 30 days';

    const allIssues = await db.select().from(issues);
    const filtered = allIssues.filter((i) => {
      let match = true;
      if (normalizedWardId) match = match && i.wardId === normalizedWardId;
      if (departmentId) match = match && i.departmentId === departmentId;
      return match;
    });

    const total = filtered.length;
    const resolved = filtered.filter((i) => i.status === 'Verified Fixed').length;
    const pastSLA = filtered.filter(
      (i) => i.slaDeadline && new Date(i.slaDeadline) < now && i.status !== 'Verified Fixed'
    ).length;
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
    const overallMetrics = computeGroupMetrics(filtered, nowMs);

    const wardNameMap = new Map<string, string>();
    const deptNameMap = new Map<string, string>();
    try {
      const [wardRows, deptRows] = await Promise.all([
        db.select().from(wards),
        db.select().from(departments),
      ]);
      for (const w of wardRows) wardNameMap.set(w.id, w.name);
      for (const d of deptRows) deptNameMap.set(d.id, d.name);
    } catch {
      // Safe fallback to deterministic formatters
    }

    const pairGroups = new Map<string, Array<typeof issues.$inferSelect>>();
    const wardGroups = new Map<string, Array<typeof issues.$inferSelect>>();
    const deptGroups = new Map<string, Array<typeof issues.$inferSelect>>();

    for (const issue of filtered) {
      const wId = issue.wardId || 'unassigned';
      const dId = issue.departmentId || 'civic-works';
      const pairKey = `${wId}::${dId}`;
      pairGroups.set(pairKey, [...(pairGroups.get(pairKey) ?? []), issue]);
      wardGroups.set(wId, [...(wardGroups.get(wId) ?? []), issue]);
      deptGroups.set(dId, [...(deptGroups.get(dId) ?? []), issue]);
    }

    let snapshots = Array.from(pairGroups.entries()).map(([key, group]) => {
      const [wId, dId] = key.split('::');
      const wardLabel = formatWardName(wId) ?? wId;
      const wardName = wardNameMap.get(wId) ?? wardLabel;
      const departmentName = deptNameMap.get(dId) ?? formatDepartmentName(dId) ?? dId;
      return {
        wardId: wId,
        ward: wardLabel,
        wardName,
        departmentId: dId,
        department: departmentName,
        departmentName,
        period: activePeriod,
        ...computeGroupMetrics(group, nowMs),
        methodVersion: 'v1.0',
      };
    });

    if (snapshots.length === 0) {
      try {
        const storedSnapshots = await db.select().from(scorecardSnapshots);
        snapshots = storedSnapshots
          .filter((s) => (!normalizedWardId || s.wardId === normalizedWardId) && (!departmentId || s.departmentId === departmentId))
          .map((s) => {
            const wId = s.wardId || 'unassigned';
            const dId = s.departmentId || 'civic-works';
            const wardLabel = formatWardName(wId) ?? wId;
            const departmentName = deptNameMap.get(dId) ?? formatDepartmentName(dId) ?? dId;
            return {
              wardId: wId,
              ward: wardLabel,
              wardName: wardNameMap.get(wId) ?? wardLabel,
              departmentId: dId,
              department: departmentName,
              departmentName,
              period: s.period,
              totalIssues: s.totalIssues,
              resolvedIssues: s.resolvedIssues,
              activeIssues: s.activeIssues ?? Math.max(0, s.totalIssues - s.resolvedIssues),
              slaCompliance: s.slaCompliance,
              medianResolutionDays: s.medianResolutionDays ?? 0,
              reopenRate: s.reopenRate ?? 0,
              methodVersion: s.methodVersion ?? 'v1.0',
            };
          });
      } catch {
        // Ignore if snapshots table unavailable
      }
    }

    const byWard = Array.from(wardGroups.entries()).map(([wId, group]) => {
      const wardLabel = formatWardName(wId) ?? wId;
      return {
        wardId: wId,
        ward: wardLabel,
        wardName: wardNameMap.get(wId) ?? wardLabel,
        ...computeGroupMetrics(group, nowMs),
      };
    });

    const byDepartment = Array.from(deptGroups.entries()).map(([dId, group]) => {
      const departmentName = deptNameMap.get(dId) ?? formatDepartmentName(dId) ?? dId;
      return {
        departmentId: dId,
        department: departmentName,
        departmentName,
        ...computeGroupMetrics(group, nowMs),
      };
    });

    return {
      total,
      resolved,
      active: total - resolved,
      pastSLA,
      resolutionRate,
      slaCompliance: overallMetrics.slaCompliance,
      medianResolutionDays: overallMetrics.medianResolutionDays,
      reopenRate: overallMetrics.reopenRate,
      period: activePeriod,
      snapshots,
      byWard,
      byDepartment,
      timestamp: now,
    };
  },

  async getScorecard(filters: { wardId?: string; departmentId?: string; period?: string }) {
    return this.computeScorecard(filters.wardId, filters.departmentId, filters.period);
  },

  async computeSLABreaches() {
    const breaches = await db
      .select()
      .from(issues)
      .where(
        and(
          lt(issues.slaDeadline, new Date()),
          inArray(issues.status, ACTIVE_STATUSES)
        )
      );

    return breaches.map((i) => {
      const { age, ageInDays } = computeAgeDisplay(i.createdAt);
      return privacyService.redactForPublic({
        ...i,
        ward: formatWardName(i.wardId),
        department: formatDepartmentName(i.departmentId, i.category),
        supporters: i.supporterCount ?? 0,
        slaDeadlineDays: computeSlaDays(i.slaDeadline, i.createdAt),
        latitude: i.publicLat,
        longitude: i.publicLng,
        age,
        ageInDays,
      });
    });
  },

  async computeForgottenIssues() {
    const allIssues = await db.select().from(issues);
    const active = allIssues.filter((i) => ACTIVE_STATUSES.includes(i.status));

    const tierMap = await inactionService.batchComputeTiers(active);

    const enriched = active.map((i) => {
      const tierData = tierMap.get(i.id) || { tier: 0, inactionDays: 0 };
      const { age, ageInDays } = computeAgeDisplay(i.createdAt);
      const priorityResult = priorityService.computePriority({ ...i, ageInDays });
      return privacyService.redactForPublic({
        ...i,
        ward: formatWardName(i.wardId),
        department: formatDepartmentName(i.departmentId, i.category),
        supporters: i.supporterCount ?? 0,
        slaDeadlineDays: computeSlaDays(i.slaDeadline, i.createdAt),
        latitude: i.publicLat,
        longitude: i.publicLng,
        age,
        ageInDays,
        ...priorityResult,
        tier: tierData.tier,
        inactionDays: tierData.inactionDays,
      });
    });

    return enriched.sort((a, b) => b.tier - a.tier || b.inactionDays - a.inactionDays);
  },
};
