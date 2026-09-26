import { Router } from 'express';
import authRoutes from './auth.js';
import issueRoutes from './issues.js';
import mapRoutes from './map.js';
import transparencyRoutes from './transparency.js';
import researchRoutes from './research.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/issues', issueRoutes);
router.use('/map', mapRoutes);
router.use('/transparency', transparencyRoutes);
router.use('/research', researchRoutes);

export default router;
