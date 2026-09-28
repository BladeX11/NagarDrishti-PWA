import { Router } from 'express';
import { scorecardService } from '../services/scorecardService.js';
import { db } from '../db/index.js';
import { issues } from '../db/schema.js';
import { inactionService } from '../services/inactionService.js';

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

router.get('/neglect-zones', async (req, res) => {
  try {
    const allIssues = await db.select({ 
      id: issues.id, wardId: issues.wardId, status: issues.status, createdAt: issues.createdAt
    }).from(issues);

    // Only active issues can qualify a ward as a Neglect Zone — resolved ones must not count
    const activeIssues = allIssues.filter(i =>
      ['Open', 'Triaged', 'Assigned', 'In Progress', 'Reopened'].includes(i.status)
    );

    const tierMap = await inactionService.batchComputeTiers(activeIssues);
    const enriched = activeIssues.map(i => ({ ...i, tier: tierMap.get(i.id)?.tier ?? 0 }));
    const result = await inactionService.computeNeglectZones(enriched);
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
