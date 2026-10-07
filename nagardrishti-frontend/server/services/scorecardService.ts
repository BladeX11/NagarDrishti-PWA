import { db } from '../db/index.js';
import { issues } from '../db/schema.js';
import { lt, and, inArray } from 'drizzle-orm';
import { priorityService } from './priorityService.js';
import { inactionService } from './inactionService.js';

export const scorecardService = {
  async computeScorecard(wardId?: string, departmentId?: string, period?: string) {
    // Basic deterministic scorecard logic
    let query = db.select().from(issues);
    
    const allIssues = await query;
    
    const filtered = allIssues.filter(i => {
      let match = true;
      if (wardId) match = match && i.wardId === wardId;
      if (departmentId) match = match && i.departmentId === departmentId;
      return match;
    });

    const total = filtered.length;
    const resolved = filtered.filter(i => i.status === 'Verified Fixed').length;
    const pastSLA = filtered.filter(i => i.slaDeadline && new Date(i.slaDeadline) < new Date() && i.status !== 'Verified Fixed').length;
    
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
    
    return {
      total,
      resolved,
      pastSLA,
      resolutionRate,
      timestamp: new Date()
    };
  },

  async getScorecard(filters: { wardId?: string, departmentId?: string }) {
    return this.computeScorecard(filters.wardId, filters.departmentId);
  },

  async computeSLABreaches() {
    const breaches = await db.select()
      .from(issues)
      .where(
        and(
          lt(issues.slaDeadline, new Date()),
          inArray(issues.status, ['Open', 'Triaged', 'Assigned', 'In Progress', 'Reopened'])
        )
      );
    return breaches;
  },

  async computeForgottenIssues() {
    const allIssues = await db.select().from(issues);
    const active = allIssues.filter(i => ['Open', 'Triaged', 'Assigned', 'In Progress', 'Reopened'].includes(i.status));
    
    const tierMap = await inactionService.batchComputeTiers(active);

    const enriched = active.map(i => {
      const tierData = tierMap.get(i.id) || { tier: 0, inactionDays: 0 };
      return {
        ...i,
        ...priorityService.computePriority(i),
        tier: tierData.tier,
        inactionDays: tierData.inactionDays
      };
    });

    return enriched.sort((a, b) => b.tier - a.tier || b.inactionDays - a.inactionDays);
  }
};
