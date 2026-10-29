import { Router } from 'express';
import { adversarialService } from '../services/adversarialService.js';
import { cascadeService } from '../services/cascadeService.js';
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

// ── N4 Cascade Endpoints ──────────────────────────────────────────────────────

router.get('/cascades', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  try {
    const alerts = await cascadeService.getActiveAlerts(req.query.wardId as string);
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cascades/:id/ack', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  try {
    await cascadeService.updateAlertStatus(req.params.id, 'acknowledged');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cascades/detect', requireAuth, requireRole('officer', 'admin'), async (req, res) => {
  try {
    const cascades = await cascadeService.detectCascades();
    res.json({ success: true, data: cascades });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

