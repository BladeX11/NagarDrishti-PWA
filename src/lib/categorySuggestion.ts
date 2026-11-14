const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export type CategorySuggestion = {
  category: string;
  reason: string;
  source: 'gemini' | 'local-ml' | 'rules';
  modelVersion: string;
};

export async function suggestReportCategory(input: {
  description: string;
  category: string;
  imageDataUrl?: string;
}): Promise<CategorySuggestion> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (import.meta.env.DEV) {
    headers['x-demo-role'] = 'citizen';
  }
  const response = await fetch(`${API_BASE}/ai/classify`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      text: input.description,
      language: 'English',
      category: input.category,
      imageDataUrl: input.imageDataUrl,
    }),
  });
  const payload = await response.json() as { success?: boolean; data?: CategorySuggestion; error?: string };
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || `Category suggestion failed (HTTP ${response.status})`);
  }
  return payload.data;
}

export const displayCategories = [
  { value: 'pothole/road', label: 'Road safety' },
  { value: 'garbage/waste', label: 'Waste' },
  { value: 'drainage/sewage', label: 'Drainage' },
  { value: 'water supply', label: 'Water supply' },
  { value: 'streetlight/electrical', label: 'Streetlight' },
  { value: 'stray animals', label: 'Stray animals' },
  { value: 'encroachment', label: 'Encroachment' },
  { value: 'other', label: 'Other' },
] as const;
