// ═══════════════════════════════════════════════════════
// Shared Types — Used by BOTH server and client
// ═══════════════════════════════════════════════════════

// Issue lifecycle statuses
export type IssueStatus =
  | "Open"
  | "Triaged"
  | "Assigned"
  | "In Progress"
  | "Claimed Resolved"
  | "Verified Fixed"
  | "Reopened";

// Approved issue categories (stable across UI, API, DB, dataset, paper)
export type Category =
  | "pothole/road"
  | "garbage/waste"
  | "drainage/sewage"
  | "water supply"
  | "streetlight/electrical"
  | "stray animals"
  | "encroachment"
  | "other";

export type UserRole = "citizen" | "officer" | "admin" | "researcher";
export type MediaType = "before" | "after" | "proof";
export type ProofState = "none" | "submitted" | "accepted" | "rejected";
export type VoteValue = "fixed" | "not_fixed" | "unsure";
export type DuplicateStatus = "pending" | "confirmed" | "rejected";
export type PredictionStatus = "pending" | "accepted" | "corrected" | "rejected";
export type AIModule = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7";
export type Language = "en" | "hi" | "mr";
export type SourceType = "synthetic" | "proxy" | "self_collected";

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

export const CATEGORIES: Category[] = [
  "pothole/road",
  "garbage/waste",
  "drainage/sewage",
  "water supply",
  "streetlight/electrical",
  "stray animals",
  "encroachment",
  "other",
];

export const STATUSES: IssueStatus[] = [
  "Open",
  "Triaged",
  "Assigned",
  "In Progress",
  "Claimed Resolved",
  "Verified Fixed",
  "Reopened",
];

export const WARDS = ["ward-11", "ward-12", "ward-14", "ward-15"] as const;
export const WARD_NAMES: Record<string, string> = {
  "ward-11": "Ward 11",
  "ward-12": "Ward 12",
  "ward-14": "Ward 14",
  "ward-15": "Ward 15",
};

export const DEPARTMENTS = [
  "roads",
  "waste",
  "drainage",
  "electrical",
  "animal-welfare",
  "civic-works",
] as const;

export const DEPARTMENT_NAMES: Record<string, string> = {
  roads: "Roads Department",
  waste: "Solid Waste Management",
  drainage: "Drainage & Water",
  electrical: "Electrical Department",
  "animal-welfare": "Animal Welfare",
  "civic-works": "Civic Works",
};

export const CATEGORY_DEPARTMENT: Record<Category, string> = {
  "pothole/road": "roads",
  "garbage/waste": "waste",
  "drainage/sewage": "drainage",
  "water supply": "drainage",
  "streetlight/electrical": "electrical",
  "stray animals": "animal-welfare",
  encroachment: "civic-works",
  other: "civic-works",
};

// Valid status transitions (enforced by backend)
export const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  Open: ["Triaged"],
  Triaged: ["Assigned"],
  Assigned: ["In Progress"],
  "In Progress": ["Claimed Resolved"],
  "Claimed Resolved": ["Verified Fixed", "Reopened"],
  "Verified Fixed": [],
  Reopened: ["Triaged", "Assigned", "In Progress"],
};

// ═══════════════════════════════════════════════════════
// API Request Types
// ═══════════════════════════════════════════════════════

export interface CreateIssueRequest {
  title: string;
  description?: string;
  category: Category;
  language?: Language;
  latitude: number;
  longitude: number;
}

export interface UpdateIssueRequest {
  category?: Category;
  departmentId?: string;
  priority?: number;
  urgencyExplanation?: string;
}

export interface StatusTransitionRequest {
  toStatus: IssueStatus;
  reason?: string;
}

export interface AssignIssueRequest {
  assignTo?: string; // userId or 'self'
  departmentId: string;
}

export interface VerificationVoteRequest {
  vote: VoteValue;
  proofVersion?: number;
}

export interface LoginRequest {
  role: UserRole;
  displayName?: string;
}

// ═══════════════════════════════════════════════════════
// API Response Types
// ═══════════════════════════════════════════════════════

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IssueResponse {
  id: string;
  publicRef: string;
  title: string;
  description: string | null;
  category: Category;
  status: IssueStatus;
  department: string | null;
  departmentName: string | null;
  ward: string | null;
  wardName: string | null;
  assignedOfficer: string | null;
  priority: number;
  urgencyExplanation: string | null;
  // Public location (coarsened)
  latitude: number;
  longitude: number;
  geohash: string;
  // SLA
  slaDeadline: string | null;
  slaBreach: boolean;
  // Proof
  proofState: ProofState;
  // Metrics
  supporterCount: number;
  reopenCount: number;
  // Verification
  verificationVotes?: {
    fixed: number;
    notFixed: number;
    unsure: number;
    total: number;
  };
  // AI
  aiConfidence?: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  // Age
  age: string;
  ageInDays: number;
}

export interface StatusEventResponse {
  id: string;
  sequenceNum: number;
  issueId: string;
  fromStatus: IssueStatus | null;
  toStatus: IssueStatus;
  actor: string; // Display name (redacted for public)
  actorRole: string;
  reason: string | null;
  eventHash: string;
  createdAt: string;
}

export interface MapMarkerResponse {
  id: string;
  publicRef: string;
  latitude: number;
  longitude: number;
  category: Category;
  status: IssueStatus;
  title: string;
  supporterCount: number;
  age: string;
}

export interface ScorecardResponse {
  ward: string;
  wardName: string;
  department: string;
  departmentName: string;
  period: string;
  totalIssues: number;
  resolvedIssues: number;
  slaCompliance: number;
  medianResolutionDays: number;
  reopenRate: number;
  activeIssues: number;
  methodVersion: string;
}

export interface UserResponse {
  id: string;
  displayName: string;
  role: UserRole;
  ward: string | null;
  department: string | null;
}

export interface ChainIntegrityResponse {
  valid: boolean;
  totalEvents: number;
  brokenAt?: number;
  checkedAt: string;
}
