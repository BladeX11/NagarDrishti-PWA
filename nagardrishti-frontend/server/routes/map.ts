import { Router } from 'express';
import { issueService } from '../services/issueService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, category, wardId } = req.query;
    const markers = await issueService.getMapMarkers({
      status: typeof status === 'string' ? status : undefined,
      category: typeof category === 'string' ? category : undefined,
      wardId: typeof wardId === 'string' ? wardId : undefined,
    });
    res.json({ success: true, data: markers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
