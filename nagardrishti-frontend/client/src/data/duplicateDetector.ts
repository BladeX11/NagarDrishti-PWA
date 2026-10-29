import type { Issue } from '../types';
import { loadSubmittedIssues } from './localDemo';
import { issues as seedIssues } from './seed';
import { issuesApi } from '../lib/api';

export interface SimilarIssue {
  id: string;
  publicRef?: string;
  title: string;
  description?: string;
  category: string;
  wardId?: string;
  ward?: string;
  age: string;
  status: string;
  distanceKm: number;
  similarityScore: number;
  supporters: number;
}

export async function findSimilarIssues(params: {
  category: string;
  latitude: number;
  longitude: number;
  description?: string;
}): Promise<SimilarIssue[]> {
  const { category, latitude, longitude, description = '' } = params;

  const candidatesMap = new Map<string, any>();

  // 1. Include locally submitted issues (most recent reports filed by the user)
  const localIssues = loadSubmittedIssues();
  for (const item of localIssues) {
    if (item && item.id) {
      candidatesMap.set(item.id, item);
    }
  }

  // 2. Include seeded issues
  for (const item of seedIssues) {
    if (item && item.id && !candidatesMap.has(item.id)) {
      candidatesMap.set(item.id, item);
    }
  }

  // 3. Query backend issues if server is reachable
  try {
    const apiRes = await issuesApi.list({ category, limit: 10 });
    if (apiRes && Array.isArray(apiRes.items)) {
      for (const item of apiRes.items) {
        const key = item.publicRef || item.id;
        if (key && !candidatesMap.has(key)) {
          candidatesMap.set(key, item);
        }
      }
    }
  } catch {
    // Graceful offline fallback: local and seeded candidates remain available
  }

  const descWords = description.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const scored: SimilarIssue[] = [];

  for (const issue of candidatesMap.values()) {
    let score = 0;

    // A. Category match
    const issueCategory = (issue.category || '').toLowerCase();
    const targetCategory = category.toLowerCase();
    const isCategoryMatch = issueCategory === targetCategory;
    if (isCategoryMatch) {
      score += 40;
    }

    // B. Proximity calculation
    const issueLat = issue.latitude ?? (Array.isArray(issue.position) ? issue.position[0] : undefined);
    const issueLng = issue.longitude ?? (Array.isArray(issue.position) ? issue.position[1] : undefined);
    let distanceKm = 999;

    if (typeof issueLat === 'number' && typeof issueLng === 'number') {
      const dLat = (latitude - issueLat) * 111;
      const dLng = (longitude - issueLng) * 111 * Math.cos((latitude * Math.PI) / 180);
      distanceKm = Math.hypot(dLat, dLng);

      if (distanceKm <= 0.8) {
        score += 50; // Immediate vicinity
      } else if (distanceKm <= 2.5) {
        score += 35; // Same locality
      } else if (distanceKm <= 5.0) {
        score += 20; // Nearby zone
      } else if (distanceKm <= 10.0) {
        score += 10;
      }
    }

    // C. Keyword overlap
    const titleLower = (issue.title || '').toLowerCase();
    const descLower = (issue.description || '').toLowerCase();
    const combined = `${titleLower} ${descLower}`;

    for (const word of descWords) {
      if (combined.includes(word)) {
        score += 10;
      }
    }

    // Filter to relevant matches (same category or close spatial proximity)
    if (isCategoryMatch || score >= 35) {
      scored.push({
        id: issue.id || issue.publicRef,
        publicRef: issue.publicRef,
        title: issue.title || 'Civic report',
        description: issue.description,
        category: issue.category,
        wardId: issue.wardId || issue.ward,
        ward: issue.ward || issue.wardId || 'Pune',
        age: issue.age || 'Recently',
        status: issue.status || 'Open',
        distanceKm,
        similarityScore: score,
        supporters: issue.supporters ?? issue.supporterCount ?? 1,
      });
    }
  }

  // Sort by highest similarity score first, then closest distance
  scored.sort((a, b) => b.similarityScore - a.similarityScore || a.distanceKm - b.distanceKm);

  return scored.slice(0, 4);
}

