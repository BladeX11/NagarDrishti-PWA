import { useEffect, useState } from 'react';
import { issues as seedIssues } from './seed';
import type { Category, Issue, IssueStatus } from '../types';

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
  updatedAt?: string | null;
  slaDeadline?: string | null;
  slaBreach?: boolean | null;
  reopenCount?: number | null;
  assignedTo?: string | null;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const categories: Category[] = ['pothole/road', 'garbage/waste', 'drainage/sewage', 'water supply', 'streetlight/electrical', 'stray animals', 'encroachment', 'other'];

const departmentNames: Record<string, string> = {
  roads: 'Roads Department', waste: 'Solid Waste Management', water: 'Water & Drainage',
  drainage: 'Drainage & Water', electrical: 'Electrical Department', animals: 'Animal Welfare', 'civic-works': 'Civic Works',
};

async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) throw new Error(`Server returned an empty response (HTTP ${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server returned an invalid response (HTTP ${response.status})`);
  }
}

function toStatus(value: string): IssueStatus {
  const normalized = value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) as IssueStatus;
  return ['Open', 'Triaged', 'Assigned', 'In Progress', 'Claimed Resolved', 'Verified Fixed', 'Reopened'].includes(normalized)
    ? normalized : 'Open';
}

function toCategory(value: string): Category {
  return categories.includes(value as Category) ? value as Category : 'other';
}

function toWard(wardId?: string | null) {
  if (!wardId) return 'Ward 12';
  return wardId.replace(/^ward-/, 'Ward ');
}

function toIssue(item: BackendIssue): Issue {
  const status = toStatus(item.status);
  const category = toCategory(item.category);
  const createdAt = item.createdAt ?? new Date().toISOString();
  const ageInDays = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  const slaDeadlineDays = item.slaDeadline ? Math.max(0, Math.ceil((new Date(item.slaDeadline).getTime() - Date.now()) / 86400000)) : 0;

  return {
    id: item.publicRef || item.id,
    title: item.title,
    description: item.description ?? '',
    category,
    status,
    department: item.departmentId ? departmentNames[item.departmentId] ?? item.departmentId : 'Civic Works',
    ward: toWard(item.wardId),
    age: ageInDays === 0 ? 'Today' : `${ageInDays} days ago`,
    ageInDays,
    supporters: item.supporterCount ?? 0,
    position: [item.publicLat ?? 18.5204, item.publicLng ?? 73.8567],
    createdAt,
    priority: item.priority ?? 3,
    urgencyExplanation: item.urgencyExplanation ?? 'Priority calculated by civic triage rules.',
    aiConfidence: 0.8,
    slaBreach: item.slaBreach ?? (slaDeadlineDays === 0 && !['Verified Fixed', 'Rejected'].includes(status)),
    slaDeadlineDays,
    reopenCount: item.reopenCount ?? 0,
    verificationVotes: { fixed: 0, notFixed: 0, unsure: 0 },
    proofSubmitted: ['Claimed Resolved', 'Verified Fixed', 'Reopened'].includes(status),
    assignedOfficer: item.assignedTo ?? undefined,
  };
}

async function fetchLiveIssues(): Promise<Issue[]> {
  const response = await fetch(`${API_BASE_URL}/issues?limit=100`);
  const payload = await response.json() as { success: boolean; data?: { items: BackendIssue[] }; error?: string };
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? 'Unable to load issues');
  return payload.data.items.map(toIssue);
}

export async function createLiveIssue(input: {
  category: Category;
  description: string;
  latitude: number;
  longitude: number;
  photo?: File | null;
}) {
  const body = new FormData();
  body.set('title', `${input.category} report`);
  body.set('category', input.category);
  body.set('description', input.description);
  body.set('latitude', String(input.latitude));
  body.set('longitude', String(input.longitude));
  if (input.photo) body.set('photo', input.photo);
  const response = await fetch(`${API_BASE_URL}/issues`, {
    method: 'POST',
    headers: { 'x-demo-role': 'citizen' },
    body,
  });
  const payload = await readApiResponse<{ success: boolean; data?: BackendIssue; error?: string }>(response);
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? 'Unable to submit issue');
  return payload.data;
}

export async function fetchMyLiveIssues(): Promise<Issue[]> {
  const response = await fetch(`${API_BASE_URL}/issues/mine`, { headers: { 'x-demo-role': 'citizen' } });
  const payload = await response.json() as { success: boolean; data?: { items: BackendIssue[] }; error?: string };
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? 'Unable to load your issues');
  return payload.data.items.map(toIssue);
}

export function useLiveIssues() {
  const [issues, setIssues] = useState<Issue[]>(seedIssues);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchLiveIssues().then((items) => {
      if (!mounted) return;
      setIssues(items);
      setIsLive(true);
    }).catch(() => {
      if (mounted) setIsLive(false);
    });
    return () => { mounted = false; };
  }, []);

  return { issues, isLive };
}
