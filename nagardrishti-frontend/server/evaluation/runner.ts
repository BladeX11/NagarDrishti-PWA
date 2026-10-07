import { BENCHMARK_VERSION, benchmarkCases, duplicatePairs, EVALUATION_SEED, predictCategory, predictDuplicate } from './benchmark.js';
import type { Category } from '../../shared/types.js';
import { predictTrainedCategory } from './trainedModel.js';

type ClassificationRow = { truth: Category; prediction: Category; confidence: number };

function classificationMetrics(rows: ClassificationRow[]) {
  const labels = Array.from(new Set(rows.map((row) => row.truth)));
  const perClass = labels.map((label) => {
    const tp = rows.filter((row) => row.truth === label && row.prediction === label).length;
    const fp = rows.filter((row) => row.truth !== label && row.prediction === label).length;
    const fn = rows.filter((row) => row.truth === label && row.prediction !== label).length;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    return { label, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0 };
  });
  return {
    precision: perClass.reduce((sum, row) => sum + row.precision, 0) / labels.length,
    recall: perClass.reduce((sum, row) => sum + row.recall, 0) / labels.length,
    f1: perClass.reduce((sum, row) => sum + row.f1, 0) / labels.length,
    perClass,
  };
}

function calibrationMetrics(rows: Array<{ correct: boolean; confidence: number }>) {
  const bins = Array.from({ length: 5 }, (_, index) => {
    const lower = index / 5;
    const values = rows.filter((row) => row.confidence >= lower && row.confidence < lower + 0.2 || index === 4 && row.confidence === 1);
    const accuracy = values.length ? values.filter((row) => row.correct).length / values.length : 0;
    const confidence = values.length ? values.reduce((sum, row) => sum + row.confidence, 0) / values.length : 0;
    return { bin: `${lower.toFixed(1)}-${(lower + 0.2).toFixed(1)}`, count: values.length, accuracy, confidence };
  });
  const total = rows.length || 1;
  return {
    ece: bins.reduce((sum, bin) => sum + (bin.count / total) * Math.abs(bin.accuracy - bin.confidence), 0),
    brier: rows.reduce((sum, row) => sum + (row.confidence - (row.correct ? 1 : 0)) ** 2, 0) / total,
    bins,
  };
}

function selectiveRisk(rows: Array<{ correct: boolean; confidence: number }>) {
  return [0.4, 0.6, 0.8, 1].map((coverage) => {
    const accepted = [...rows].sort((a, b) => b.confidence - a.confidence).slice(0, Math.max(1, Math.ceil(rows.length * coverage)));
    return { coverage: accepted.length / rows.length, risk: 1 - accepted.filter((row) => row.correct).length / accepted.length };
  });
}

function runClassification(mode: 'prior' | 'keyword' | 'multilingual' | 'full' | 'trained_nb') {
  const evaluationCases = benchmarkCases.filter((item) => item.split === 'test');
  const predictions = evaluationCases.map((item) => mode === 'trained_nb' ? predictTrainedCategory(item.text) : predictCategory(item, mode));
  const rows = evaluationCases.map((item, index) => ({ truth: item.category, prediction: predictions[index].label, confidence: predictions[index].confidence }));
  const metrics = classificationMetrics(rows);
  const calibrationRows = rows.map((row) => ({ correct: row.truth === row.prediction, confidence: row.confidence }));
  return { name: mode, task: 'category_classification', ...metrics, calibration: calibrationMetrics(calibrationRows), selectiveRisk: selectiveRisk(calibrationRows), predictions: rows.length };
}

function priorityPrediction(text: string): 1 | 2 | 3 | 4 {
  return /urgent|hazard|तत्काल|तातडीचा/i.test(text) ? 4 : 2;
}

function priorityEvaluation() {
  const rows = benchmarkCases.filter((item) => item.split === 'test').map((item) => ({ truth: item.priority, prediction: priorityPrediction(item.text) }));
  return { accuracy: rows.filter((row) => row.truth === row.prediction).length / rows.length, records: rows.length };
}

function annotationAgreement() {
  const labels = benchmarkCases.map((item) => item.category);
  const annotators = [labels, labels.map((label, index) => index % 37 === 0 ? 'other' : label), labels.map((label, index) => index % 53 === 0 ? 'other' : label)];
  const pair = (left: string[], right: string[]) => left.filter((label, index) => label === right[index]).length / left.length;
  return { annotators: 3, pairwiseAgreement: [pair(annotators[0], annotators[1]), pair(annotators[0], annotators[2]), pair(annotators[1], annotators[2])], majorityAgreement: benchmarkCases.filter((_item, index) => annotators.filter((annotator) => annotator[index] === labels[index]).length >= 2).length / benchmarkCases.length, simulated: true };
}

function fairnessByLanguage() {
  return (['en', 'hi', 'mr'] as const).map((language) => {
    const group = benchmarkCases.filter((item) => item.split === 'test' && item.language === language);
    const predictions = group.map((item) => predictCategory(item, 'full'));
    return { group: language, records: group.length, accuracy: predictions.filter((prediction, index) => prediction.label === group[index].category).length / group.length };
  });
}

function runDuplicates(mode: 'spatial' | 'text' | 'combined' | 'full') {
  const rows = duplicatePairs.map((pair) => ({ truth: pair.isDuplicate, score: predictDuplicate(pair, mode).score }));
  const predictions = rows.map((row) => row.score >= 0.5);
  const tp = rows.filter((row, index) => row.truth && predictions[index]).length;
  const fp = rows.filter((row, index) => !row.truth && predictions[index]).length;
  const fn = rows.filter((row, index) => row.truth && !predictions[index]).length;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  return { name: mode, task: 'duplicate_detection', precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0, pairs: rows.length };
}

export function runEvaluation() {
  const classification = (['prior', 'keyword', 'multilingual', 'trained_nb', 'full'] as const).map(runClassification);
  const duplicates = (['spatial', 'text', 'combined', 'full'] as const).map(runDuplicates);
  return {
    benchmark: { version: BENCHMARK_VERSION, seed: EVALUATION_SEED, cases: benchmarkCases.length, duplicatePairs: duplicatePairs.length, languages: ['en', 'hi', 'mr'], splits: { train: benchmarkCases.filter((item) => item.split === 'train').length, validation: benchmarkCases.filter((item) => item.split === 'validation').length, test: benchmarkCases.filter((item) => item.split === 'test').length } },
    classification,
    duplicates,
    priority: priorityEvaluation(),
    annotationAgreement: annotationAgreement(),
    fairness: { byLanguage: fairnessByLanguage() },
    generatedAt: new Date().toISOString(),
  };
}
