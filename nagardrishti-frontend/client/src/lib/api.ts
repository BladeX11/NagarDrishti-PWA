/**
 * Centralized API client for NagarDrishti frontend.
 * All API calls go through this module — never fetch directly from page components.
 * Auth: uses an httpOnly session cookie when available, with the demo role
 * header retained for local prototype role switching.
 */

const BASE =
  (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "") || "/api";

export const AUTH_READY_EVENT = "nd-auth-ready";
export const AUTH_CHANGED_EVENT = "nd-auth-changed";

export interface AuthUser {
  id: string;
  role: string;
  name: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function notifyAuthReady(user: AuthUser) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<AuthUser>(AUTH_READY_EVENT, { detail: user }));
  }
}

function notifyAuthChanged(user: AuthUser | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<{ user: AuthUser | null }>(AUTH_CHANGED_EVENT, {
        detail: { user },
      })
    );
  }
}

function getRole(): string | null {
  return localStorage.getItem("nd-role");
}

export function setRole(role: string) {
  localStorage.setItem("nd-role", role);
}

export function clearRole() {
  localStorage.removeItem("nd-role");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const role = getRole();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };
  if (role && import.meta.env.DEV) headers["x-demo-role"] = role;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const text = await res.text();
  let json: { success?: boolean; data?: T; error?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new ApiError(
      `Server returned an invalid response (HTTP ${res.status})`,
      res.status
    );
  }
  if (!res.ok || !json.success) {
    throw new ApiError(json.error ?? `API error ${res.status}`, res.status);
  }
  return json.data as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  requestOtp(destination: string, channel: "email" | "sms" = "email") {
    return request<{ expiresInSeconds: number }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ destination, channel }),
    });
  },
  async verifyOtp(
    destination: string,
    code: string,
    channel: "email" | "sms" = "email",
    role = "citizen",
    displayName?: string
  ) {
    const user = await request<AuthUser>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ destination, code, channel, role, displayName }),
    });
    setRole(user.role);
    notifyAuthChanged(user);
    notifyAuthReady(user);
    return user;
  },
  async login(role: string) {
    setRole(role);
    const user = await request<AuthUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    setRole(user.role);
    notifyAuthChanged(user);
    notifyAuthReady(user);
    return user;
  },
  me() {
    return request<AuthUser | null>("/auth/me");
  },
  mode() {
    return request<{ demoLoginEnabled: boolean }>("/auth/mode");
  },
  async logout() {
    clearRole();
    try {
      return await request("/auth/logout", { method: "POST" });
    } finally {
      notifyAuthChanged(null);
    }
  },
};

export const notificationsApi = {
  list() {
    return request<
      Array<{
        id: string;
        issueId: string;
        title: string;
        body: string;
        kind: string;
        time: string;
        unread: boolean;
      }>
    >("/notifications");
  },
  vapidKey() {
    return request<{ enabled: boolean; publicKey: string | null }>(
      "/notifications/vapid-public-key"
    );
  },
  subscribe(subscription: PushSubscriptionJSON) {
    return request<{ subscribed: boolean }>("/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  },
  unsubscribe(endpoint: string) {
    return request<{ subscribed: boolean }>("/notifications/subscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    });
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
  department?: string;
  departmentName?: string | null;
  wardId?: string;
  ward?: string;
  wardName?: string | null;
  assignedTo?: string | null;
  assignedOfficer?: string;
  priority: number;
  urgencyExplanation?: string;
  aiConfidence?: number;
  latitude?: number;
  longitude?: number;
  supporterCount: number;
  supporters?: number;
  reopenCount: number;
  slaBreach: boolean;
  slaDeadline?: string;
  slaDeadlineDays?: number;
  proofState: string;
  verificationVotes?: {
    fixed: number;
    notFixed: number;
    unsure: number;
    total?: number;
  };
  createdAt: string;
  updatedAt: string;
  age: string;
  updatedAge?: string;
  ageInDays: number;
  reporterId?: string;
  events?: Array<{
    id: string;
    issueId?: string;
    fromStatus?: string | null;
    toStatus: string;
    actor?: string;
    actorRole: string;
    reason?: string | null;
    timestamp?: string;
    createdAt?: string;
  }>;
  media?: Array<{
    id: string;
    type: string;
    privatePath?: string;
    publicPath?: string;
    mimeType?: string;
  }>;
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
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.wardId) qs.set("wardId", params.wardId);
    if (params?.departmentId) qs.set("departmentId", params.departmentId);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<ApiIssueList>(`/issues?${qs}`);
  },
  listMine(params?: { status?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<ApiIssueList>(`/issues/mine?${qs}`);
  },
  get(idOrRef: string) {
    return request<ApiIssue>(`/issues/${idOrRef}`);
  },
  create(data: CreateIssuePayload) {
    return request<ApiIssue>("/issues", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update(
    id: string,
    data: Partial<{ category: string; departmentId: string; priority: number }>
  ) {
    return request<ApiIssue>(`/issues/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  support(id: string) {
    return request<ApiIssue>(`/issues/${id}/support`, { method: "POST" });
  },
  updateStatus(id: string, toStatus: string, reason?: string) {
    return request<ApiIssue>(`/issues/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ toStatus, reason }),
    });
  },
  assign(id: string) {
    return request<ApiIssue>(`/issues/${id}/assign`, { method: "POST" });
  },
  uploadMedia(
    id: string,
    dataUrl: string,
    type: "before" | "after" | "proof" = "after",
  ) {
    return request<{ id: string; publicPath?: string }>(`/issues/${id}/media`, {
      method: "POST",
      body: JSON.stringify({ dataUrl, type }),
    });
  },
  async submitProof(
    id: string,
    note?: string,
    photoDataUrl?: string,
    mediaId?: string,
  ) {
    let resolvedMediaId =
      mediaId ??
      (photoDataUrl && !photoDataUrl.startsWith("data:")
        ? photoDataUrl
        : undefined);
    if (!resolvedMediaId && photoDataUrl?.startsWith("data:")) {
      const uploaded = await this.uploadMedia(id, photoDataUrl, "after");
      resolvedMediaId = uploaded.id;
    }
    return request<ApiIssue>(`/issues/${id}/proof`, {
      method: "POST",
      body: JSON.stringify(
        resolvedMediaId ? { note, mediaId: resolvedMediaId } : { note },
      ),
    });
  },
  reviewProof(id: string, decision: "accepted" | "rejected") {
    return request<ApiIssue>(`/issues/${id}/proof/review`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
  },
  verify(id: string, vote: "fixed" | "not_fixed" | "unsure", proofVersion = 1) {
    return request<{ vote: unknown; summary: unknown }>(
      `/issues/${id}/verify`,
      {
        method: "POST",
        body: JSON.stringify({ vote, proofVersion }),
      }
    );
  },
  getTimeline(id: string) {
    return request<
      Array<{
        id: string;
        fromStatus?: string;
        toStatus: string;
        actorRole: string;
        reason?: string;
        eventHash: string;
        prevHash: string;
        createdAt: string;
      }>
    >(`/issues/${id}/timeline`);
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

export const TIER_LABELS = [
  "Normal",
  "Highlighted",
  "Escalated",
  "Amplified",
  "Critical",
] as const;
export const TIER_COLORS = [
  "#4F5B2A",
  "#B8892D",
  "#C0621A",
  "#B22222",
  "#8B0000",
] as const;

export const mapApi = {
  getMarkers(params?: { status?: string; category?: string; wardId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.wardId) qs.set("wardId", params.wardId);
    return request<MapMarker[]>(`/map?${qs}`);
  },
};

// ── Scorecards / Transparency ─────────────────────────────────────────────────

export interface ScorecardGroupMetrics {
  totalIssues: number;
  resolvedIssues: number;
  activeIssues: number;
  slaCompliance: number;
  medianResolutionDays: number;
  reopenRate: number;
}

export interface ScorecardWardSummary extends ScorecardGroupMetrics {
  wardId: string;
  ward: string;
  wardName: string;
}

export interface ScorecardDepartmentSummary extends ScorecardGroupMetrics {
  departmentId: string;
  department: string;
  departmentName: string;
}

export interface ScorecardSnapshotItem extends ScorecardGroupMetrics {
  wardId: string;
  ward: string;
  wardName: string;
  departmentId: string;
  department: string;
  departmentName: string;
  period: string;
  methodVersion?: string;
}

export interface ScorecardData {
  total: number;
  resolved: number;
  active?: number;
  pastSLA: number;
  resolutionRate: number;
  slaCompliance?: number;
  medianResolutionDays?: number;
  reopenRate?: number;
  period?: string;
  snapshots?: ScorecardSnapshotItem[];
  byWard?: ScorecardWardSummary[];
  byDepartment?: ScorecardDepartmentSummary[];
  timestamp: string;
}

export const transparencyApi = {
  getScorecard(params?: { wardId?: string; departmentId?: string }) {
    const qs = new URLSearchParams();
    if (params?.wardId) qs.set("wardId", params.wardId);
    if (params?.departmentId) qs.set("departmentId", params.departmentId);
    return request<ScorecardData>(`/transparency/scorecards?${qs}`);
  },
  getSLABreaches() {
    return request<ApiIssue[]>("/transparency/sla-breaches");
  },
  getForgottenIssues() {
    return request<ApiIssue[]>("/transparency/forgotten");
  },
  getNeglectZones() {
    return request<{ wardIds: string[]; wardNames: Record<string, string> }>(
      "/transparency/neglect-zones"
    );
  },
};

// ── Research ─────────────────────────────────────────────────────────────────

export interface ModelPrediction {
  id: string;
  issueId: string;
  module: string;
  prediction: unknown;
  confidence: number;
  rawConfidence?: number;
  calibratedConfidence?: number;
  status?: string;
  abstained?: boolean;
  abstentionReason?: string | null;
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

export interface AnnotationTask {
  id: string;
  language: string;
  text: string;
  category: string;
  priority: number;
  ward: string;
  annotation: {
    category: string;
    priority: number;
    duplicateLabel?: string | null;
    rationale?: string | null;
  } | null;
}

export interface AnnotationStats {
  targetRecords: number;
  totalAnnotations: number;
  byAnnotator: Array<{ annotatorId: string; completed: number }>;
  completeRecords: number;
  majorityAgreement: number | null;
}

export interface SaveAnnotationInput {
  recordId: string;
  annotatorId: string;
  category: string;
  priority: number;
  duplicateLabel?: string;
  rationale?: string;
}

export const researchApi = {
  getPredictions(issueId?: string) {
    const qs = new URLSearchParams();
    if (issueId) qs.set("issueId", issueId);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<ModelPrediction[]>(`/research/predictions${suffix}`);
  },
  getAbstentions() {
    return request<ModelPrediction[]>("/research/abstentions");
  },
  getDuplicates(status?: string) {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<DuplicateCandidate[]>(`/research/duplicates${suffix}`);
  },
  getProofAudit() {
    return request<Array<Record<string, unknown>>>("/research/proof-audit");
  },
  getAuditLedger() {
    return request<{
      valid: boolean;
      totalEvents: number;
      brokenAt?: string;
    }>("/research/audit-ledger");
  },
  getMetrics() {
    return request<{
      activeExperiments: number;
      totalImpact: number;
      ai: unknown;
    }>("/research/metrics");
  },
  getAIMetadata() {
    return request<unknown>("/research/ai/metadata");
  },
  getAnnotationTasks(annotatorId = "annotator-a") {
    const qs = new URLSearchParams({ annotatorId });
    return request<AnnotationTask[]>(`/research/annotation/tasks?${qs}`);
  },
  getAnnotationStats() {
    return request<AnnotationStats>("/research/annotation/stats");
  },
  saveAnnotation(payload: SaveAnnotationInput) {
    return request<unknown>("/research/annotation", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getAnnotationExportUrl() {
    return `${BASE}/research/annotation/export`;
  },
};

// ── Adversarial Flags ────────────────────────────────────────────────────────

export interface AdversarialFlag {
  id: string;
  issueId: string;
  rule: "PHOTO_REUSE" | "TEMPORAL" | "GPS_MISMATCH" | "BULK_CLOSURE";
  severity: "low" | "medium" | "high";
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
      method: "POST",
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

export interface GlobalChainVerificationResult {
  valid: boolean;
  totalEvents: number;
  brokenAt?: string;
  checkedAt: string;
  chainValid?: boolean;
  eventCount?: number;
}

export const auditApi = {
  verifyIssue(issueId: string) {
    return request<ChainVerificationResult>(`/audit/verify/${issueId}`);
  },
  verifyGlobal() {
    return request<GlobalChainVerificationResult>("/audit/verify");
  },
};
