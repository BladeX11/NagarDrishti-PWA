import { Router } from 'express';
import { adversarialService } from '../services/adversarialService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/issues/:id/flags', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  try {
    const flags = await adversarialService.getActiveFlags(req.params.id);
    res.json({ success: true, data: flags });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/flags/:id/resolve', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  try {
    await adversarialService.resolveFlag(req.params.id, req.body.resolution, req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
