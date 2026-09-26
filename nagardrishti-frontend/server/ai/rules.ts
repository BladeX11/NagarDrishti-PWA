import type { Category } from '../../shared/types.js';
import { clamp, jaccardSimilarity } from './features.js';
import type { DuplicateCandidate, IssueInferenceContext, Prediction } from './contracts.js';
import { AI_DATA_VERSION, AI_VERSION } from './contracts.js';

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  'pothole/road': ['pothole', 'road', 'pavement', 'footpath', 'रस्ता', 'खड्डा'],
  'garbage/waste': ['garbage', 'waste', 'bin', 'litter', 'कचरा'],
  'drainage/sewage': ['drain', 'sewage', 'waterlogging', 'manhole', 'नाला'],
  'water supply': ['water', 'supply', 'leak', 'pressure', 'पाणी'],
  'streetlight/electrical': ['streetlight', 'lamp', 'dark', 'electric', 'light'],
  'stray animals': ['dog', 'cattle', 'animal', 'stray', 'कुत्रा'],
  encroachment: ['encroachment', 'blocked', 'stall', 'dumping', 'obstruction'],
  other: [],
};

const DEPARTMENTS: Record<Category, string> = {
  'pothole/road': 'roads', 'garbage/waste': 'waste', 'drainage/sewage': 'drainage', 'water supply': 'water',
  'streetlight/electrical': 'electrical', 'stray animals': 'animals', encroachment: 'civic-works', other: 'civic-works',
};

function categoryScore(text: string, category: Category): number {
  const normalized = text.toLowerCase();
  const matches = CATEGORY_KEYWORDS[category].filter((keyword) => normalized.includes(keyword)).length;
  return clamp(matches / Math.max(1, CATEGORY_KEYWORDS[category].length > 3 ? 2 : 1));
}

export function predictCategory(context: IssueInferenceContext): Prediction<Category> {
  const text = `${context.title} ${context.description}`;
  const scores = (Object.keys(CATEGORY_KEYWORDS) as Category[]).map((category) => ({ category, score: categoryScore(text, category) }));
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0].score > 0 ? scores[0] : { category: context.category as Category, score: 0.55 };
  const confidence = clamp(0.55 + top.score * 0.4);
  return {
    module: 'M1', prediction: top.category, confidence, modelVersion: AI_VERSION, dataVersion: AI_DATA_VERSION, status: 'pending',
    explanation: top.score > 0 ? `Keyword evidence supports ${top.category}.` : 'No strong keyword signal; retaining the stored category as a manual baseline.',
    signals: [{ signal: 'category_keyword_evidence', value: top.category, contribution: top.score }],
  };
}

export function predictDepartment(category: Category): Prediction<string> {
  const department = DEPARTMENTS[category] ?? DEPARTMENTS.other;
  return {
    module: 'M2', prediction: department, confidence: 0.88, modelVersion: AI_VERSION, dataVersion: AI_DATA_VERSION, status: 'pending',
    explanation: `Category-to-service policy maps ${category} to ${department}.`,
    signals: [{ signal: 'category_department_policy', value: category, contribution: 1 }],
  };
}

export function predictPriority(context: IssueInferenceContext): Prediction<{ band: string; score: number }> {
  const safety = ['pothole/road', 'drainage/sewage', 'water supply'].includes(context.category) ? 0.9 : 0.55;
  const age = clamp(context.ageInDays / 30);
  const support = clamp(context.supporterCount / 25);
  const sla = context.slaBreach ? 1 : 0;
  const score = Math.round((safety * 0.4 + age * 0.2 + support * 0.2 + sla * 0.2) * 100);
  const band = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';
  return {
    module: 'M4', prediction: { band, score }, confidence: 0.76, modelVersion: AI_VERSION, dataVersion: AI_DATA_VERSION, status: 'pending',
    explanation: `Priority is ${band} because safety=${safety.toFixed(2)}, age=${context.ageInDays}d, supporters=${context.supporterCount}, SLA breach=${context.slaBreach}.`,
    signals: [
      { signal: 'safety_category', value: context.category, contribution: safety * 0.4 },
      { signal: 'issue_age', value: context.ageInDays, contribution: age * 0.2 },
      { signal: 'supporter_count', value: context.supporterCount, contribution: support * 0.2 },
      { signal: 'sla_breach', value: context.slaBreach, contribution: sla * 0.2 },
    ],
  };
}

export function scoreDuplicate(context: IssueInferenceContext, candidate: IssueInferenceContext & { publicRef: string }): DuplicateCandidate {
  const distanceMetres = candidate.latitude === context.latitude && candidate.longitude === context.longitude ? 0 : 1;
  const textSimilarity = jaccardSimilarity(`${context.title} ${context.description}`, `${candidate.title} ${candidate.description}`);
  const categoryMatch = context.category === candidate.category;
  const spatialSignal = distanceMetres === 0 ? 1 : 0;
  const score = clamp(spatialSignal * 0.45 + textSimilarity * 0.35 + (categoryMatch ? 0.2 : 0));
  const reasons = [
    categoryMatch ? 'same category' : 'different category',
    textSimilarity > 0.2 ? 'similar description terms' : 'weak text overlap',
    spatialSignal ? 'same coordinate in demo fixture' : 'candidate requires geospatial distance check',
  ];
  return { issueId: candidate.issueId, publicRef: candidate.publicRef, distanceMetres, textSimilarity, categoryMatch, score, reasons };
}

export function predictProof(hasProof: boolean): Prediction<{ state: string }> {
  const state = hasProof ? 'needs_review' : 'missing';
  return {
    module: 'M6', prediction: { state }, confidence: hasProof ? 0.6 : 0.98, modelVersion: AI_VERSION, dataVersion: AI_DATA_VERSION, status: 'pending',
    explanation: hasProof ? 'Proof exists but requires media, location, and timestamp checks before acceptance.' : 'No proof media is attached; resolution cannot be claimed.',
    signals: [{ signal: 'proof_present', value: hasProof, contribution: hasProof ? 1 : 0 }],
  };
}
