import { benchmarkCases } from './benchmark.js';
import type { Category } from '../../shared/types.js';

type Model = { vocabulary: Set<string>; labels: Category[]; priors: Map<Category, number>; counts: Map<Category, Map<string, number>>; totals: Map<Category, number> };

function tokenize(text: string) {
  return text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function train(): Model {
  const training = benchmarkCases.filter((item) => item.split === 'train');
  const labels = Array.from(new Set(training.map((item) => item.category)));
  const vocabulary = new Set<string>();
  const counts = new Map<Category, Map<string, number>>();
  const totals = new Map<Category, number>();
  for (const label of labels) { counts.set(label, new Map()); totals.set(label, 0); }
  for (const item of training) {
    const categoryCounts = counts.get(item.category)!;
    for (const token of tokenize(item.text)) {
      vocabulary.add(token);
      categoryCounts.set(token, (categoryCounts.get(token) ?? 0) + 1);
      totals.set(item.category, totals.get(item.category)! + 1);
    }
  }
  const priors = new Map(labels.map((label) => [label, training.filter((item) => item.category === label).length / training.length] as [Category, number]));
  return { vocabulary, labels, priors, counts, totals };
}

const model = train();

export function predictTrainedCategory(text: string) {
  const tokens = tokenize(text);
  const scores = model.labels.map((label) => {
    const counts = model.counts.get(label)!;
    const denominator = model.totals.get(label)! + model.vocabulary.size;
    const score = Math.log(model.priors.get(label)!) + tokens.reduce((sum, token) => sum + Math.log(((counts.get(token) ?? 0) + 1) / denominator), 0);
    return { label, score };
  }).sort((left, right) => right.score - left.score);
  const max = scores[0].score;
  const probabilities = scores.map((item) => ({ ...item, probability: Math.exp(item.score - max) }));
  const normalizer = probabilities.reduce((sum, item) => sum + item.probability, 0);
  return { label: probabilities[0].label, confidence: probabilities[0].probability / normalizer, vocabularySize: model.vocabulary.size, trainingRecords: benchmarkCases.filter((item) => item.split === 'train').length };
}
