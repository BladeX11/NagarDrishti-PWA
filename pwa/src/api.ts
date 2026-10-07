import type { CategoryKey, Issue, IssueStatus } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type BackendIssue = {
  id: string;
  publicRef: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  departmentId?: string | null;
  wardId?: string | null;
  priority?: number | null;
  urgencyExplanation?: string | null;
  publicLat?: number | null;
  publicLng?: number | null;
  supporterCount?: number | null;
  createdAt?: string | null;
  ageInDays?: number;
};

const CATEGORY_KEYS: CategoryKey[] = [
  'pothole/road',
  'garbage/waste',
  'drainage/sewage',
  'water supply',
  'streetlight/electrical',
  'stray animals',
  'encroachment',
  'other',
];

function categoryKey(value: string): CategoryKey {
  return CATEGORY_KEYS.includes(value as CategoryKey) ? value as CategoryKey : 'other';
}

function statusKey(value: string): IssueStatus {
  const normalized = value.toLowerCase().replaceAll(' ', '_') as IssueStatus;
  return normalized === 'open' || normalized === 'triaged' || normalized === 'assigned'
    || normalized === 'in_progress' || normalized === 'claimed_resolved'
    || normalized === 'verified_fixed' || normalized === 'reopened'
    || normalized === 'rejected' || normalized === 'duplicate_merged'
    ? normalized
    : 'open';
}

function toIssue(item: BackendIssue): Issue {
  const category = categoryKey(item.category);
  const ageDays = item.ageInDays ?? 0;
  const latitude = item.publicLat ?? 18.5204;
  const longitude = item.publicLng ?? 73.8567;

  return {
    id: item.id,
    public_id: item.publicRef,
    category_key: category,
    department: item.departmentId ? { id: item.departmentId, name: item.departmentId } : null,
    ward: item.wardId ? { id: item.wardId, code: item.wardId, name: item.wardId } : null,
    status: statusKey(item.status),
    urgency: item.priority ? {
      tier: item.priority,
      source: 'backend',
      explanation: item.urgencyExplanation ?? 'Priority calculated by civic triage rules',
    } : null,
    supporter_count: item.supporterCount ?? 0,
    submitted_at: item.createdAt ?? new Date().toISOString(),
    age_days: ageDays,
    location: {
      type: 'coarsened_point',
      coordinates: [longitude, latitude],
      h3_cell: 'backend-coarsened',
    },
    analysis_state: 'completed',
    description_redacted: item.description ?? item.title,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload = await response.json() as { success: boolean; data?: T; error?: string };
  if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Backend request failed');
  return payload.data as T;
}

export async function listIssues(): Promise<Issue[]> {
  const result = await request<{ items: BackendIssue[] }>('/issues?limit=50');
  return result.items.map(toIssue);
}

export async function createIssue(input: {
  category: CategoryKey;
  description: string;
  latitude: number;
  longitude: number;
}) {
  return request<BackendIssue>('/issues', {
    method: 'POST',
    headers: { 'x-demo-role': 'citizen' },
    body: JSON.stringify({
      title: `${input.category} report`,
      category: input.category,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
    }),
  });
}
