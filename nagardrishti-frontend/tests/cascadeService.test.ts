import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cascadeService,
  haversineDistanceMeters,
  matchRootCause,
  runDBSCAN,
  CASCADE_PATTERNS,
  type IssueCoordinate,
} from '../server/services/cascadeService.js';

// Mock the db with chainable proxy
const { chain, rawWhere, rawOrderBy, rawLimit, rawValues, rawSet } = vi.hoisted(() => {
  function attachChaining(target: any, c: any) {
    if (target && target !== c && (typeof target === 'object' || typeof target === 'function')) {
      target.select = (...args: any[]) => c.select(...args);
      target.from = (...args: any[]) => c.from(...args);
      target.where = (...args: any[]) => c.where(...args);
      target.orderBy = (...args: any[]) => c.orderBy(...args);
      target.limit = (...args: any[]) => c.limit(...args);
      target.insert = (...args: any[]) => c.insert(...args);
      target.values = (...args: any[]) => c.values(...args);
      target.update = (...args: any[]) => c.update(...args);
      target.set = (...args: any[]) => c.set(...args);
    }
    return target;
  }

  const rawWhere = vi.fn();
  const rawOrderBy = vi.fn();
  const rawLimit = vi.fn();
  const rawValues = vi.fn();
  const rawSet = vi.fn();

  const c: any = {};
  c.select = vi.fn().mockReturnValue(c);
  c.from = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);

  c.where = new Proxy(rawWhere, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

  c.orderBy = new Proxy(rawOrderBy, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

  c.limit = new Proxy(rawLimit, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

  c.values = new Proxy(rawValues, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? Promise.resolve([]), c);
    },
  });

  c.set = new Proxy(rawSet, {
    apply(target, thisArg, args) {
      const res = Reflect.apply(target, thisArg, args);
      return attachChaining(res ?? c, c);
    },
  });

  return { chain: c, rawWhere, rawOrderBy, rawLimit, rawValues, rawSet };
});

vi.mock('../server/db/index.js', () => ({
  db: chain,
}));

vi.mock('../server/db/sync_cascade_alerts.js', () => ({
  syncCascadeAlertsTable: vi.fn().mockResolvedValue(undefined),
}));

describe('cascadeService', () => {
  beforeEach(() => {
    rawWhere.mockReset();
    rawOrderBy.mockReset();
    rawLimit.mockReset();
    rawValues.mockReset();
    rawSet.mockReset();

    chain.select.mockReturnValue(chain);
    chain.from.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    chain.update.mockReturnValue(chain);

    rawWhere.mockResolvedValue([]);
    rawOrderBy.mockResolvedValue([]);
    rawValues.mockResolvedValue([]);
    rawSet.mockReturnValue(chain);
  });

  describe('haversineDistanceMeters', () => {
    it('returns 0 for identical points', () => {
      expect(haversineDistanceMeters(18.5204, 73.8567, 18.5204, 73.8567)).toBe(0);
    });

    it('calculates approximately correct distance between known coordinates', () => {
      // Shaniwar Wada to Pune Station (~2.4 km)
      const dist = haversineDistanceMeters(18.5196, 73.8553, 18.5284, 73.8744);
      expect(dist).toBeGreaterThan(2000);
      expect(dist).toBeLessThan(2600);
    });
  });

  describe('matchRootCause', () => {
    it('matches underground pipe failure pattern for water + drainage + pothole', () => {
      const cause = matchRootCause(['water supply', 'drainage/sewage', 'pothole/road']);
      expect(cause).toContain('underground pipe failure');
    });

    it('matches sanitation pattern for waste + drainage + stray animals', () => {
      const cause = matchRootCause(['garbage/waste', 'drainage/sewage', 'stray animals']);
      expect(cause).toContain('neglected sanitation zone');
    });

    it('matches unauthorized construction for streetlight + encroachment', () => {
      const cause = matchRootCause(['streetlight/electrical', 'encroachment']);
      expect(cause).toContain('unauthorized construction');
    });

    it('returns default message for unmatched category mix', () => {
      const cause = matchRootCause(['other', 'stray animals', 'encroachment']);
      expect(cause).toContain('Multiple intersecting infrastructure failures');
    });
  });

  describe('runDBSCAN', () => {
    it('returns empty array when points fewer than minSamples', () => {
      const points: IssueCoordinate[] = [
        { id: '1', category: 'pothole/road', lat: 18.5204, lng: 73.8567, wardId: 'ward-11', createdAt: new Date(), status: 'Open' },
        { id: '2', category: 'drainage/sewage', lat: 18.5205, lng: 73.8568, wardId: 'ward-11', createdAt: new Date(), status: 'Open' },
      ];
      expect(runDBSCAN(points, 500, 3)).toHaveLength(0);
    });

    it('clusters points within eps=500m together', () => {
      const centerLat = 18.5204;
      const centerLng = 73.8567;
      const points: IssueCoordinate[] = [
        { id: '1', category: 'pothole/road', lat: centerLat, lng: centerLng, wardId: 'ward-11', createdAt: new Date(), status: 'Open' },
        { id: '2', category: 'water supply', lat: centerLat + 0.001, lng: centerLng + 0.001, wardId: 'ward-11', createdAt: new Date(), status: 'Open' }, // ~150m
        { id: '3', category: 'drainage/sewage', lat: centerLat - 0.001, lng: centerLng - 0.001, wardId: 'ward-11', createdAt: new Date(), status: 'Open' }, // ~150m
      ];

      const clusters = runDBSCAN(points, 500, 3);
      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toHaveLength(3);
    });

    it('separates distant points into separate clusters or noise', () => {
      const points: IssueCoordinate[] = [
        // Cluster 1 (Kothrud)
        { id: '1', category: 'pothole/road', lat: 18.5074, lng: 73.8071, wardId: 'ward-11', createdAt: new Date(), status: 'Open' },
        { id: '2', category: 'water supply', lat: 18.5076, lng: 73.8073, wardId: 'ward-11', createdAt: new Date(), status: 'Open' },
        { id: '3', category: 'drainage/sewage', lat: 18.5078, lng: 73.8075, wardId: 'ward-11', createdAt: new Date(), status: 'Open' },
        // Distant isolated point (Swargate ~5km away)
        { id: '4', category: 'pothole/road', lat: 18.5029, lng: 73.8553, wardId: 'ward-14', createdAt: new Date(), status: 'Open' },
      ];

      const clusters = runDBSCAN(points, 500, 3);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].map((p) => p.id)).toEqual(expect.arrayContaining(['1', '2', '3']));
      expect(clusters[0].some((p) => p.id === '4')).toBe(false);
    });
  });

  describe('detectCascades', () => {
    it('detects cross-category cascade with >= 3 categories and burst confidence', async () => {
      const now = new Date('2026-09-10T12:00:00Z');
      const mockActiveIssues = [
        {
          id: 'issue-1',
          category: 'water supply',
          privateLat: 18.5204,
          privateLng: 73.8567,
          wardId: 'ward-14',
          createdAt: now,
          status: 'Open',
        },
        {
          id: 'issue-2',
          category: 'drainage/sewage',
          privateLat: 18.5208,
          privateLng: 73.8570,
          wardId: 'ward-14',
          createdAt: new Date(now.getTime() + 2 * 86400000), // +2 days
          status: 'In Progress',
        },
        {
          id: 'issue-3',
          category: 'pothole/road',
          privateLat: 18.5202,
          privateLng: 73.8565,
          wardId: 'ward-14',
          createdAt: new Date(now.getTime() + 4 * 86400000), // +4 days
          status: 'Assigned',
        },
      ];

      rawWhere.mockResolvedValueOnce(mockActiveIssues);

      const cascades = await cascadeService.detectCascades(500, 3);

      expect(cascades).toHaveLength(1);
      const c = cascades[0];
      expect(c.categories).toEqual(expect.arrayContaining(['water supply', 'drainage/sewage', 'pothole/road']));
      expect(c.confidence).toBe('high'); // burst within 4 days (< 14) and 3 categories
      expect(c.suggestedRootCause).toContain('underground pipe failure');
      expect(c.wardId).toBe('ward-14');
      expect(c.issues).toHaveLength(3);
    });

    it('ignores spatial clusters that only contain a single category', async () => {
      const now = new Date();
      const mockSingleCategoryIssues = [
        { id: '1', category: 'pothole/road', privateLat: 18.52, privateLng: 73.85, wardId: 'ward-11', createdAt: now, status: 'Open' },
        { id: '2', category: 'pothole/road', privateLat: 18.5201, privateLng: 73.8501, wardId: 'ward-11', createdAt: now, status: 'Open' },
        { id: '3', category: 'pothole/road', privateLat: 18.5202, privateLng: 73.8502, wardId: 'ward-11', createdAt: now, status: 'Open' },
      ];

      rawWhere.mockResolvedValueOnce(mockSingleCategoryIssues);

      const cascades = await cascadeService.detectCascades(500, 3);
      expect(cascades).toHaveLength(0);
    });

    it('deduplicates alerts and updates existing active alert within same radius', async () => {
      const now = new Date('2026-09-10T12:00:00Z');
      const mockActiveIssues = [
        { id: '1', category: 'water supply', privateLat: 18.5204, privateLng: 73.8567, wardId: 'ward-14', createdAt: now, status: 'Open' },
        { id: '2', category: 'drainage/sewage', privateLat: 18.5208, privateLng: 73.8570, wardId: 'ward-14', createdAt: now, status: 'Open' },
        { id: '3', category: 'pothole/road', privateLat: 18.5202, privateLng: 73.8565, wardId: 'ward-14', createdAt: now, status: 'Open' },
      ];

      rawWhere
        .mockResolvedValueOnce(mockActiveIssues)
        .mockResolvedValueOnce([
          {
            id: 'existing-alert-uuid',
            wardId: 'ward-14',
            centerLat: 18.5204,
            centerLng: 73.8567,
            radiusMeters: 100,
          },
        ]);

      const cascades = await cascadeService.detectCascades(500, 3);
      expect(cascades).toHaveLength(1);
      expect(chain.update).toHaveBeenCalled();
    });
  });
});

