import { Router } from 'express';
import { issueService } from '../services/issueService.js';
import { workflowService } from '../services/workflowService.js';
import { verificationService } from '../services/verificationService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { aiQueue } from '../ai/queue.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const issues = await issueService.listIssues(req.query);
    res.json({ success: true, data: issues });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireAuth, requireRole('citizen'), async (req, res) => {
  try {
    const issue = await issueService.createIssue(req.body, req.user!.id);
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const issue = await issueService.getIssue(req.params.id);
    if (!issue) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id', requireAuth, requireRole('officer'), async (req, res) => {
  try {
    const issue = await issueService.updateIssue(req.params.id, req.body);
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/support', requireAuth, requireRole('citizen'), async (req, res) => {
  try {
    const issue = await issueService.supportIssue(req.params.id, req.user!.id);
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/assign', requireAuth, requireRole('officer'), async (req, res) => {
  try {
    const issue = await workflowService.transitionStatus(req.params.id, 'Assigned', req.user!.id, req.user!.role, 'Assigned to officer');
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/status', requireAuth, requireRole('officer'), async (req, res) => {
  try {
    const { toStatus, reason } = req.body;
    const issue = await workflowService.transitionStatus(req.params.id, toStatus, req.user!.id, req.user!.role, reason);
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/proof', requireAuth, requireRole('officer'), async (req, res) => {
  try {
    const issue = await issueService.submitProof(req.params.id, req.body.note);
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/verify', requireAuth, requireRole('citizen'), async (req, res) => {
  try {
    const { vote, proofVersion } = req.body;
    const result = await verificationService.castVote(req.params.id, req.user!.id, vote, proofVersion ?? 1);
    const summary = await verificationService.getVoteSummary(req.params.id);
    res.json({ success: true, data: { vote: result, summary } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/timeline', async (req, res) => {
  try {
    const { auditService } = await import('../services/auditService.js');
    const timeline = await auditService.getIssueTimeline(req.params.id);
    res.json({ success: true, data: timeline });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/duplicates', async (req, res) => {
  try {
    const { aiOrchestrator } = await import('../ai/orchestrator.js');
    const data = await aiOrchestrator.listDuplicates();
    res.json({ success: true, data: data.filter((item) => item.issueAId === req.params.id || item.issueBId === req.params.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/ai/infer', requireAuth, requireRole('officer', 'admin', 'researcher'), async (req, res) => {
  try {
    const job = await aiQueue.enqueueIssueInference(req.params.id);
    res.status(202).json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
