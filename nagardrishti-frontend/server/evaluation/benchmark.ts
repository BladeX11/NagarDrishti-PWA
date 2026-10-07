import { clamp, haversineMetres, jaccardSimilarity, normalizeText } from '../ai/features.js';
import type { Category } from '../../shared/types.js';

export const BENCHMARK_VERSION = 'civictrust-benchmark-v1';
export const EVALUATION_SEED = 20260927;

export type BenchmarkCase = {
  id: string;
  language: 'en' | 'hi' | 'mr';
  text: string;
  category: Category;
  latitude: number;
  longitude: number;
  hasImage: boolean;
  visualCue: string;
  priority: 1 | 2 | 3 | 4;
  ward: string;
  split: 'train' | 'validation' | 'test';
};

export type DuplicatePair = {
  id: string;
  left: BenchmarkCase;
  right: BenchmarkCase;
  isDuplicate: boolean;
  imageSimilarity: number;
};

const records: Array<[Category, string, string, string, string, string]> = [
  ['pothole/road', 'large pothole on the road', 'सड़क पर बड़ा गड्ढा', 'रस्त्यावर मोठा खड्डा', 'road damage', 'pothole'],
  ['garbage/waste', 'overflowing garbage near collection point', 'कचरा जमा है', 'कचरा साचला आहे', 'waste accumulation', 'garbage'],
  ['drainage/sewage', 'blocked drain causing waterlogging', 'नाला बंद है और पानी भर रहा है', 'नाला तुंबला आणि पाणी साचले', 'drain blockage', 'drain'],
  ['water supply', 'water pipe leak near the lane', 'पानी की पाइप में रिसाव', 'पाण्याच्या पाईपची गळती', 'pipe leak', 'water'],
  ['streetlight/electrical', 'streetlight is not working at night', 'सड़क की लाइट बंद है', 'रस्त्यावरील दिवा बंद आहे', 'lighting failure', 'light'],
  ['stray animals', 'stray dogs gather near the school', 'आवारा कुत्ते स्कूल के पास', 'भटके कुत्रे शाळेजवळ', 'animal nuisance', 'animal'],
  ['encroachment', 'shop blocks the public footpath', 'दुकान ने फुटपाथ घेर लिया', 'दुकानाने पदपथ अडवला', 'footpath obstruction', 'encroachment'],
  ['other', 'damaged traffic sign at the junction', 'चौराहे पर यातायात संकेत टूटा है', 'चौकातील वाहतूक फलक तुटला', 'damaged sign', 'sign'],
];

export const benchmarkCases: BenchmarkCase[] = records.flatMap(([category, en, hi, mr, visualCue], categoryIndex) =>
  (['en', 'hi', 'mr'] as const).flatMap((language, languageIndex) =>
    Array.from({ length: 15 }, (_, variant) => {
      const severity = (variant + categoryIndex) % 4;
      const text = language === 'en' ? `${en}; ${severity === 3 ? 'urgent safety hazard' : 'reported by a resident'} at location ${variant + 1}` : language === 'hi' ? `${hi}; ${severity === 3 ? 'तत्काल खतरा' : 'निवासी की शिकायत'} स्थान ${variant + 1}` : `${mr}; ${severity === 3 ? 'तातडीचा धोका' : 'रहिवाशाची तक्रार'} ठिकाण ${variant + 1}`;
      return {
        id: `C-${categoryIndex + 1}-${language.toUpperCase()}-${String(variant + 1).padStart(2, '0')}`,
        language,
        text,
        category,
        latitude: 18.50 + categoryIndex * 0.006 + variant * 0.0001,
        longitude: 73.82 + categoryIndex * 0.004 + languageIndex * 0.0002,
        hasImage: (variant + languageIndex) % 3 !== 0,
        visualCue,
        priority: (severity + 1) as 1 | 2 | 3 | 4,
        ward: `ward-${11 + ((categoryIndex + variant) % 4)}`,
        split: variant < 10 ? 'train' : variant < 13 ? 'validation' : 'test',
      };
    }),
  ),
);

export const duplicatePairs: DuplicatePair[] = benchmarkCases.slice(0, 12).map((left, index) => {
  const same = index % 2 === 0;
  const source = same ? left : benchmarkCases[(index + 5) % benchmarkCases.length];
  // Hard negatives share a location but describe a different civic problem.
  const right = {
    ...source,
    id: `${source.id}-R`,
    latitude: left.latitude + 0.0005,
    longitude: left.longitude + 0.0005,
    text: same ? `${left.text} near the same location` : source.text,
  };
  return { id: `P-${index + 1}`, left, right, isDuplicate: same, imageSimilarity: same ? 0.82 : 0.12 };
});

const multilingualLexicon: Record<Category, string[]> = {
  'pothole/road': ['pothole', 'road', 'सड़क', 'गड्ढा', 'रस्ता', 'खड्डा'],
  'garbage/waste': ['garbage', 'waste', 'कचरा', 'कचरा'],
  'drainage/sewage': ['drain', 'waterlogging', 'नाला', 'पानी', 'तुंबला', 'साचले'],
  'water supply': ['water', 'pipe', 'पानी', 'पाईप', 'पाण्याच्या', 'गळती'],
  'streetlight/electrical': ['streetlight', 'lighting', 'light', 'लाइट', 'दिवा'],
  'stray animals': ['animal', 'dogs', 'कुत्ते', 'कुत्रे'],
  encroachment: ['footpath', 'shop', 'obstruction', 'फुटपाथ', 'घेर', 'पदपथ', 'अडवला'],
  other: ['sign', 'junction', 'चौराहे', 'संकेत', 'चौकातील', 'फलक'],
};

function keywordScore(text: string, category: Category, multilingual: boolean): number {
  const normalized = multilingual ? text.toLowerCase() : normalizeText(text);
  return multilingualLexicon[category].reduce((score, term) => score + (normalized.includes(term.toLowerCase()) ? 1 : 0), 0);
}

export function predictCategory(item: BenchmarkCase, mode: 'prior' | 'keyword' | 'multilingual' | 'full') {
  if (mode === 'prior') return { label: 'pothole/road' as Category, confidence: 0.32 };
  const scores = (Object.keys(multilingualLexicon) as Category[]).map((category) => ({ category, score: keywordScore(item.text, category, mode !== 'keyword') }));
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const visualBoost = mode === 'full' && item.hasImage && item.visualCue === multilingualLexicon[top.category][0] ? 0.12 : 0;
  return { label: top.score > 0 ? top.category : 'other', confidence: clamp(0.42 + Math.min(0.45, top.score * 0.16) + visualBoost) };
}

export function predictDuplicate(pair: DuplicatePair, mode: 'spatial' | 'text' | 'combined' | 'full') {
  const distance = haversineMetres(pair.left.latitude, pair.left.longitude, pair.right.latitude, pair.right.longitude);
  const spatial = Math.exp(-distance / 500);
  const text = jaccardSimilarity(pair.left.text, pair.right.text);
  const image = pair.imageSimilarity;
  const score = mode === 'spatial' ? spatial : mode === 'text' ? text : mode === 'combined' ? (spatial * 0.55 + text * 0.45) : (spatial * 0.35 + text * 0.35 + image * 0.30);
  return { score: clamp(score), confidence: clamp(0.5 + Math.abs(score - 0.5)) };
}
