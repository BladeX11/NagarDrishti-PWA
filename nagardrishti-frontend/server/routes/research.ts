import { Router } from 'express';
import { auditService } from '../services/auditService.js';
import { aiOrchestrator } from '../ai/orchestrator.js';
import { issueGraphService } from '../ai/graph.js';
import { calibrationMetadata } from '../ai/calibration.js';
import { BENCHMARK_VERSION, benchmarkCases, duplicatePairs, EVALUATION_SEED } from '../evaluation/benchmark.js';
import { runEvaluation } from '../evaluation/runner.js';
import { annotationService } from '../evaluation/annotationService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/predictions', async (req, res) => {
  const issueId = typeof req.query.issueId === 'string' ? req.query.issueId : undefined;
  res.json({ success: true, data: await aiOrchestrator.listPredictions(issueId) });
});

router.get('/abstentions', async (_req, res) => {
  try {
    res.json({ success: true, data: await aiOrchestrator.listAbstentions() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/duplicates', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({ success: true, data: await aiOrchestrator.listDuplicates(status) });
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

router.get('/proof-audit', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/metrics', (req, res) => {
  res.json({ success: true, data: { activeExperiments: 0, totalImpact: 0, ai: aiOrchestrator.metadata() } });
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

router.get('/annotation/tasks', requireAuth, requireRole('researcher'), async (req, res) => {
  try {
    const annotatorId = typeof req.query.annotatorId === 'string' ? req.query.annotatorId : 'annotator-a';
    res.json({ success: true, data: await annotationService.listTasks(annotatorId) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/annotation', requireAuth, requireRole('researcher'), async (req, res) => {
  try {
    const annotation = await annotationService.save({ ...req.body, priority: Number(req.body.priority) });
    res.status(201).json({ success: true, data: annotation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/annotation/stats', requireAuth, requireRole('researcher'), async (_req, res) => {
  try {
    res.json({ success: true, data: await annotationService.stats() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/annotation/export', requireAuth, requireRole('researcher'), async (_req, res) => {
  try {
    const rows = await annotationService.exportRows();
    const header = 'record_id,annotator_id,category,priority,duplicate_label,rationale,created_at';
    const csv = [header, ...rows.map((row) => [row.recordId, row.annotatorId, row.category, row.priority, row.duplicateLabel ?? '', row.rationale ?? '', row.createdAt?.toISOString() ?? ''].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
    res.type('text/csv').set('Content-Disposition', 'attachment; filename="civictrust-annotations.csv"').send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/audit-ledger', async (req, res) => {
  try {
    const result = await auditService.verifyChainIntegrity();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/verify-chain', async (req, res) => {
  try {
    const result = await auditService.verifyChainIntegrity();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
