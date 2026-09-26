import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { issueDuplicates, issues, modelPredictions } from '../db/schema.js';
import { AI_DATA_VERSION, AI_VERSION, type IssueInferenceContext, type IssueInferenceResult } from './contracts.js';
import type { Category } from '../../shared/types.js';
import { predictCategory, predictDepartment, predictPriority, predictProof, scoreDuplicate } from './rules.js';
import { haversineMetres } from './features.js';

function toContext(issue: typeof issues.$inferSelect): IssueInferenceContext {
  return {
    issueId: issue.id,
    title: issue.title,
    description: issue.description ?? '',
    category: issue.category,
    status: issue.status,
    latitude: issue.privateLat,
    longitude: issue.privateLng,
    supporterCount: issue.supporterCount ?? 0,
    ageInDays: issue.createdAt ? Math.max(0, (Date.now() - issue.createdAt.getTime()) / 86400000) : 0,
    slaBreach: issue.slaBreach ?? false,
    hasProof: issue.proofState !== 'none',
  };
}

export const aiOrchestrator = {
  async inferForIssue(issueId: string): Promise<IssueInferenceResult> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));
    if (!issue) throw new Error('Issue not found');

    const context = toContext(issue);
    const predictions = [
      predictCategory(context),
      predictDepartment(context.category as Category),
      predictPriority(context),
      predictProof(context.hasProof),
    ];

    const candidates = await db.select().from(issues).where(and(ne(issues.id, issue.id), ne(issues.status, 'Verified Fixed')));
    const duplicateCandidates = candidates
      .filter((candidate) => haversineMetres(context.latitude, context.longitude, candidate.privateLat, candidate.privateLng) <= 1500)
      .map((candidate) => {
        const result = scoreDuplicate(context, { ...toContext(candidate), publicRef: candidate.publicRef });
        return { ...result, distanceMetres: haversineMetres(context.latitude, context.longitude, candidate.privateLat, candidate.privateLng) };
      })
      .filter((candidate) => candidate.score >= 0.35)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);

    for (const prediction of predictions) {
      await db.insert(modelPredictions).values({
        issueId: issue.id,
        module: prediction.module,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        modelVersion: prediction.modelVersion,
        dataVersion: prediction.dataVersion,
        explanation: prediction.explanation,
        status: prediction.status,
      });
    }

    for (const candidate of duplicateCandidates) {
      const [first, second] = issue.id < candidate.issueId ? [issue.id, candidate.issueId] : [candidate.issueId, issue.id];
      const existing = await db.select().from(issueDuplicates).where(and(eq(issueDuplicates.issueAId, first), eq(issueDuplicates.issueBId, second)));
      if (existing.length === 0) {
        await db.insert(issueDuplicates).values({
          issueAId: first,
          issueBId: second,
          spatialDistance: candidate.distanceMetres,
          textSimilarity: candidate.textSimilarity,
          categoryMatch: candidate.categoryMatch,
          overallScore: candidate.score,
          status: 'pending',
          modelVersion: AI_VERSION,
        });
      }
    }

    return { issueId: issue.id, predictions, duplicateCandidates, generatedAt: new Date().toISOString() };
  },

  async listPredictions(issueId?: string) {
    if (issueId) return db.select().from(modelPredictions).where(eq(modelPredictions.issueId, issueId));
    return db.select().from(modelPredictions);
  },

  async listDuplicates(status?: string) {
    if (status) return db.select().from(issueDuplicates).where(eq(issueDuplicates.status, status));
    return db.select().from(issueDuplicates);
  },

  metadata() {
    return { modelVersion: AI_VERSION, dataVersion: AI_DATA_VERSION, modules: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'] };
  },
};
