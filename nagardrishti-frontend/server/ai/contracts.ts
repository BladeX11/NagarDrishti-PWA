import type { Category, IssueStatus } from '../../shared/types.js';

export const AI_VERSION = 'civictrust-0.1.0';
export const AI_DATA_VERSION = 'seed-v1';
export const CALIBRATION_VERSION = 'civictrust-cal-v1';

export type AIPredictionStatus = 'pending' | 'needs_review' | 'accepted' | 'corrected' | 'rejected';
export type AIModule = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7';

export interface PredictionExplanation {
  signal: string;
  value: string | number | boolean;
  contribution: number;
}

export interface Prediction<T = unknown> {
  module: AIModule;
  prediction: T;
  confidence: number;
  explanation: string;
  signals: PredictionExplanation[];
  modelVersion: string;
  dataVersion: string;
  status: AIPredictionStatus;
  rawConfidence?: number;
  calibratedConfidence?: number;
  abstained?: boolean;
  abstentionReason?: string;
}

export interface IssueInferenceContext {
  issueId: string;
  title: string;
  description: string;
  category: Category | string;
  status: IssueStatus | string;
  latitude: number;
  longitude: number;
  supporterCount: number;
  ageInDays: number;
  slaBreach: boolean;
  hasProof: boolean;
}

export interface DuplicateCandidate {
  issueId: string;
  publicRef: string;
  distanceMetres: number;
  textSimilarity: number;
  categoryMatch: boolean;
  score: number;
  reasons: string[];
}

export interface IssueInferenceResult {
  issueId: string;
  predictions: Prediction[];
  duplicateCandidates: DuplicateCandidate[];
  generatedAt: string;
}
