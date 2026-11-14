import { Router } from "express";
import { CATEGORIES, type Category } from '../../shared/types.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { suggestCategory } from '../ai/categorySuggestion.js';

const router = Router();

router.post("/classify", requireAuth, requireRole('citizen', 'officer', 'admin', 'researcher'), async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const language = typeof req.body?.language === 'string' ? req.body.language.slice(0, 40) : 'English';
    const fallbackCategory = CATEGORIES.includes(req.body?.category as Category)
      ? req.body.category as Category
      : 'other';
    if (!text || text.length > 1000) {
      return res.status(400).json({ success: false, error: 'Enter a report description of 1 to 1000 characters.' });
    }
    const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : undefined;
    const result = await suggestCategory(text, language, fallbackCategory, imageDataUrl);
    return res.json({ success: true, data: result });
  } catch {
    return res.status(500).json({ success: false, error: 'Unable to suggest a category right now.' });
  }
});

export default router;
