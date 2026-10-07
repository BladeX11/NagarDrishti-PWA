import { Router } from "express";

const router = Router();

const RULES = [
  { keywords: ["pothole","road","tar","asphalt","crack","pavement","speed bump","broken road","manhole"], category: "pothole/road", confidence: 0.87 },
  { keywords: ["garbage","waste","trash","dump","litter","rubbish","smell","dirty","plastic","overflowing"], category: "garbage/waste", confidence: 0.84 },
  { keywords: ["drain","drainage","sewer","sewage","overflow","flood","waterlog","stagnant","blockage"], category: "drainage/sewage", confidence: 0.85 },
  { keywords: ["water","supply","tap","pipe","leak","no water","shortage","contamination","pressure"], category: "water supply", confidence: 0.82 },
  { keywords: ["streetlight","light","lamp","electric","dark","pole","wire","power","street lamp"], category: "streetlight/electrical", confidence: 0.83 },
  { keywords: ["dog","animal","stray","cow","pig","monkey","cat","bite","attack","menace"], category: "stray animals", confidence: 0.80 },
  { keywords: ["encroach","encroachment","occupy","illegal","hawker","footpath","block","construction"], category: "encroachment", confidence: 0.78 },
];

const DEFAULT = { category: "other", confidence: 0.55 };

function classify(text: string) {
  const lower = text.toLowerCase();
  let best = DEFAULT;
  for (const rule of RULES) {
    const matched = rule.keywords.filter(k => lower.includes(k)).length;
    if (matched > 0) {
      const conf = Math.min(0.97, rule.confidence + matched * 0.02);
      if (conf > best.confidence) {
        best = { category: rule.category, confidence: conf };
      }
    }
  }
  return best;
}

router.post("/classify", (req, res) => {
  try {
    const { text = "" } = req.body;
    if (!text.trim()) {
      return res.json({ success: true, data: { ...DEFAULT, modelVersion: "M1-rules-v0.1" } });
    }
    const result = classify(text);
    res.json({
      success: true,
      data: {
        category: result.category,
        confidence: Math.round(result.confidence * 100),
        modelVersion: "M1-rules-v0.1",
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
