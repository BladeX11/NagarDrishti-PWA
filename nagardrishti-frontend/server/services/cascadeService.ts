import { db } from '../db/index.js';
import { issues, cascadeAlerts } from '../db/schema.js';
import { eq, inArray, and, desc } from 'drizzle-orm';
import { syncCascadeAlertsTable } from '../db/sync_cascade_alerts.js';

export interface IssueCoordinate {
  id: string;
  category: string;
  lat: number;
  lng: number;
  wardId: string | null;
  createdAt: Date;
  status: string;
}

export interface CascadeCluster {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  wardId: string | null;
  issues: IssueCoordinate[];
  categories: string[];
  suggestedRootCause: string;
  confidence: 'low' | 'medium' | 'high';
  oldestIssueAt: Date;
  newestIssueAt: Date;
}

export interface CascadeAlertRecord {
  id: string;
  wardId: string | null;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  issueIds: string[];
  categories: string[];
  suggestedRootCause: string;
  confidence: 'low' | 'medium' | 'high';
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: Date | null;
}

// ── Haversine Distance ────────────────────────────────────────────────────────

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ── Predefined Cascade Patterns ───────────────────────────────────────────────

export const CASCADE_PATTERNS: Array<{ categories: string[]; rootCause: string }> = [
  {
    categories: ['water supply', 'drainage/sewage', 'pothole/road'],
    rootCause: 'Possible underground pipe failure leading to road subsidence and drainage backup',
  },
  {
    categories: ['garbage/waste', 'drainage/sewage', 'stray animals'],
    rootCause: 'Possible neglected sanitation zone causing waste accumulation and pest infestation',
  },
  {
    categories: ['streetlight/electrical', 'encroachment'],
    rootCause: 'Possible unauthorized construction compromising overhead electrical lines',
  },
  {
    categories: ['water supply', 'drainage/sewage'],
    rootCause: 'Possible water distribution network and sewer cross-contamination',
  },
  {
    categories: ['pothole/road', 'drainage/sewage'],
    rootCause: 'Persistent waterlogging causing road surface erosion and structural subsidence',
  },
];

export function matchRootCause(categories: string[]): string {
  const catSet = new Set(categories);

  // Check specific patterns in priority order
  for (const pattern of CASCADE_PATTERNS) {
    if (pattern.categories.every((c) => catSet.has(c))) {
      return pattern.rootCause;
    }
  }

  return 'Multiple intersecting infrastructure failures in close proximity';
}

// ── DBSCAN Spatial Clustering ─────────────────────────────────────────────────

export function runDBSCAN(
  points: IssueCoordinate[],
  epsMeters: number = 500,
  minSamples: number = 3
): IssueCoordinate[][] {
  const n = points.length;
  if (n < minSamples) return [];

  const visited = new Uint8Array(n);
  const inCluster = new Uint8Array(n);
  const clusters: IssueCoordinate[][] = [];

  function getNeighbors(index: number): number[] {
    const neighbors: number[] = [];
    const p = points[index];
    for (let j = 0; j < n; j++) {
      if (haversineDistanceMeters(p.lat, p.lng, points[j].lat, points[j].lng) <= epsMeters) {
        neighbors.push(j);
      }
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = 1;

    const neighbors = getNeighbors(i);
    if (neighbors.length < minSamples) {
      // Noise point (can still be added to another cluster later)
      continue;
    }

    // Start a new cluster
    const cluster: IssueCoordinate[] = [points[i]];
    inCluster[i] = 1;

    const queue = [...neighbors];
    let qIdx = 0;

    while (qIdx < queue.length) {
      const neighborIdx = queue[qIdx++];
      if (!visited[neighborIdx]) {
        visited[neighborIdx] = 1;
        const subNeighbors = getNeighbors(neighborIdx);
        if (subNeighbors.length >= minSamples) {
          queue.push(...subNeighbors);
        }
      }

      if (!inCluster[neighborIdx]) {
        inCluster[neighborIdx] = 1;
        cluster.push(points[neighborIdx]);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

// ── Cascade Service ───────────────────────────────────────────────────────────

let tableChecked = false;
async function ensureTable() {
  if (!tableChecked) {
    try {
      await syncCascadeAlertsTable();
      tableChecked = true;
    } catch {
      // Ignore if table already exists
    }
  }
}

export const cascadeService = {
  /**
   * Run DBSCAN spatial clustering and cross-category analysis on all active issues.
   */
  async detectCascades(epsMeters: number = 500, minSamples: number = 3): Promise<CascadeCluster[]> {
    await ensureTable();

    // 1. Fetch active issues with coordinates
    const activeIssues = await db
      .select({
        id: issues.id,
        category: issues.category,
        lat: issues.privateLat,
        lng: issues.privateLng,
        wardId: issues.wardId,
        createdAt: issues.createdAt,
        status: issues.status,
      })
      .from(issues)
      .where(
        inArray(issues.status, ['Open', 'Triaged', 'Assigned', 'In Progress', 'Reopened'])
      );

    const validPoints: IssueCoordinate[] = activeIssues
      .filter((i) => typeof i.lat === 'number' && typeof i.lng === 'number' && !isNaN(i.lat) && !isNaN(i.lng))
      .map((i) => ({
        id: i.id,
        category: i.category,
        lat: i.lat,
        lng: i.lng,
        wardId: i.wardId,
        createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
        status: i.status,
      }));

    if (validPoints.length < minSamples) {
      return [];
    }

    // 2. Run DBSCAN spatial clustering
    const rawClusters = runDBSCAN(validPoints, epsMeters, minSamples);

    // 3. Filter for cross-category cascades (>= 3 unique categories OR matching high-priority 2-category pairs)
    const detectedCascades: CascadeCluster[] = [];

    for (const clusterPoints of rawClusters) {
      const categories = Array.from(new Set(clusterPoints.map((p) => p.category)));

      // Must have >= 3 categories, or match predefined strong pairs with at least 2 categories
      const hasStrongPair = CASCADE_PATTERNS.some((p) => p.categories.every((c) => categories.includes(c)));
      if (categories.length < 3 && !hasStrongPair) {
        continue;
      }

      // Compute cluster centroid
      const totalLat = clusterPoints.reduce((acc, p) => acc + p.lat, 0);
      const totalLng = clusterPoints.reduce((acc, p) => acc + p.lng, 0);
      const centerLat = totalLat / clusterPoints.length;
      const centerLng = totalLng / clusterPoints.length;

      // Compute radius (max distance to any point, minimum 100m)
      let maxDist = 100;
      for (const p of clusterPoints) {
        const d = haversineDistanceMeters(centerLat, centerLng, p.lat, p.lng);
        if (d > maxDist) maxDist = d;
      }

      // Determine dominant ward
      const wardCounts = new Map<string, number>();
      for (const p of clusterPoints) {
        if (p.wardId) {
          wardCounts.set(p.wardId, (wardCounts.get(p.wardId) || 0) + 1);
        }
      }
      let dominantWard: string | null = null;
      let maxWardCount = 0;
      wardCounts.forEach((count, ward) => {
        if (count > maxWardCount) {
          maxWardCount = count;
          dominantWard = ward;
        }
      });

      // Temporal burst correlation
      const timestamps = clusterPoints.map((p) => p.createdAt.getTime());
      const oldestIssueAt = new Date(Math.min(...timestamps));
      const newestIssueAt = new Date(Math.max(...timestamps));
      const timeSpanDays = (newestIssueAt.getTime() - oldestIssueAt.getTime()) / 86_400_000;

      // High confidence if burst within 14 days and >= 3 categories
      const confidence: 'low' | 'medium' | 'high' =
        categories.length >= 3 && timeSpanDays <= 14 ? 'high' : categories.length >= 3 ? 'medium' : 'low';

      const suggestedRootCause = matchRootCause(categories);

      detectedCascades.push({
        centerLat: Math.round(centerLat * 10000) / 10000,
        centerLng: Math.round(centerLng * 10000) / 10000,
        radiusMeters: maxDist,
        wardId: dominantWard,
        issues: clusterPoints,
        categories,
        suggestedRootCause,
        confidence,
        oldestIssueAt,
        newestIssueAt,
      });
    }

    // 4. Persist / update alerts in cascadeAlerts table with deduplication
    const existingActive = await db
      .select({
        id: cascadeAlerts.id,
        wardId: cascadeAlerts.wardId,
        centerLat: cascadeAlerts.centerLat,
        centerLng: cascadeAlerts.centerLng,
        radiusMeters: cascadeAlerts.radiusMeters,
      })
      .from(cascadeAlerts)
      .where(eq(cascadeAlerts.status, 'active'));

    for (const cascade of detectedCascades) {
      // Check if a near-identical active alert already exists within the cluster radius
      const existingAlert = existingActive.find((existing) => {
        const dist = haversineDistanceMeters(
          cascade.centerLat,
          cascade.centerLng,
          existing.centerLat,
          existing.centerLng
        );
        return dist <= Math.max(cascade.radiusMeters, existing.radiusMeters);
      });

      if (existingAlert) {
        // Active alert already covers this zone; update issues and details without duplicate row insertion
        await db
          .update(cascadeAlerts)
          .set({
            wardId: cascade.wardId ?? existingAlert.wardId,
            issueIds: cascade.issues.map((i) => i.id),
            categories: cascade.categories,
            suggestedRootCause: cascade.suggestedRootCause,
            confidence: cascade.confidence,
            radiusMeters: Math.max(existingAlert.radiusMeters, cascade.radiusMeters),
          })
          .where(eq(cascadeAlerts.id, existingAlert.id));
        continue;
      }

      await db.insert(cascadeAlerts).values({
        wardId: cascade.wardId,
        centerLat: cascade.centerLat,
        centerLng: cascade.centerLng,
        radiusMeters: cascade.radiusMeters,
        issueIds: cascade.issues.map((i) => i.id),
        categories: cascade.categories,
        suggestedRootCause: cascade.suggestedRootCause,
        confidence: cascade.confidence,
        status: 'active',
      });

      // Track newly inserted alert to avoid duplicate inserts within the same detection batch
      existingActive.push({
        id: `batch-${existingActive.length}`,
        wardId: cascade.wardId,
        centerLat: cascade.centerLat,
        centerLng: cascade.centerLng,
        radiusMeters: cascade.radiusMeters,
      });
    }

    return detectedCascades;
  },

  /**
   * Fetch active cascade alerts, optionally filtered by ward.
   */
  async getActiveAlerts(wardId?: string): Promise<CascadeAlertRecord[]> {
    await ensureTable();

    const query = db
      .select({
        id: cascadeAlerts.id,
        wardId: cascadeAlerts.wardId,
        centerLat: cascadeAlerts.centerLat,
        centerLng: cascadeAlerts.centerLng,
        radiusMeters: cascadeAlerts.radiusMeters,
        issueIds: cascadeAlerts.issueIds,
        categories: cascadeAlerts.categories,
        suggestedRootCause: cascadeAlerts.suggestedRootCause,
        confidence: cascadeAlerts.confidence,
        status: cascadeAlerts.status,
        createdAt: cascadeAlerts.createdAt,
      })
      .from(cascadeAlerts)
      .where(
        wardId
          ? and(eq(cascadeAlerts.status, 'active'), eq(cascadeAlerts.wardId, wardId))
          : eq(cascadeAlerts.status, 'active')
      )
      .orderBy(desc(cascadeAlerts.createdAt));

    const rows = await query;
    return rows.map((r) => ({
      id: r.id,
      wardId: r.wardId,
      centerLat: r.centerLat,
      centerLng: r.centerLng,
      radiusMeters: r.radiusMeters,
      issueIds: (r.issueIds as string[]) || [],
      categories: (r.categories as string[]) || [],
      suggestedRootCause: r.suggestedRootCause,
      confidence: (r.confidence as 'low' | 'medium' | 'high') || 'medium',
      status: (r.status as 'active' | 'acknowledged' | 'resolved') || 'active',
      createdAt: r.createdAt,
    }));
  },

  /**
   * Acknowledge or resolve a cascade alert.
   */
  async updateAlertStatus(id: string, status: 'acknowledged' | 'resolved'): Promise<void> {
    await ensureTable();
    await db.update(cascadeAlerts).set({ status }).where(eq(cascadeAlerts.id, id));
  },
};
