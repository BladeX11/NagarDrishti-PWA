import { Router } from 'express';
import authRoutes from './auth.js';
import issueRoutes from './issues.js';
import mapRoutes from './map.js';
import transparencyRoutes from './transparency.js';
import researchRoutes from './research.js';
import aiRoutes from './ai.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/issues', issueRoutes);
router.use('/map', mapRoutes);
router.use('/transparency', transparencyRoutes);
router.use('/research', researchRoutes);
router.use('/ai', aiRoutes);

export default router;
