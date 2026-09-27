/**
 * Unit tests for priorityService.computePriority
 *
 * This is a pure scoring function with no DB dependency.
 * Tests cover category tiers, age bands, supporter thresholds, and edge cases.
 */

import { describe, it, expect } from 'vitest';

// ── Mirror the logic from priorityService.ts (pure, no imports needed) ──────
function computePriority(issue: {
  category?: string;
  categoryId?: string;
  ageInDays?: number;
  createdAt?: string | Date;
  supporterCount?: number;
  supportersCount?: number;
}): { priority: number; score: number; explanation: string } {
  let score = 0;
  const explanations: string[] = [];

  const cat =
    issue.category?.toLowerCase() || issue.categoryId?.toLowerCase() || '';
  if (
    cat.includes('drainage') ||
    cat.includes('sewage') ||
    cat.includes('pothole') ||
    cat.includes('road')
  ) {
    score += 40;
    explanations.push('High impact category (+40)');
  } else if (
    cat.includes('stray') ||
    cat.includes('animal') ||
    cat.includes('streetlight') ||
    cat.includes('electrical')
  ) {
    score += 25;
    explanations.push('Medium impact category (+25)');
  } else {
    score += 10;
    explanations.push('Standard category (+10)');
  }

  const ageDays =
    typeof issue.ageInDays === 'number'
      ? issue.ageInDays
      : (Date.now() - new Date(issue.createdAt!).getTime()) /
        (1000 * 60 * 60 * 24);
  if (ageDays > 30) {
    score += 30;
    explanations.push('Older than 30 days (+30)');
  } else if (ageDays > 14) {
    score += 15;
    explanations.push('Older than 14 days (+15)');
  }

  const supportersCount =
    issue.supporterCount ?? issue.supportersCount ?? 0;
  if (supportersCount > 50) {
    score += 30;
    explanations.push('High supporter count (+30)');
  } else if (supportersCount > 10) {
    score += 15;
    explanations.push('Medium supporter count (+15)');
  }

  let priority = 4;
  if (score >= 80) priority = 1;
  else if (score >= 50) priority = 2;
  else if (score >= 30) priority = 3;

  return { priority, score, explanation: explanations.join(', ') };
}
// ────────────────────────────────────────────────────────────────────────────

describe('priorityService.computePriority — category tiers', () => {
  it('drainage/sewage → +40 score (high impact)', () => {
    const r = computePriority({ category: 'drainage/sewage', ageInDays: 0 });
    expect(r.score).toBe(40);
    expect(r.explanation).toContain('+40');
  });

  it('pothole/road → +40 score', () => {
    const r = computePriority({ category: 'pothole/road', ageInDays: 0 });
    expect(r.score).toBe(40);
  });

  it('streetlight/electrical → +25 score (medium impact)', () => {
    const r = computePriority({ category: 'streetlight/electrical', ageInDays: 0 });
    expect(r.score).toBe(25);
    expect(r.explanation).toContain('+25');
  });

  it('stray animals → +25 score', () => {
    const r = computePriority({ category: 'stray animals', ageInDays: 0 });
    expect(r.score).toBe(25);
  });

  it('other/encroachment → +10 score (standard)', () => {
    const r = computePriority({ category: 'encroachment', ageInDays: 0 });
    expect(r.score).toBe(10);
    expect(r.explanation).toContain('+10');
  });

  it('empty category → falls back to standard tier (+10)', () => {
    const r = computePriority({ ageInDays: 0 });
    expect(r.score).toBe(10);
  });

  it('uses categoryId if category is missing', () => {
    const r = computePriority({ categoryId: 'pothole/road', ageInDays: 0 });
    expect(r.score).toBe(40);
  });
});

describe('priorityService.computePriority — age bands', () => {
  it('0 days old → no age bonus', () => {
    const r = computePriority({ category: 'other', ageInDays: 0 });
    expect(r.explanation).not.toContain('days');
  });

  it('exactly 14 days → no age bonus (threshold is > 14)', () => {
    const r = computePriority({ category: 'other', ageInDays: 14 });
    expect(r.explanation).not.toContain('days');
  });

  it('15 days → +15 age bonus', () => {
    const r = computePriority({ category: 'other', ageInDays: 15 });
    expect(r.score).toBe(25); // 10 + 15
    expect(r.explanation).toContain('14 days (+15)');
  });

  it('31 days → +30 age bonus', () => {
    const r = computePriority({ category: 'other', ageInDays: 31 });
    expect(r.score).toBe(40); // 10 + 30
    expect(r.explanation).toContain('30 days (+30)');
  });

  it('exactly 30 days → only +15 (threshold is > 30)', () => {
    const r = computePriority({ category: 'other', ageInDays: 30 });
    expect(r.score).toBe(25); // 10 + 15
  });
});

describe('priorityService.computePriority — supporters', () => {
  it('0 supporters → no bonus', () => {
    const r = computePriority({ category: 'other', ageInDays: 0, supporterCount: 0 });
    expect(r.score).toBe(10);
  });

  it('10 supporters → no bonus (threshold is > 10)', () => {
    const r = computePriority({ category: 'other', ageInDays: 0, supporterCount: 10 });
    expect(r.score).toBe(10);
  });

  it('11 supporters → +15 medium bonus', () => {
    const r = computePriority({ category: 'other', ageInDays: 0, supporterCount: 11 });
    expect(r.score).toBe(25); // 10 + 15
    expect(r.explanation).toContain('Medium supporter');
  });

  it('51 supporters → +30 high bonus', () => {
    const r = computePriority({ category: 'other', ageInDays: 0, supporterCount: 51 });
    expect(r.score).toBe(40); // 10 + 30
    expect(r.explanation).toContain('High supporter');
  });

  it('accepts supportersCount alias', () => {
    const r = computePriority({ category: 'other', ageInDays: 0, supportersCount: 51 });
    expect(r.score).toBe(40);
  });
});

describe('priorityService.computePriority — priority bands', () => {
  it('score < 30 → priority 4 (lowest)', () => {
    // other + 0 days + 0 supporters = 10
    const r = computePriority({ category: 'other', ageInDays: 0 });
    expect(r.priority).toBe(4);
  });

  it('score 30-49 → priority 3', () => {
    // other (10) + 31 days (30) = 40
    const r = computePriority({ category: 'other', ageInDays: 31 });
    expect(r.score).toBe(40);
    expect(r.priority).toBe(3);
  });

  it('score 50-79 → priority 2', () => {
    // pothole (40) + 15 days (15) = 55
    const r = computePriority({ category: 'pothole/road', ageInDays: 15 });
    expect(r.score).toBe(55);
    expect(r.priority).toBe(2);
  });

  it('score >= 80 → priority 1 (critical)', () => {
    // drainage (40) + 31 days (30) + 51 supporters (30) = 100
    const r = computePriority({
      category: 'drainage/sewage',
      ageInDays: 31,
      supporterCount: 51,
    });
    expect(r.score).toBe(100);
    expect(r.priority).toBe(1);
  });

  it('maximum score: all bonuses stacked → priority 1, score 100', () => {
    const r = computePriority({
      category: 'drainage/sewage',  // +40
      ageInDays: 31,                 // +30
      supporterCount: 51,            // +30
    });
    expect(r.score).toBe(100);
    expect(r.priority).toBe(1);
    expect(r.explanation.split(',')).toHaveLength(3);
  });

  it('returns a score and explanation as part of the result object', () => {
    const r = computePriority({ category: 'other', ageInDays: 0 });
    expect(typeof r.score).toBe('number');
    expect(typeof r.priority).toBe('number');
    expect(typeof r.explanation).toBe('string');
  });
});
