import { Router } from 'express';
import { avg, count, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  adversarialFlags,
  evaluationAnnotations,
  issueDuplicates,
  issueMedia,
  issues,
  modelPredictions,
  verificationVotes,
} from '../db/schema.js';
import { auditService } from '../services/auditService.js';
import { aiOrchestrator } from '../ai/orchestrator.js';
import { issueGraphService } from '../ai/graph.js';
import { calibrationMetadata } from '../ai/calibration.js';
import { BENCHMARK_VERSION, benchmarkCases, duplicatePairs, EVALUATION_SEED } from '../evaluation/benchmark.js';
import { runEvaluation } from '../evaluation/runner.js';
import { annotationService } from '../evaluation/annotationService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('researcher', 'admin'));

router.get('/predictions', async (req, res) => {
  try {
    const issueId = typeof req.query.issueId === 'string' ? req.query.issueId : undefined;
    res.json({ success: true, data: await aiOrchestrator.listPredictions(issueId) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/abstentions', async (_req, res) => {
  try {
    res.json({ success: true, data: await aiOrchestrator.listAbstentions() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/duplicates', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ success: true, data: await aiOrchestrator.listDuplicates(status) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/graph', async (_req, res) => {
  try {
    res.json({ success: true, data: await issueGraphService.list() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/graph/rebuild', async (_req, res) => {
  try {
    res.json({ success: true, data: await issueGraphService.rebuild() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/proof-audit', async (_req, res) => {
  try {
    const recentFlags = await db
      .select()
      .from(adversarialFlags)
      .orderBy(desc(adversarialFlags.createdAt))
      .limit(100);

    const flaggedIssueIds = Array.from(
      new Set(recentFlags.map((flag) => flag.issueId).filter((id): id is string => Boolean(id)))
    );

    const proofCondition = flaggedIssueIds.length
      ? or(ne(issues.proofState, 'none'), inArray(issues.id, flaggedIssueIds))
      : ne(issues.proofState, 'none');

    const proofIssues = await db
      .select({
        id: issues.id,
        publicRef: issues.publicRef,
        title: issues.title,
        status: issues.status,
        proofState: issues.proofState,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .where(proofCondition)
      .orderBy(desc(issues.updatedAt))
      .limit(50);

    if (proofIssues.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const issueIds = proofIssues.map((issue) => issue.id);
    const [allFlags, allVotes, allPredictions, allMedia] = await Promise.all([
      db.select().from(adversarialFlags).where(inArray(adversarialFlags.issueId, issueIds)),
      db.select().from(verificationVotes).where(inArray(verificationVotes.issueId, issueIds)),
      db
        .select()
        .from(modelPredictions)
        .where(inArray(modelPredictions.issueId, issueIds))
        .orderBy(desc(modelPredictions.createdAt)),
      db
        .select({
          id: issueMedia.id,
          issueId: issueMedia.issueId,
          type: issueMedia.type,
          publicPath: issueMedia.publicPath,
          mimeType: issueMedia.mimeType,
          capturedAt: issueMedia.capturedAt,
          createdAt: issueMedia.createdAt,
        })
        .from(issueMedia)
        .where(inArray(issueMedia.issueId, issueIds)),
    ]);

    const data = proofIssues.map((issue) => {
      const issueFlags = allFlags.filter((flag) => flag.issueId === issue.id);
      const activeRules = new Set(issueFlags.filter((flag) => !flag.resolvedAt).map((flag) => flag.rule));
      const issueVotes = allVotes.filter((vote) => vote.issueId === issue.id);
      const fixed = issueVotes.filter((vote) => vote.vote === 'fixed').length;
      const notFixed = issueVotes.filter((vote) => vote.vote === 'not_fixed').length;
      const unsure = issueVotes.filter((vote) => vote.vote === 'unsure').length;
      const m5Pred = allPredictions.find((pred) => pred.issueId === issue.id && pred.module === 'M5');
      const safeMedia = allMedia.filter(
        (item) => item.issueId === issue.id && (item.type === 'after' || item.type === 'proof')
      );

      return {
        issueId: issue.id,
        publicRef: issue.publicRef,
        title: issue.title,
        status: issue.status,
        proofState: issue.proofState,
        updatedAt: issue.updatedAt,
        flags: issueFlags,
        signals: {
          locationMatch: activeRules.has('GPS_MISMATCH') ? 'WARNING' : 'PASS',
          timePlausibility: activeRules.has('TEMPORAL') ? 'WARNING' : 'PASS',
          reuseDetection: activeRules.has('PHOTO_REUSE') ? 'WARNING' : 'PASS',
          bulkClosure: activeRules.has('BULK_CLOSURE') ? 'WARNING' : 'PASS',
        },
        confidence:
          m5Pred?.calibratedConfidence ??
          m5Pred?.confidence ??
          Math.max(0.25, Number((0.9 - activeRules.size * 0.25).toFixed(2))),
        modelVersion: m5Pred?.modelVersion ?? 'adversarial-rules-v1.0',
        verificationVotes: {
          fixed,
          notFixed,
          unsure,
          total: issueVotes.length,
        },
        media: safeMedia,
      };
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/metrics', async (_req, res) => {
  try {
    const [
      [predictionSummary],
      [abstentionSummary],
      [issueSummary],
      [duplicateSummary],
      [flagSummary],
      [unresolvedFlagSummary],
      [annotationSummary],
    ] = await Promise.all([
      db
        .select({
          total: count(),
          avgConfidence: avg(modelPredictions.confidence),
        })
        .from(modelPredictions),
      db
        .select({ total: count() })
        .from(modelPredictions)
        .where(eq(modelPredictions.abstained, true)),
      db.select({ total: count() }).from(issues),
      db.select({ total: count() }).from(issueDuplicates),
      db.select({ total: count() }).from(adversarialFlags),
      db
        .select({ total: count() })
        .from(adversarialFlags)
        .where(isNull(adversarialFlags.resolvedAt)),
      db.select({ total: count() }).from(evaluationAnnotations),
    ]);

    const evaluation = runEvaluation();
    const fullClassification = evaluation.classification.find((row) => row.name === 'full');
    const fullDuplicate = evaluation.duplicates.find((row) => row.name === 'full');
    const ai = aiOrchestrator.metadata();
    const totalPredictions = Number(predictionSummary?.total ?? 0);
    const totalIssues = Number(issueSummary?.total ?? 0);
    const totalAnnotations = Number(annotationSummary?.total ?? 0);
    const avgConfidence =
      predictionSummary?.avgConfidence != null ? Number(Number(predictionSummary.avgConfidence).toFixed(4)) : 0;

    return res.json({
      success: true,
      data: {
        activeExperiments: ai.modules.length,
        totalImpact: totalPredictions + totalIssues + totalAnnotations,
        ai,
        counts: {
          predictions: totalPredictions,
          abstentions: Number(abstentionSummary?.total ?? 0),
          issues: totalIssues,
          duplicates: Number(duplicateSummary?.total ?? 0),
          adversarialFlags: Number(flagSummary?.total ?? 0),
          unresolvedFlags: Number(unresolvedFlagSummary?.total ?? 0),
          annotations: totalAnnotations,
        },
        avgConfidence,
        evaluation: {
          benchmarkVersion: evaluation.benchmark.version,
          benchmarkCases: evaluation.benchmark.cases,
          duplicatePairs: evaluation.benchmark.duplicatePairs,
          fullMacroF1: fullClassification?.f1 ?? null,
          fullEce: fullClassification?.calibration.ece ?? null,
          duplicateF1: fullDuplicate?.f1 ?? null,
          priorityAccuracy: evaluation.priority.accuracy,
          generatedAt: evaluation.generatedAt,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ai/metadata', (_req, res) => {
  res.json({ success: true, data: { ...aiOrchestrator.metadata(), calibration: calibrationMetadata() } });
});

router.get('/evaluation/benchmark', (_req, res) => {
  res.json({ success: true, data: { version: BENCHMARK_VERSION, seed: EVALUATION_SEED, cases: benchmarkCases, duplicatePairs } });
});

router.get('/evaluation', (_req, res) => {
  res.json({ success: true, data: runEvaluation() });
});

router.post('/evaluation/run', (_req, res) => {
  res.json({ success: true, data: runEvaluation() });
});

router.get('/annotation/tasks', async (req, res) => {
  try {
    const annotatorId = typeof req.query.annotatorId === 'string' ? req.query.annotatorId : 'annotator-a';
    res.json({ success: true, data: await annotationService.listTasks(annotatorId) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/annotation', async (req, res) => {
  try {
    const annotation = await annotationService.save({ ...req.body, priority: Number(req.body.priority) });
    res.status(201).json({ success: true, data: annotation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/annotation/stats', async (_req, res) => {
  try {
    res.json({ success: true, data: await annotationService.stats() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/annotation/export', async (_req, res) => {
  try {
    const rows = await annotationService.exportRows();
    const header = 'record_id,annotator_id,category,priority,duplicate_label,rationale,created_at';
    const csv = [header, ...rows.map((row) => [row.recordId, row.annotatorId, row.category, row.priority, row.duplicateLabel ?? '', row.rationale ?? '', row.createdAt?.toISOString() ?? ''].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
    res.type('text/csv').set('Content-Disposition', 'attachment; filename="civictrust-annotations.csv"').send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit-ledger', async (_req, res) => {
  try {
    const result = await auditService.verifyChainIntegrity();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/verify-chain', async (_req, res) => {
  try {
    const result = await auditService.verifyChainIntegrity();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
