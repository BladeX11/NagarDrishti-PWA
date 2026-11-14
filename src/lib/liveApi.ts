const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export type LiveIssue = {
  id: string;
  publicRef: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  supporterCount: number;
  slaBreach: boolean;
  priority: number;
  createdAt: string;
  age: string;
  ageInDays: number;
  wardId?: string | null;
  proofState?: string;
};

export type IssueEvent = {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  actorRole: string;
  reason?: string | null;
  createdAt?: string;
  timestamp?: string;
};

export type AuthUser = {
  id: string;
  role: string;
  name: string;
};

async function request<T>(path: string, role?: 'citizen' | 'officer', options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  // Only send x-demo-role in development mode. Production rejects demo headers and enforces session cookies.
  if (role && import.meta.env.DEV) headers.set('x-demo-role', role);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  const body = await response.json() as { success?: boolean; data?: T; error?: string };
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || `Request failed (HTTP ${response.status})`);
  }
  return body.data;
}

export const liveApi = {
  auth: {
    async me() {
      return request<AuthUser | null>('/auth/me');
    },
    async requestOtp(destination: string, channel: 'email' | 'sms' = 'email') {
      return request<{ expiresInSeconds: number }>('/auth/request-otp', undefined, {
        method: 'POST',
        body: JSON.stringify({ destination, channel }),
      });
    },
    async verifyOtp(destination: string, code: string, channel: 'email' | 'sms' = 'email', role = 'citizen', displayName?: string) {
      return request<AuthUser>('/auth/verify-otp', undefined, {
        method: 'POST',
        body: JSON.stringify({ destination, code, channel, role, displayName }),
      });
    },
    async login(role: 'citizen' | 'officer' | 'admin' | 'researcher') {
      return request<AuthUser>('/auth/login', undefined, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
    },
    async logout() {
      return request<{ success: boolean }>('/auth/logout', undefined, {
        method: 'POST',
        body: '{}',
      });
    },
  },
  async listIssues() {
    return request<{ items: LiveIssue[]; total: number; hasMore: boolean }>('/issues?page=1&limit=100');
  },
  createIssue(data: { title: string; description: string; category: string; latitude: number; longitude: number; language: string; photoDataUrl?: string }) {
    return request<LiveIssue>('/issues', 'citizen', { method: 'POST', body: JSON.stringify(data) });
  },
  supportIssue(id: string) {
    return request<LiveIssue>(`/issues/${encodeURIComponent(id)}/support`, 'citizen', { method: 'POST', body: '{}' });
  },
  transitionIssue(id: string, toStatus: string, reason?: string) {
    return request<LiveIssue>(`/issues/${encodeURIComponent(id)}/status`, 'officer', { method: 'POST', body: JSON.stringify({ toStatus, reason }) });
  },
  assignIssue(id: string) {
    return request<LiveIssue>(`/issues/${encodeURIComponent(id)}/assign`, 'officer', { method: 'POST', body: '{}' });
  },
  submitProof(id: string, note: string) {
    return request<LiveIssue>(`/issues/${encodeURIComponent(id)}/proof`, 'officer', { method: 'POST', body: JSON.stringify({ note }) });
  },
  getTimeline(id: string) {
    return request<IssueEvent[]>(`/issues/${encodeURIComponent(id)}/timeline`);
  },
};
