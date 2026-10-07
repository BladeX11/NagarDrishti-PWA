import { Router } from 'express';
import { issueService } from '../services/issueService.js';
import { workflowService } from '../services/workflowService.js';
import { verificationService } from '../services/verificationService.js';
import { adversarialService } from '../services/adversarialService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { aiQueue } from '../ai/queue.js';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) return callback(new Error('Only image files are allowed'));
    callback(null, true);
  },
});
const uploadPhoto = (req: any, res: any, next: any) => upload.single('photo')(req, res, (error: any) => {
  if (!error) return next();
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: 'Photo must be 15 MB or smaller' });
  return res.status(400).json({ success: false, error: error.message || 'Photo upload failed' });
});

router.get('/', async (req, res) => {
  try {
    const issues = await issueService.listIssues(req.query);
    res.json({ success: true, data: issues });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/mine', requireAuth, requireRole('citizen'), async (req, res) => {
  try {
    const data = await issueService.listIssues({ ...req.query, reporterId: req.user!.id });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireAuth, requireRole('citizen'), uploadPhoto, async (req, res) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!req.body.category || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, error: 'Category and valid coordinates are required' });
    }
    const issue = await issueService.createIssue({
      ...req.body,
      latitude,
      longitude,
      photo: req.file ? {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      } : undefined,
    }, req.user!.id);
    res.json({ success: true, data: issue });
  } catch (error: any) {
    console.error('[POST /api/issues] ERROR:', error?.message ?? error);
    if (error?.message === 'An identical image has already been submitted for another issue.') {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message, detail: process.env.NODE_ENV !== 'production' ? error?.detail ?? error?.stack?.slice(0,300) : undefined });
    }
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
    
    // Async adversarial checks
    if (req.body.mediaId) {
      adversarialService.runProofChecks(req.params.id, req.body.mediaId).catch(err => {
        console.error('[adversarial] proof check failed for', req.params.id, err);
      });
    }

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

router.get('/:id/graph', async (req, res) => {
  try {
    const { issueGraphService } = await import('../ai/graph.js');
    const graph = await issueGraphService.list();
    res.json({
      success: true,
      data: {
        ...graph,
        nodes: graph.nodes.filter((node) => node.id === req.params.id),
        edges: graph.edges.filter((edge) => edge.issueAId === req.params.id || edge.issueBId === req.params.id),
        clusters: graph.clusters.filter((cluster) => cluster.issueIds.includes(req.params.id)),
      },
    });
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
router.post('/:id/media', requireAuth, requireRole('citizen', 'officer'), async (req, res) => {
  try {
    const { dataUrl, type } = req.body;
    if (!dataUrl) return res.status(400).json({ success: false, error: 'dataUrl required' });
    
    const { db } = await import('../db/index.js');
    const { issueMedia } = await import('../db/schema.js');
    const { createHash } = await import('crypto');
    
    const hash = createHash('sha256').update(dataUrl).digest('hex');
    
    await db.insert(issueMedia).values({
      issueId: req.params.id,
      type: type || 'before',
      privatePath: dataUrl,
      fileHash: hash,
      perceptualHash: hash.substring(0, 16), // Use part of hash as perceptual hash for simple identical image matching
    });
    
    res.json({ success: true, data: { status: 'saved' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
