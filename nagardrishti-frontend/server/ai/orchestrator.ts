import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { issueDuplicates, issues, modelPredictions } from '../db/schema.js';
import { AI_DATA_VERSION, AI_VERSION, CALIBRATION_VERSION, type IssueInferenceContext, type IssueInferenceResult, type Prediction, type PredictionExplanation } from './contracts.js';
import type { Category } from '../../shared/types.js';
import { predictCategory, predictDepartment, predictPriority, predictProof, scoreDuplicate } from './rules.js';
import { clamp, haversineMetres } from './features.js';
import { issueGraphService } from './graph.js';
import { calibratePrediction } from './calibration.js';
import { suggestCategory, type CategorySuggestion } from './categorySuggestion.js';
import { predictTrainedCategory } from '../evaluation/trainedModel.js';

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

function buildCategoryPrediction(
  context: IssueInferenceContext,
  categorySuggestion: CategorySuggestion,
): Prediction<Category> {
  const rulesPrediction = predictCategory(context);
  if (categorySuggestion.source === 'rules') {
    return {
      ...rulesPrediction,
      explanation: categorySuggestion.reason,
      modelVersion: categorySuggestion.modelVersion,
    };
  }

  const reportText = `${context.title}\n${context.description}`.trim();
  const trained = reportText ? predictTrainedCategory(reportText) : null;
  const rulesStrongMatch =
    rulesPrediction.prediction === categorySuggestion.category &&
    (rulesPrediction.signals[0]?.contribution ?? 0) > 0;

  if (categorySuggestion.source === 'local-ml' && trained) {
    const confidence = clamp(trained.confidence, 0.35, 0.96);
    const signals: PredictionExplanation[] =
      trained.evidenceTerms.length > 0
        ? trained.evidenceTerms.map((term) => ({
            signal: 'nb_evidence_term',
            value: term,
            contribution: clamp(confidence, 0.5, 1),
          }))
        : [{ signal: 'nb_prior_fallback', value: trained.label, contribution: 0.2 }];

    if (rulesStrongMatch) {
      signals.push({
        signal: 'keyword_agreement',
        value: rulesPrediction.prediction,
        contribution: rulesPrediction.signals[0].contribution,
      });
    }

    return {
      ...rulesPrediction,
      prediction: categorySuggestion.category,
      confidence,
      explanation: categorySuggestion.reason,
      signals,
      modelVersion: categorySuggestion.modelVersion,
      dataVersion: 'civictrust-benchmark-v1',
    };
  }

  // Gemini semantic classification: combine base confidence with local-ML, keyword, and reporter agreement signals
  const signals: PredictionExplanation[] = [
    {
      signal: 'gemini_semantic_classification',
      value: categorySuggestion.category,
      contribution: reportText.length >= 12 ? 0.85 : 0.55,
    },
  ];
  let confidence = reportText.length >= 12 ? 0.82 : 0.68;

  if (trained && trained.label === categorySuggestion.category) {
    confidence += 0.06;
    signals.push({
      signal: 'local_ml_agreement',
      value: trained.evidenceTerms.join(', ') || trained.label,
      contribution: clamp(trained.confidence, 0.5, 1),
    });
  }
  if (rulesStrongMatch) {
    confidence += 0.05;
    signals.push({
      signal: 'keyword_agreement',
      value: rulesPrediction.prediction,
      contribution: rulesPrediction.signals[0].contribution,
    });
  }
  if (context.category === categorySuggestion.category) {
    signals.push({
      signal: 'reporter_category_match',
      value: context.category,
      contribution: 0.65,
    });
  }
  if (
    trained &&
    trained.evidenceTerms.length > 0 &&
    trained.label !== categorySuggestion.category &&
    !rulesStrongMatch &&
    (rulesPrediction.signals[0]?.contribution ?? 0) > 0
  ) {
    confidence -= 0.1;
  }

  return {
    ...rulesPrediction,
    prediction: categorySuggestion.category,
    confidence: clamp(confidence, 0.45, 0.96),
    explanation: categorySuggestion.reason,
    signals,
    modelVersion: categorySuggestion.modelVersion,
    dataVersion: 'live-report-text-v1',
  };
}

export const aiOrchestrator = {
  async inferForIssue(issueId: string): Promise<IssueInferenceResult> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, issueId));
    if (!issue) throw new Error('Issue not found');

    const context = toContext(issue);
    const categorySuggestion = await suggestCategory(
      `${context.title}\n${context.description}`,
      issue.language === 'hi' ? 'Hindi' : issue.language === 'mr' ? 'Marathi' : 'English',
      context.category as Category,
    );
    const categoryPrediction = buildCategoryPrediction(context, categorySuggestion);
    const predictions = [
      categoryPrediction,
      predictDepartment(context.category as Category),
      predictPriority(context),
      predictProof(context.hasProof),
    ].map(calibratePrediction);

    const candidates = await db.select().from(issues).where(and(ne(issues.id, issue.id), ne(issues.status, 'Verified Fixed')));
    const duplicateCorpus = [context, ...candidates.map(toContext)].map((item) => `${item.title} ${item.description}`);
    const duplicateCandidates = candidates
      .filter((candidate) => haversineMetres(context.latitude, context.longitude, candidate.privateLat, candidate.privateLng) <= 1500)
      .map((candidate) => {
        const distanceMetres = haversineMetres(context.latitude, context.longitude, candidate.privateLat, candidate.privateLng);
        const result = scoreDuplicate(context, { ...toContext(candidate), publicRef: candidate.publicRef }, distanceMetres, duplicateCorpus);
        return { ...result, distanceMetres };
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
        rawConfidence: prediction.rawConfidence,
        calibratedConfidence: prediction.calibratedConfidence,
        abstained: prediction.abstained,
        abstentionReason: prediction.abstentionReason,
        calibrationVersion: CALIBRATION_VERSION,
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

    await issueGraphService.rebuild();

    return { issueId: issue.id, predictions, duplicateCandidates, generatedAt: new Date().toISOString() };
  },

  async listPredictions(issueId?: string) {
    if (issueId) return db.select().from(modelPredictions).where(eq(modelPredictions.issueId, issueId));
    return db.select().from(modelPredictions);
  },

  async listAbstentions() {
    return db.select().from(modelPredictions).where(eq(modelPredictions.abstained, true));
  },

  async listDuplicates(status?: string) {
    if (status) return db.select().from(issueDuplicates).where(eq(issueDuplicates.status, status));
    return db.select().from(issueDuplicates);
  },

  metadata() {
    return { modelVersion: AI_VERSION, dataVersion: AI_DATA_VERSION, modules: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'], calibrationVersion: CALIBRATION_VERSION };
  },
};
