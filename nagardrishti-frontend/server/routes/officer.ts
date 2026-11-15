import { Router } from 'express';
import { adversarialService } from '../services/adversarialService.js';
import { issueService } from '../services/issueService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_RESOLUTIONS = new Set(['dismissed', 'confirmed_fraud', 'false_positive']);

router.get('/issues/:id/flags', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  try {
    const resolvedId = await issueService.resolveIssueId(req.params.id);
    if (!resolvedId) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }
    const flags = await adversarialService.getActiveFlags(resolvedId);
    res.json({ success: true, data: flags });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/flags/:id/resolve', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Valid flag ID is required' });
    }
    const resolution = typeof req.body?.resolution === 'string' ? req.body.resolution.trim() : '';
    if (!VALID_RESOLUTIONS.has(resolution)) {
      return res.status(400).json({
        success: false,
        error: 'Resolution must be one of: dismissed, confirmed_fraud, false_positive',
      });
    }
    await adversarialService.resolveFlag(req.params.id, resolution, req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
