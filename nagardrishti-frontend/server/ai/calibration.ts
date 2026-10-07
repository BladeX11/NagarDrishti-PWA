import { clamp } from './features.js';
import { CALIBRATION_VERSION, type Prediction } from './contracts.js';

type CalibrationResult = {
  calibratedConfidence: number;
  abstained: boolean;
  abstentionReason?: string;
};

const REVIEW_THRESHOLDS: Record<string, number> = {
  M1: 0.72,
  M2: 0.78,
  M4: 0.74,
  M6: 0.80,
};

function evidenceStrength(prediction: Prediction): number {
  if (prediction.signals.length === 0) return 0;
  const total = prediction.signals.reduce((sum, signal) => sum + Math.abs(signal.contribution), 0);
  return clamp(total / prediction.signals.length);
}

export function calibratePrediction(prediction: Prediction): Prediction {
  const rawConfidence = clamp(prediction.confidence);
  const evidence = evidenceStrength(prediction);

  // Shrink overconfident heuristic outputs toward the empirical prior when evidence is weak.
  const calibratedConfidence = clamp(0.5 + (rawConfidence - 0.5) * (0.65 + evidence * 0.35));
  const threshold = REVIEW_THRESHOLDS[prediction.module] ?? 0.75;
  const abstentionReason = calibratedConfidence < threshold
    ? `Calibrated confidence ${calibratedConfidence.toFixed(2)} is below the ${threshold.toFixed(2)} human-review threshold.`
    : undefined;

  return {
    ...prediction,
    rawConfidence,
    calibratedConfidence,
    confidence: calibratedConfidence,
    abstained: Boolean(abstentionReason),
    abstentionReason,
    status: abstentionReason ? 'needs_review' : prediction.status,
  };
}

export function calibrationMetadata() {
  return {
    version: CALIBRATION_VERSION,
    method: 'evidence-weighted prior shrinkage',
    thresholds: REVIEW_THRESHOLDS,
    abstentionPolicy: 'route predictions below module threshold to human review',
  };
}
