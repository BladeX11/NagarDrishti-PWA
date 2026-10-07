import { Router } from 'express';
import { auditService } from '../services/auditService.js';
import { db } from '../db/index.js';
import { issues } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/audit/verify/:issueId
 * Verify the hash-chain integrity for a single issue (by UUID or public ref).
 * Returns chainValid, eventCount, and any broken event id.
 */
router.get('/verify/:issueId', async (req, res) => {
  try {
    const { issueId } = req.params;

    // Resolve public ref (e.g. ND-104) to UUID if needed
    const [found] = await db
      .select({ id: issues.id, publicRef: issues.publicRef })
      .from(issues)
      .where(or(eq(issues.id, issueId), eq(issues.publicRef, issueId)));

    if (!found) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    const timeline = await auditService.getIssueTimeline(found.id);

    if (timeline.length === 0) {
      return res.json({
        success: true,
        data: {
          issueId: found.id,
          publicRef: found.publicRef,
          chainValid: true,
          eventCount: 0,
          message: 'No events recorded yet',
          checkedAt: new Date().toISOString(),
        },
      });
    }

    // Walk the chain for this specific issue
    let valid = true;
    let brokenAt: string | undefined;
    let expectedPrev = 'GENESIS';

    for (const event of timeline) {
      if (event.prevHash !== expectedPrev) {
        valid = false;
        brokenAt = event.id;
        break;
      }
      const recomputed = auditService.computeEventHash(
        event.prevHash,
        event.issueId!,
        event.toStatus,
        event.actorId!,
        event.createdAt!
      );
      if (recomputed !== event.eventHash) {
        valid = false;
        brokenAt = event.id;
        break;
      }
      expectedPrev = event.eventHash;
    }

    res.json({
      success: true,
      data: {
        issueId: found.id,
        publicRef: found.publicRef,
        chainValid: valid,
        eventCount: timeline.length,
        brokenAt,
        latestHash: timeline[timeline.length - 1].eventHash,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/verify
 * Verify the global hash-chain integrity across all issues.
 * This is the tamper-evident ledger check.
 */
router.get('/verify', async (_req, res) => {
  try {
    const result = await auditService.verifyChainIntegrity();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
