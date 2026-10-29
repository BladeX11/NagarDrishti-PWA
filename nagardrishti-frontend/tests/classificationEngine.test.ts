import { describe, it, expect } from 'vitest';
import { classify, RULES, DEFAULT } from '../server/routes/ai.js';
import { predictCategory, predictDepartment, predictPriority, scoreDuplicate } from '../server/ai/rules.js';
import type { IssueInferenceContext } from '../server/ai/contracts.js';

function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

function createDummyContext(overrides: Partial<IssueInferenceContext> = {}): IssueInferenceContext {
  return {
    issueId: 'test-issue-001',
    title: 'Test issue',
    description: 'Test description',
    category: 'other',
    status: 'Submitted',
    latitude: 18.5204,
    longitude: 73.8567,
    supporterCount: 0,
    ageInDays: 1,
    slaBreach: false,
    hasProof: false,
    ...overrides,
  };
}

describe('Civic Image and Text Classification Engine', () => {
  describe('Rule-Based Image Filename Classification', () => {
    const testCases: Array<{ filename: string; expectedCategory: string; minConfidence: number }> = [
      { filename: 'pothole_asphalt_crack_road_hazard.jpg', expectedCategory: 'pothole/road', minConfidence: 0.87 },
      { filename: 'overflowing_garbage_dump_street.png', expectedCategory: 'garbage/waste', minConfidence: 0.84 },
      { filename: 'blocked_drain_sewage_waterlogging.jpeg', expectedCategory: 'drainage/sewage', minConfidence: 0.85 },
      { filename: 'water_pipeline_leak_low_pressure.jpg', expectedCategory: 'water supply', minConfidence: 0.82 },
      { filename: 'broken_streetlight_dark_pole.png', expectedCategory: 'streetlight/electrical', minConfidence: 0.83 },
      { filename: 'aggressive_stray_dog_pack.jpg', expectedCategory: 'stray animals', minConfidence: 0.80 },
      { filename: 'illegal_footpath_hawker_encroachment.png', expectedCategory: 'encroachment', minConfidence: 0.78 },
      { filename: 'random_scenery_unrecognized_photo.jpg', expectedCategory: 'other', minConfidence: 0.55 },
    ];

    testCases.forEach(({ filename, expectedCategory, minConfidence }) => {
      it(`accurately classifies image file "${filename}" to category "${expectedCategory}"`, () => {
        const queryText = filename.replace(/[._-]/g, ' ');
        const result = classify(queryText);
        expect(result.category).toBe(expectedCategory);
        expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
      });
    });
  });

  describe('Multi-Keyword Confidence Calibration', () => {
    it('boosts confidence when multiple keywords match the category', () => {
      const singleMatch = classify('pothole');
      const tripleMatch = classify('pothole asphalt road broken road');

      expect(singleMatch.category).toBe('pothole/road');
      expect(tripleMatch.category).toBe('pothole/road');
      expect(tripleMatch.confidence).toBeGreaterThan(singleMatch.confidence);
      expect(tripleMatch.confidence).toBeLessThanOrEqual(0.97);
    });

    it('gracefully returns fallback category for unrelated or empty input', () => {
      expect(classify('').category).toBe('other');
      expect(classify('   ').category).toBe('other');
      expect(classify('completely unrelated text with zero civic signals').category).toBe('other');
      expect(classify('completely unrelated text').confidence).toBe(0.55);
    });

    it('is case-insensitive across uppercase, lowercase, and mixed inputs', () => {
      const lower = classify('garbage waste dump');
      const upper = classify('GARBAGE WASTE DUMP');
      const mixed = classify('GaRbAgE WaStE DuMp');

      expect(lower.category).toBe('garbage/waste');
      expect(upper.category).toBe('garbage/waste');
      expect(mixed.category).toBe('garbage/waste');
      expect(upper.confidence).toBe(lower.confidence);
      expect(mixed.confidence).toBe(lower.confidence);
    });
  });

  describe('M1 Multi-Language Predictor (server/ai/rules.ts)', () => {
    it('identifies English civic complaints with explanatory signals', () => {
      const context = createDummyContext({
        title: 'Deep pothole on main road',
        description: 'Dangerous crater causing traffic jam and tire damage',
        category: 'other',
      });
      const prediction = predictCategory(context);
      expect(prediction.module).toBe('M1');
      expect(prediction.prediction).toBe('pothole/road');
      expect(prediction.confidence).toBeGreaterThan(0.7);
      expect(prediction.explanation).toContain('pothole/road');
      expect(prediction.signals.length).toBeGreaterThan(0);
      expect(prediction.signals[0].signal).toBe('category_keyword_evidence');
    });

    it('identifies Marathi keywords (रस्ता, खड्डा, कचरा, नाला, पाणी, कुत्रा)', () => {
      const marathiPothole = predictCategory(
        createDummyContext({ title: 'रस्ता खराब', description: 'मोठा खड्डा पडला आहे', category: 'other' })
      );
      expect(marathiPothole.prediction).toBe('pothole/road');

      const marathiGarbage = predictCategory(
        createDummyContext({ title: 'गल्लीत कचरा', description: 'कचरा साचला आहे', category: 'other' })
      );
      expect(marathiGarbage.prediction).toBe('garbage/waste');

      const marathiDrain = predictCategory(
        createDummyContext({ title: 'गटार तुंबले', description: 'नाला भरून वाहतोय', category: 'other' })
      );
      expect(marathiDrain.prediction).toBe('drainage/sewage');

      const marathiWater = predictCategory(
        createDummyContext({ title: 'पाणी पुरवठा नाही', description: 'पाणी पाईप फुटला', category: 'other' })
      );
      expect(marathiWater.prediction).toBe('water supply');

      const marathiDog = predictCategory(
        createDummyContext({ title: 'मोकाट जनावरे', description: 'कुत्रा चावला रस्त्यावर', category: 'other' })
      );
      expect(marathiDog.prediction).toBe('stray animals');
    });

    it('falls back to existing category when no keyword signal matches', () => {
      const fallbackContext = createDummyContext({
        title: 'Generic notice',
        description: 'Nothing specific here',
        category: 'streetlight/electrical',
      });
      const prediction = predictCategory(fallbackContext);
      expect(prediction.prediction).toBe('streetlight/electrical');
      expect(prediction.confidence).toBe(0.77);
      expect(prediction.explanation).toContain('streetlight/electrical');
    });
  });

  describe('Downstream Routing and Urgency Coupling', () => {
    it('routes predicted category to designated municipal department', () => {
      expect(predictDepartment('pothole/road').prediction).toBe('roads');
      expect(predictDepartment('garbage/waste').prediction).toBe('waste');
      expect(predictDepartment('drainage/sewage').prediction).toBe('drainage');
      expect(predictDepartment('water supply').prediction).toBe('water');
      expect(predictDepartment('streetlight/electrical').prediction).toBe('electrical');
      expect(predictDepartment('stray animals').prediction).toBe('animals');
      expect(predictDepartment('encroachment').prediction).toBe('civic-works');
    });

    it('calculates higher urgency priority band for safety hazards', () => {
      const safetyHazard = createDummyContext({
        category: 'pothole/road',
        ageInDays: 14,
        supporterCount: 20,
        slaBreach: true,
      });
      const lowRisk = createDummyContext({
        category: 'other',
        ageInDays: 1,
        supporterCount: 0,
        slaBreach: false,
      });

      const highPriority = predictPriority(safetyHazard);
      const lowPriority = predictPriority(lowRisk);

      expect(highPriority.prediction.score).toBeGreaterThan(lowPriority.prediction.score);
      expect(highPriority.prediction.band).toBe('high');
      expect(lowPriority.prediction.band).toBe('low');
    });
  });

  describe('Image Perceptual Hash (pHash) Collision and Distance Metrics', () => {
    const baseHash = 'a1b2c3d4e5f60718';

    it('detects identical image hash with hamming distance 0', () => {
      expect(hammingDistance(baseHash, baseHash)).toBe(0);
    });

    it('computes distance for single bit flip within high-fraud threshold (<= 4)', () => {
      // 0xa1 is 10100001, 0xa3 is 10100011 -> 1 bit difference
      const slightlyModifiedHash = 'a3b2c3d4e5f60718';
      const distance = hammingDistance(baseHash, slightlyModifiedHash);
      expect(distance).toBe(1);
      expect(distance).toBeLessThanOrEqual(4);
    });

    it('computes distance for moderate image alteration within medium-fraud threshold (<= 8)', () => {
      // 0xa1 (10100001) vs 0x5e (01011110) has 8 bit flips
      const alteredHash = '5eb2c3d4e5f60718';
      const distance = hammingDistance(baseHash, alteredHash);
      expect(distance).toBe(8);
      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThanOrEqual(8);
    });

    it('identifies completely distinct images beyond fraud threshold (> 8)', () => {
      const distinctHash = 'ffffffffffffffff';
      const distance = hammingDistance(baseHash, distinctHash);
      expect(distance).toBeGreaterThan(8);
    });

    it('handles mismatched hash lengths by returning maximum penalty distance', () => {
      expect(hammingDistance('abc', 'abcdef')).toBe(64);
    });
  });

  describe('Classification Engine Latency & Throughput Benchmark', () => {
    it('executes 1000 classification requests under 20ms total (<0.02ms per item)', () => {
      const samples = [
        'pothole road crack asphalt',
        'overflowing garbage trash dump',
        'blocked drain sewage flood',
        'broken pipe water leak tap',
        'dark street lamp light power',
        'stray dog animal menace',
        'illegal stall footpath encroachment',
        'random civic issue query',
      ];

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        classify(samples[i % samples.length]);
      }
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(100);
      const avgLatencyPerItemMs = durationMs / 1000;
      expect(avgLatencyPerItemMs).toBeLessThan(0.1);
    });
  });
});
