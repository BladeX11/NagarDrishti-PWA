export type IssueStatus =
  | 'Open'
  | 'Triaged'
  | 'Assigned'
  | 'In Progress'
  | 'Claimed Resolved'
  | 'Verified Fixed'
  | 'Reopened';

export type Category =
  | 'pothole/road'
  | 'garbage/waste'
  | 'drainage/sewage'
  | 'water supply'
  | 'streetlight/electrical'
  | 'stray animals'
  | 'encroachment'
  | 'other';

export type Issue = {
  id: string;
  publicRef?: string;
  title: string;
  description: string;
  category: Category;
  status: IssueStatus;
  department: string;
  ward: string;
  wardId?: string;
  departmentId?: string;
  age: string;
  ageInDays: number;
  supporters: number;
  supporterCount?: number;
  position: [number, number];
  createdAt: string;
  priority: number;
  urgencyExplanation: string;
  aiConfidence: number;
  slaBreach: boolean;
  slaDeadlineDays: number;
  reopenCount: number;
  verificationVotes: { fixed: number; notFixed: number; unsure: number };
  proofSubmitted: boolean;
  assignedOfficer?: string;
  assignedTo?: string;
};

export type StatusEvent = {
  id: string;
  issueId: string;
  fromStatus: IssueStatus | null;
  toStatus: IssueStatus;
  actor: string;
  actorRole: 'citizen' | 'officer' | 'admin' | 'system';
  timestamp: string;
  reason?: string;
};

export type ScorecardSnapshot = {
  ward: string;
  department: string;
  totalIssues: number;
  resolvedIssues: number;
  slaCompliance: number;
  medianResolutionDays: number;
  reopenRate: number;
  activeIssues: number;
  period: string;
};

export type Prediction = {
  issueId: string;
  module: string;
  prediction: string;
  confidence: number;
  status: 'Accepted' | 'Needs review' | 'Corrected';
  model: string;
  timestamp: string;
  explanation: string;
};

export type DuplicatePair = {
  issueA: string;
  issueB: string;
  distance: number;
  textSimilarity: number;
  categoryMatch: boolean;
  score: number;
  outcome: 'Confirmed' | 'Rejected' | 'Pending';
};

export const categories: Category[] = [
  'pothole/road',
  'garbage/waste',
  'drainage/sewage',
  'water supply',
  'streetlight/electrical',
  'stray animals',
  'encroachment',
  'other',
];

export const statuses: IssueStatus[] = [
  'Open',
  'Triaged',
  'Assigned',
  'In Progress',
  'Claimed Resolved',
  'Verified Fixed',
  'Reopened',
];

export const wards = ['Ward 11', 'Ward 12', 'Ward 14', 'Ward 15'];

export const departments = [
  'Roads Department',
  'Solid Waste Management',
  'Drainage & Water',
  'Electrical Department',
  'Animal Welfare',
  'Civic Works',
];

export const categoryDepartment: Record<Category, string> = {
  'pothole/road': 'Roads Department',
  'garbage/waste': 'Solid Waste Management',
  'drainage/sewage': 'Drainage & Water',
  'water supply': 'Drainage & Water',
  'streetlight/electrical': 'Electrical Department',
  'stray animals': 'Animal Welfare',
  encroachment: 'Civic Works',
  other: 'Civic Works',
};
