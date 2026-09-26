import { Router } from 'express';
import { scorecardService } from '../services/scorecardService.js';

const router = Router();

router.get('/scorecards', async (req, res) => {
  try {
    const { wardId, departmentId } = req.query;
    const scorecard = await scorecardService.getScorecard({ 
      wardId: wardId as string, 
      departmentId: departmentId as string 
    });
    res.json({ success: true, data: scorecard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sla-breaches', async (req, res) => {
  try {
    const breaches = await scorecardService.computeSLABreaches();
    res.json({ success: true, data: breaches });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/forgotten', async (req, res) => {
  try {
    const forgotten = await scorecardService.computeForgottenIssues();
    res.json({ success: true, data: forgotten });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
