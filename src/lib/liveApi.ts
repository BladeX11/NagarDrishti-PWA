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

async function request<T>(path: string, role?: 'citizen' | 'officer', options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (role) headers.set('x-demo-role', role);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  const body = await response.json() as { success?: boolean; data?: T; error?: string };
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || `Request failed (HTTP ${response.status})`);
  }
  return body.data;
}

export const liveApi = {
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
