/**
 * Centralized API client for NagarDrishti frontend.
 * All API calls go through this module — never fetch directly from page components.
 * Auth: uses x-demo-role header for mock auth. Role is stored in localStorage.
 */

const BASE = '/api';

function getRole(): string | null {
  return localStorage.getItem('nd-role');
}

export function setRole(role: string) {
  localStorage.setItem('nd-role', role);
}

export function clearRole() {
  localStorage.removeItem('nd-role');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const role = getRole();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (role) headers['x-demo-role'] = role;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? `API error ${res.status}`);
  }
  return json.data as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login(role: string) {
    setRole(role);
    return request<{ id: string; role: string; name: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },
  me() {
    return request<{ id: string; role: string; name: string } | null>('/auth/me');
  },
  logout() {
    clearRole();
    return request('/auth/logout', { method: 'POST' });
  },
};

// ── Issues ───────────────────────────────────────────────────────────────────

export interface ApiIssue {
  id: string;
  publicRef: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  departmentId?: string;
  wardId?: string;
  priority: number;
  urgencyExplanation?: string;
  latitude?: number;
  longitude?: number;
  supporterCount: number;
  reopenCount: number;
  slaBreach: boolean;
  slaDeadline?: string;
  proofState: string;
  createdAt: string;
  updatedAt: string;
  age: string;
  ageInDays: number;
  reporterId?: string;
}

export interface ApiIssueList {
  items: ApiIssue[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreateIssuePayload {
  title: string;
  description?: string;
  category: string;
  language?: string;
  latitude: number;
  longitude: number;
  photoDataUrl?: string;
}

export const issuesApi = {
  list(params?: {
    status?: string;
    category?: string;
    wardId?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    if (params?.wardId) qs.set('wardId', params.wardId);
    if (params?.departmentId) qs.set('departmentId', params.departmentId);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<ApiIssueList>(`/issues?${qs}`);
  },
  get(idOrRef: string) {
    return request<ApiIssue>(`/issues/${idOrRef}`);
  },
  create(data: CreateIssuePayload) {
    return request<ApiIssue>('/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update(id: string, data: Partial<{ category: string; departmentId: string; priority: number }>) {
    return request<ApiIssue>(`/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  support(id: string) {
    return request<ApiIssue>(`/issues/${id}/support`, { method: 'POST' });
  },
  updateStatus(id: string, toStatus: string, reason?: string) {
    return request<ApiIssue>(`/issues/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ toStatus, reason }),
    });
  },
  assign(id: string) {
    return request<ApiIssue>(`/issues/${id}/assign`, { method: 'POST' });
  },
  submitProof(id: string, note?: string) {
    return request<ApiIssue>(`/issues/${id}/proof`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },
  verify(id: string, vote: 'fixed' | 'not_fixed' | 'unsure', proofVersion = 1) {
    return request<{ vote: unknown; summary: unknown }>(`/issues/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ vote, proofVersion }),
    });
  },
  getTimeline(id: string) {
    return request<Array<{
      id: string;
      fromStatus?: string;
      toStatus: string;
      actorRole: string;
      reason?: string;
      eventHash: string;
      prevHash: string;
      createdAt: string;
    }>>(`/issues/${id}/timeline`);
  },
};

// ── Map ──────────────────────────────────────────────────────────────────────

export interface MapMarker {
  id: string;
  publicRef: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  status: string;
  title: string;
  supporterCount: number;
  createdAt: string;
  age: string;
  tier?: 0 | 1 | 2 | 3 | 4;
  inactionDays?: number;
  wardId?: string | null;
}

export const TIER_LABELS = ['Normal', 'Highlighted', 'Escalated', 'Amplified', 'Critical'] as const;
export const TIER_COLORS = ['#4F5B2A', '#B8892D', '#C0621A', '#B22222', '#8B0000'] as const;

export const mapApi = {
  getMarkers(params?: { status?: string; category?: string; wardId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    if (params?.wardId) qs.set('wardId', params.wardId);
    return request<MapMarker[]>(`/map?${qs}`);
  },
};

// ── Scorecards / Transparency ─────────────────────────────────────────────────

export interface ScorecardData {
  total: number;
  resolved: number;
  pastSLA: number;
  resolutionRate: number;
  timestamp: string;
}

export const transparencyApi = {
  getScorecard(params?: { wardId?: string; departmentId?: string }) {
    const qs = new URLSearchParams();
    if (params?.wardId) qs.set('wardId', params.wardId);
    if (params?.departmentId) qs.set('departmentId', params.departmentId);
    return request<ScorecardData>(`/transparency/scorecards?${qs}`);
  },
  getSLABreaches() {
    return request<ApiIssue[]>('/transparency/sla-breaches');
  },
  getForgottenIssues() {
    return request<ApiIssue[]>('/transparency/forgotten');
  },
  getNeglectZones() {
    return request<{ wardIds: string[]; wardNames: Record<string, string> }>('/transparency/neglect-zones');
  },
};

// ── Research ─────────────────────────────────────────────────────────────────

export interface ModelPrediction {
  id: string;
  issueId: string;
  module: string;
  prediction: unknown;
  confidence: number;
  modelVersion: string;
  dataVersion: string;
  explanation?: string;
  wasOverridden: boolean;
  createdAt: string;
}

export interface DuplicateCandidate {
  id: string;
  issueAId: string;
  issueBId: string;
  overallScore: number;
  status: string;
  spatialDistance?: number;
  textSimilarity?: number;
  categoryMatch?: boolean;
  createdAt: string;
}

export const researchApi = {
  getPredictions(issueId?: string) {
    const qs = new URLSearchParams();
    if (issueId) qs.set('issueId', issueId);
    return request<ModelPrediction[]>(`/research/predictions?${qs}`);
  },
  getDuplicates(status?: string) {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    return request<DuplicateCandidate[]>(`/research/duplicates?${qs}`);
  },
  getAuditLedger() {
    return request<{
      valid: boolean;
      totalEvents: number;
      brokenAt?: string;
    }>('/research/audit-ledger');
  },
  getMetrics() {
    return request<{ activeExperiments: number; totalImpact: number; ai: unknown }>('/research/metrics');
  },
  getAIMetadata() {
    return request<unknown>('/research/ai/metadata');
  },
};

// ── Adversarial Flags ────────────────────────────────────────────────────────

export interface AdversarialFlag {
  id: string;
  issueId: string;
  rule: 'PHOTO_REUSE' | 'TEMPORAL' | 'GPS_MISMATCH' | 'BULK_CLOSURE';
  severity: 'low' | 'medium' | 'high';
  details: Record<string, unknown>;
  resolvedAt: string | null;
  modelVersion: string;
  createdAt: string;
}

export const adversarialApi = {
  getFlags(issueId: string) {
    return request<AdversarialFlag[]>(`/officer/issues/${issueId}/flags`);
  },
  resolveFlag(flagId: string, resolution: string) {
    return request(`/officer/flags/${flagId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    });
  },
};

// ── Audit / Chain Verification ────────────────────────────────────────────────

export interface ChainVerificationResult {
  issueId?: string;
  publicRef?: string;
  chainValid: boolean;
  eventCount: number;
  brokenAt?: string;
  latestHash?: string;
  checkedAt: string;
  message?: string;
  valid?: boolean;
  totalEvents?: number;
}

export const auditApi = {
  verifyIssue(issueId: string) {
    return request<ChainVerificationResult>(`/audit/verify/${issueId}`);
  },
  verifyGlobal() {
    return request<ChainVerificationResult>('/audit/verify');
  },
};

