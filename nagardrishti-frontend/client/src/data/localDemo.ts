import type { Issue } from '../types';

const key = 'nd-demo-reports';
const supportedKey = 'nd-supported-issues';

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

export function getSupportedIssueIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const val: unknown = JSON.parse(window.localStorage.getItem(supportedKey) || '[]');
    return Array.isArray(val) ? (val as string[]) : [];
  } catch {
    return [];
  }
}

export function isIssueSupportedLocally(id: string): boolean {
  if (!id) return false;
  return getSupportedIssueIds().includes(id);
}

export function addLocalSupport(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  const current = getSupportedIssueIds();
  if (!current.includes(id)) {
    window.localStorage.setItem(supportedKey, JSON.stringify([...current, id]));
  }
  const demoIssues = loadSubmittedIssues();
  const updated = demoIssues.map((issue) => {
    if (issue.id === id || (issue as any).publicRef === id) {
      return { ...issue, supporters: (issue.supporters || 0) + 1 };
    }
    return issue;
  });
  window.localStorage.setItem(key, JSON.stringify(updated));
}
