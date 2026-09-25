// Shared data types for NagarDrishti PWA
// These mirror the backend API contracts from api-spec.md

export type IssueStatus =
  | 'open'
  | 'triaged'
  | 'assigned'
  | 'in_progress'
  | 'claimed_resolved'
  | 'verified_fixed'
  | 'reopened'
  | 'rejected'
  | 'duplicate_merged';

export type CategoryKey =
  | 'pothole/road'
  | 'garbage/waste'
  | 'drainage/sewage'
  | 'water supply'
  | 'streetlight/electrical'
  | 'stray animals'
  | 'encroachment'
  | 'other';

export interface CoarsenedLocation {
  type: 'coarsened_point';
  coordinates: [number, number]; // [lng, lat]
  h3_cell: string;
}

export interface Issue {
  id: string;
  public_id: string;
  category_key: CategoryKey;
  department: { id: string; name: string } | null;
  ward: { id: string; code: string; name: string } | null;
  status: IssueStatus;
  urgency: { tier: number; source: string; explanation: string } | null;
  supporter_count: number;
  submitted_at: string;
  age_days: number;
  location: CoarsenedLocation;
  analysis_state: 'pending' | 'completed' | 'failed';
  description_redacted?: string;
}

export interface TimelineEvent {
  to_status: IssueStatus;
  occurred_at: string;
  reason?: string;
}

export const CATEGORY_META: Record<CategoryKey, { label: string; emoji: string; color: string }> = {
  'pothole/road':         { label: 'Pothole / Road', emoji: '🚧', color: '#4A5C2A' },
  'garbage/waste':        { label: 'Garbage / Waste', emoji: '🗑️', color: '#C4900A' },
  'drainage/sewage':      { label: 'Drainage / Sewage', emoji: '💧', color: '#2a5a8a' },
  'water supply':         { label: 'Water Supply', emoji: '🚰', color: '#2a5a8a' },
  'streetlight/electrical': { label: 'Streetlight / Electrical', emoji: '💡', color: '#C4900A' },
  'stray animals':        { label: 'Stray Animals', emoji: '🐕', color: '#7a4a10' },
  'encroachment':         { label: 'Encroachment', emoji: '🚫', color: '#B03020' },
  'other':                { label: 'Other', emoji: '📋', color: '#555' },
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  open:              'Open',
  triaged:           'Triaged',
  assigned:          'Assigned',
  in_progress:       'In Progress',
  claimed_resolved:  'Claimed Resolved',
  verified_fixed:    'Verified Fixed',
  reopened:          'Reopened',
  rejected:          'Rejected',
  duplicate_merged:  'Merged',
};
