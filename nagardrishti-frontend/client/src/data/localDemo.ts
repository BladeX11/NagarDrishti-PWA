import type { Issue } from '../types';

const key = 'nd-demo-reports';

export function loadSubmittedIssues(): Issue[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value as Issue[] : [];
  } catch {
    return [];
  }
}

export function saveSubmittedIssue(issue: Issue): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify([...loadSubmittedIssues(), issue]));
}
