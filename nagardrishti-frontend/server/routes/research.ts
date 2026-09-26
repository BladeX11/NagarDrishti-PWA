import { Router } from 'express';
import { auditService } from '../services/auditService.js';
import { aiOrchestrator } from '../ai/orchestrator.js';

const router = Router();

router.get('/predictions', async (req, res) => {
  const issueId = typeof req.query.issueId === 'string' ? req.query.issueId : undefined;
  res.json({ success: true, data: await aiOrchestrator.listPredictions(issueId) });
});

router.get('/duplicates', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({ success: true, data: await aiOrchestrator.listDuplicates(status) });
});

router.get('/proof-audit', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/metrics', (req, res) => {
  res.json({ success: true, data: { activeExperiments: 0, totalImpact: 0, ai: aiOrchestrator.metadata() } });
});

router.get('/ai/metadata', (_req, res) => {
  res.json({ success: true, data: aiOrchestrator.metadata() });
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
