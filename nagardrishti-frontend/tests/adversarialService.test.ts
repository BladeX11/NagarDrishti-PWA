/**
 * adversarialService.test.ts
 *
 * Tests all 4 adversarial detection rules as pure unit tests.
 * DB is fully mocked — no PostgreSQL required.
 * Each test exercises: detection threshold, severity assignment, duplication guard,
 * opportunistic-skip conditions, and pure math helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Helpers under test (exported for testing) ───────────────────────────────
// We test these by re-implementing them inline to validate the logic,
// then test the service methods by mocking db accordingly.

// ── Pure math helpers ─────────────────────────────────────────────────────────
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;
    while (xor > 0) { distance += xor & 1; xor >>= 1; }
  }
  return distance;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── DB mock ─────────────────────────────────────────────────────────────────
vi.mock('../server/db/index.js', () => {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue([]);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockResolvedValue([]);
  // Terminal .where also needs to support being awaited directly
  chain.where.mockResolvedValue([]);
  return { db: chain };
});

vi.mock('../server/db/schema.js', () => ({
  adversarialFlags: { id: 'id', issueId: 'issueId', rule: 'rule', severity: 'severity', details: 'details', resolvedAt: 'resolvedAt', modelVersion: 'modelVersion' },
  issueMedia: { id: 'id', issueId: 'issueId', perceptualHash: 'perceptualHash', exifLat: 'exifLat', exifLng: 'exifLng', type: 'type' },
  issues: { id: 'id', createdAt: 'createdAt', category: 'category', privateLat: 'privateLat', privateLng: 'privateLng' },
  statusEvents: { id: 'id', issueId: 'issueId', toStatus: 'toStatus', actorId: 'actorId', createdAt: 'createdAt', sequenceNum: 'sequenceNum' },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  inArray: vi.fn(),
  isNotNull: vi.fn(),
  ne: vi.fn(),
  notInArray: vi.fn(),
  sql: vi.fn(),
}));

import { db } from '../server/db/index.js';
import { adversarialService } from '../server/services/adversarialService.js';

// ─── Test helpers ──────────────────────────────────────────────────────────── 
function makeChain(terminalValues: Record<string, any> = {}) {
  (db as any).select.mockReturnValue(db);
  (db as any).from.mockReturnValue(db);
  (db as any).where.mockReturnValue(db);
  (db as any).orderBy.mockReturnValue(db);
  (db as any).limit.mockResolvedValue(terminalValues.limit ?? []);
  (db as any).where.mockResolvedValue(terminalValues.where ?? []);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Pure Math Helpers', () => {
  describe('hammingDistance', () => {
    it('returns 0 for identical hashes', () => {
      expect(hammingDistance('0000000000000000', '0000000000000000')).toBe(0);
    });

    it('returns 64 for different length hashes', () => {
      expect(hammingDistance('0000', '00000000')).toBe(64);
    });

    it('calculates correct distance for single differing nibble', () => {
      // 0x0 vs 0x1 → XOR = 1 → 1 bit
      expect(hammingDistance('0000000000000000', '0000000000000001')).toBe(1);
    });

    it('calculates correct distance for multiple differing nibbles', () => {
      // 0xF vs 0x0 → 4 bits per position
      expect(hammingDistance('f000000000000000', '0000000000000000')).toBe(4);
    });

    it('flags as match for distance <= 8', () => {
      // Same hash = distance 0 — far below threshold
      const h = 'abcdef1234567890';
      expect(hammingDistance(h, h)).toBeLessThanOrEqual(8);
    });

    it('flags as "not match" for distance > 8', () => {
      // Highly different hashes
      expect(hammingDistance('ffffffffffffffff', '0000000000000000')).toBeGreaterThan(8);
    });

    it('severity: distance <= 4 should be high, 5-8 should be medium', () => {
      // 0x0 vs 0xf → 4 bits set
      const dist4 = hammingDistance('f000000000000000', '0000000000000000');
      expect(dist4).toBe(4); // exactly threshold for high
      expect(dist4 <= 4 ? 'high' : 'medium').toBe('high');

      // 0x0 vs 0xff → 8 bits set (first 2 nibbles differ by max)
      const dist8 = hammingDistance('ff00000000000000', '0000000000000000');
      expect(dist8).toBe(8);
      expect(dist8 <= 4 ? 'high' : 'medium').toBe('medium');
    });
  });

  describe('haversineDistance', () => {
    it('returns 0 for same coordinates', () => {
      expect(haversineDistance(18.52, 73.85, 18.52, 73.85)).toBe(0);
    });

    it('returns ~0 for extremely close coordinates', () => {
      const dist = haversineDistance(18.52, 73.85, 18.5200001, 73.8500001);
      expect(dist).toBeLessThan(5); // < 5 meters
    });

    it('correctly identifies > 500m distance', () => {
      // ~5 km apart
      const dist = haversineDistance(18.52, 73.85, 18.565, 73.85);
      expect(dist).toBeGreaterThan(500);
    });

    it('correctly identifies > 2000m distance (high severity)', () => {
      // ~18 km apart
      const dist = haversineDistance(18.52, 73.85, 18.68, 73.85);
      expect(dist).toBeGreaterThan(2000);
    });

    it('returns < 500m for nearby coordinates (no flag)', () => {
      // < 100m apart
      const dist = haversineDistance(18.52, 73.85, 18.5204, 73.85);
      expect(dist).toBeLessThan(500);
    });
  });
});

describe('adversarialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeChain();
  });

  describe('Rule 1: checkPhotoReuse', () => {
    it('does NOT flag if media has no perceptualHash', async () => {
      (db as any).where.mockResolvedValueOnce([{ id: 'm1', issueId: 'iss-1', perceptualHash: null, exifLat: null, exifLng: null, type: 'after' }]);
      const insertSpy = (db as any).values;
      await adversarialService.checkPhotoReuse('m1', 'iss-1');
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('does NOT flag if media is not found', async () => {
      (db as any).where.mockResolvedValueOnce([]);
      const insertSpy = (db as any).values;
      await adversarialService.checkPhotoReuse('missing', 'iss-1');
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('does NOT flag if hamming distance > 8', async () => {
      // Media with a hash
      (db as any).where
        .mockResolvedValueOnce([{ id: 'm1', issueId: 'iss-1', perceptualHash: 'ffffffffffffffff', exifLat: null, exifLng: null }])
        // Candidates with a very different hash
        .mockResolvedValueOnce([{ id: 'm2', issueId: 'iss-2', perceptualHash: '0000000000000000' }])
        // _insertFlag duplicate check → no existing flag
        .mockResolvedValueOnce([]);
      const insertSpy = (db as any).values;
      await adversarialService.checkPhotoReuse('m1', 'iss-1');
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('flags PHOTO_REUSE with severity HIGH when distance <= 4', async () => {
      const sameHash = '0000000000000000';
      // First call: fetch the media being checked
      (db as any).where
        .mockResolvedValueOnce([{ id: 'm1', issueId: 'iss-1', perceptualHash: sameHash, exifLat: null, exifLng: null }])
        // Second call: candidates
        .mockResolvedValueOnce([{ id: 'm2', issueId: 'iss-2', perceptualHash: sameHash }])
        // Third call: _insertFlag duplicate check
        .mockResolvedValueOnce([]);

      const insertSpy = (db as any).values;
      await adversarialService.checkPhotoReuse('m1', 'iss-1');
      expect(insertSpy).toHaveBeenCalledOnce();
      const call = insertSpy.mock.calls[0][0];
      expect(call.rule).toBe('PHOTO_REUSE');
      expect(call.severity).toBe('high');
      expect(call.details.hammingDistance).toBe(0);
    });

    it('flags PHOTO_REUSE with severity MEDIUM when distance is 5-8', async () => {
      // distance 8: 0xf vs 0x0 in first 2 nibbles (4 bits each = 8 total)
      (db as any).where
        .mockResolvedValueOnce([{ id: 'm1', issueId: 'iss-1', perceptualHash: 'ff00000000000000', exifLat: null, exifLng: null }])
        .mockResolvedValueOnce([{ id: 'm2', issueId: 'iss-2', perceptualHash: '0000000000000000' }])
        .mockResolvedValueOnce([]);

      await adversarialService.checkPhotoReuse('m1', 'iss-1');
      const call = (db as any).values.mock.calls[0][0];
      expect(call.severity).toBe('medium');
      expect(call.details.hammingDistance).toBe(8);
    });

    it('does NOT insert duplicate flag if one already exists', async () => {
      const sameHash = 'abcdef0123456789';
      (db as any).where
        .mockResolvedValueOnce([{ id: 'm1', issueId: 'iss-1', perceptualHash: sameHash }])
        .mockResolvedValueOnce([{ id: 'm2', issueId: 'iss-2', perceptualHash: sameHash }])
        // _insertFlag: existing flag found
        .mockResolvedValueOnce([{ id: 'flag-existing' }]);

      await adversarialService.checkPhotoReuse('m1', 'iss-1');
      expect((db as any).values).not.toHaveBeenCalled();
    });
  });

  describe('Rule 2: checkTemporalImpossibility', () => {
    it('does NOT flag if issue not found', async () => {
      (db as any).where.mockResolvedValueOnce([]);
      await adversarialService.checkTemporalImpossibility('iss-1');
      expect((db as any).values).not.toHaveBeenCalled();
    });

    it('does NOT flag if no Claimed Resolved event exists', async () => {
      (db as any).where.mockResolvedValueOnce([{ createdAt: new Date(Date.now() - 48 * 3_600_000), category: 'pothole/road' }]);
      (db as any).limit.mockResolvedValueOnce([]);
      await adversarialService.checkTemporalImpossibility('iss-1');
      expect((db as any).values).not.toHaveBeenCalled();
    });

    it('does NOT flag when resolution time is plausible (ratio > 0.10)', async () => {
      const createdAt = new Date(Date.now() - 50 * 3_600_000); // 50 hours ago
      const resolvedAt = new Date(); // just now
      // pothole median = 120h; ratio = 50/120 ≈ 0.42 > 0.10 → no flag
      (db as any).where.mockResolvedValueOnce([{ createdAt, category: 'pothole/road' }]);
      (db as any).limit.mockResolvedValueOnce([{ createdAt: resolvedAt }]);
      (db as any).where.mockResolvedValueOnce([]); // duplicate check never reached
      await adversarialService.checkTemporalImpossibility('iss-1');
      expect((db as any).values).not.toHaveBeenCalled();
    });

    it('flags TEMPORAL with HIGH severity when ratio < 0.10', async () => {
      const createdAt = new Date(Date.now() - 5 * 3_600_000); // 5 hours ago
      const resolvedAt = new Date(); // just now
      // pothole median = 120h; ratio = 5/120 ≈ 0.042 < 0.10 → flag
      (db as any).where.mockResolvedValueOnce([{ createdAt, category: 'pothole/road' }]);
      (db as any).limit.mockResolvedValueOnce([{ createdAt: resolvedAt }]);
      (db as any).where.mockResolvedValueOnce([]); // no existing flag

      await adversarialService.checkTemporalImpossibility('iss-1');
      const call = (db as any).values.mock.calls[0][0];
      expect(call.rule).toBe('TEMPORAL');
      expect(call.severity).toBe('high');
      expect(call.details.category).toBe('pothole/road');
      expect(call.details.ratioToMedian).toBeLessThan(0.10);
    });

    it('uses fallback median 96h for unknown category', async () => {
      const createdAt = new Date(Date.now() - 2 * 3_600_000); // 2 hours ago
      const resolvedAt = new Date();
      // fallback = 96h; ratio = 2/96 ≈ 0.021 < 0.10 → flag
      (db as any).where.mockResolvedValueOnce([{ createdAt, category: 'unknowncategory' }]);
      (db as any).limit.mockResolvedValueOnce([{ createdAt: resolvedAt }]);
      (db as any).where.mockResolvedValueOnce([]);

      await adversarialService.checkTemporalImpossibility('iss-1');
      const call = (db as any).values.mock.calls[0][0];
      expect(call.details.medianHours).toBe(96);
    });

    it('uses streetlight/electrical median (24h)', async () => {
      const createdAt = new Date(Date.now() - 1 * 3_600_000); // 1 hour ago — ratio = 1/24 ≈ 0.042 → flag
      const resolvedAt = new Date();
      (db as any).where.mockResolvedValueOnce([{ createdAt, category: 'streetlight/electrical' }]);
      (db as any).limit.mockResolvedValueOnce([{ createdAt: resolvedAt }]);
      (db as any).where.mockResolvedValueOnce([]);

      await adversarialService.checkTemporalImpossibility('iss-1');
      const call = (db as any).values.mock.calls[0][0];
      expect(call.details.medianHours).toBe(24);
    });
  });

  describe('Rule 3: checkGpsMismatch', () => {
    it('does NOT flag if media has no EXIF GPS', async () => {
      (db as any).where.mockResolvedValueOnce([{ id: 'm1', exifLat: null, exifLng: null }]);
      await adversarialService.checkGpsMismatch('iss-1', 'm1');
      expect((db as any).values).not.toHaveBeenCalled();
    });

    it('does NOT flag if media is not found', async () => {
      (db as any).where.mockResolvedValueOnce([]);
      await adversarialService.checkGpsMismatch('iss-1', 'missing');
      expect((db as any).values).not.toHaveBeenCalled();
    });

    it('does NOT flag if distance < 500m', async () => {
      // < 100m apart
      (db as any).where
        .mockResolvedValueOnce([{ id: 'm1', exifLat: 18.52, exifLng: 73.85 }])
        .mockResolvedValueOnce([{ privateLat: 18.5204, privateLng: 73.85 }]);
      await adversarialService.checkGpsMismatch('iss-1', 'm1');
      expect((db as any).values).not.toHaveBeenCalled();
    });

    it('flags GPS_MISMATCH with MEDIUM severity for 500-2000m', async () => {
      // ~1km apart: 18.52 vs 18.529 ≈ ~1000m
      (db as any).where
        .mockResolvedValueOnce([{ id: 'm1', exifLat: 18.52, exifLng: 73.85 }])
        .mockResolvedValueOnce([{ privateLat: 18.529, privateLng: 73.85 }])
        .mockResolvedValueOnce([]); // no existing flag

      await adversarialService.checkGpsMismatch('iss-1', 'm1');
      const call = (db as any).values.mock.calls[0][0];
      expect(call.rule).toBe('GPS_MISMATCH');
      expect(call.severity).toBe('medium');
    });

    it('flags GPS_MISMATCH with HIGH severity for > 2000m', async () => {
      // ~18km apart
      (db as any).where
        .mockResolvedValueOnce([{ id: 'm1', exifLat: 18.52, exifLng: 73.85 }])
        .mockResolvedValueOnce([{ privateLat: 18.68, privateLng: 73.85 }])
        .mockResolvedValueOnce([]);

      await adversarialService.checkGpsMismatch('iss-1', 'm1');
      const call = (db as any).values.mock.calls[0][0];
      expect(call.severity).toBe('high');
    });

    it('does NOT store issue private coordinates in flag details (privacy)', async () => {
      (db as any).where
        .mockResolvedValueOnce([{ id: 'm1', exifLat: 18.52, exifLng: 73.85 }])
        .mockResolvedValueOnce([{ privateLat: 18.68, privateLng: 73.85 }])
        .mockResolvedValueOnce([]);

      await adversarialService.checkGpsMismatch('iss-1', 'm1');
      const details = (db as any).values.mock.calls[0][0].details;
      expect(details).not.toHaveProperty('issueLat');
      expect(details).not.toHaveProperty('issueLng');
      expect(details).not.toHaveProperty('privateLat');
      expect(details).not.toHaveProperty('privateLng');
      expect(details).toHaveProperty('photoLat');
      expect(details).toHaveProperty('distanceMeters');
    });
  });

  describe('Rule 4: checkBulkClosureAnomaly', () => {
    it('does NOT flag when officer has < 5 closures today', async () => {
      // 3 closures today — below minimum threshold
      (db as any).where.mockResolvedValueOnce([
        { actorId: 'officer-1', issueId: 'i1', createdAt: new Date() },
        { actorId: 'officer-1', issueId: 'i2', createdAt: new Date() },
        { actorId: 'officer-1', issueId: 'i3', createdAt: new Date() },
      ]);
      await adversarialService.checkBulkClosureAnomaly();
      expect((db as any).values).not.toHaveBeenCalled();
    });

    it('does NOT flag when officer has fewer than 5 days of history', async () => {
      // 5 closures today but only 3 days of history
      (db as any).where
        .mockResolvedValueOnce([
          { actorId: 'officer-1', issueId: 'i1', createdAt: new Date() },
          { actorId: 'officer-1', issueId: 'i2', createdAt: new Date() },
          { actorId: 'officer-1', issueId: 'i3', createdAt: new Date() },
          { actorId: 'officer-1', issueId: 'i4', createdAt: new Date() },
          { actorId: 'officer-1', issueId: 'i5', createdAt: new Date() },
        ])
        // History: only 3 distinct days
        .mockResolvedValueOnce([
          { createdAt: new Date('2026-09-20') },
          { createdAt: new Date('2026-09-21') },
          { createdAt: new Date('2026-09-22') },
        ]);

      await adversarialService.checkBulkClosureAnomaly();
      expect((db as any).values).not.toHaveBeenCalled();
    });

    it('flags BULK_CLOSURE when closures exceed mean + 2σ with sufficient history', async () => {
      const today = new Date();
      // Officer closes 20 issues today
      const todayClosures = Array.from({ length: 20 }, (_, i) => ({
        actorId: 'officer-1',
        issueId: `i${i}`,
        createdAt: today,
      }));

      // History: 6 days, each with 2 closures → mean=2, σ=0, limit=2
      const historyClosures = [
        { createdAt: new Date('2026-09-20') },
        { createdAt: new Date('2026-09-20') },
        { createdAt: new Date('2026-09-21') },
        { createdAt: new Date('2026-09-21') },
        { createdAt: new Date('2026-09-22') },
        { createdAt: new Date('2026-09-22') },
        { createdAt: new Date('2026-09-23') },
        { createdAt: new Date('2026-09-23') },
        { createdAt: new Date('2026-09-24') },
        { createdAt: new Date('2026-09-24') },
        { createdAt: new Date('2026-09-25') },
        { createdAt: new Date('2026-09-25') },
      ];

      (db as any).where
        .mockResolvedValueOnce(todayClosures)   // today's closures
        .mockResolvedValueOnce(historyClosures) // 30-day history
        // _insertFlag duplicate check repeated 20x — none exist
        .mockResolvedValue([]);

      await adversarialService.checkBulkClosureAnomaly();
      // Should flag all 20 issues
      expect((db as any).values).toHaveBeenCalledTimes(20);
      const firstCall = (db as any).values.mock.calls[0][0];
      expect(firstCall.rule).toBe('BULK_CLOSURE');
      expect(firstCall.severity).toBe('medium');
      expect(firstCall.details.officerId).toBe('officer-1');
      expect(firstCall.details.closuresToday).toBe(20);
    });
  });

  describe('getActiveFlags', () => {
    it('returns all flags for an issue', async () => {
      const mockFlags = [
        { id: 'f1', issueId: 'iss-1', rule: 'TEMPORAL', severity: 'high', resolvedAt: null },
        { id: 'f2', issueId: 'iss-1', rule: 'PHOTO_REUSE', severity: 'medium', resolvedAt: null },
      ];
      (db as any).where.mockResolvedValueOnce(mockFlags);
      const flags = await adversarialService.getActiveFlags('iss-1');
      expect(flags).toHaveLength(2);
      expect(flags[0].rule).toBe('TEMPORAL');
    });

    it('returns empty array for issue with no flags', async () => {
      (db as any).where.mockResolvedValueOnce([]);
      const flags = await adversarialService.getActiveFlags('iss-clean');
      expect(flags).toHaveLength(0);
    });
  });

  describe('resolveFlag', () => {
    it('calls db.update with resolvedAt and resolution', async () => {
      (db as any).where.mockResolvedValueOnce([]);
      (db as any).set.mockReturnValue(db);

      await adversarialService.resolveFlag('flag-1', 'dismissed', 'user-123');
      expect((db as any).set).toHaveBeenCalledOnce();
      const setArgs = (db as any).set.mock.calls[0][0];
      expect(setArgs.resolution).toBe('dismissed');
      expect(setArgs.resolvedBy).toBe('user-123');
      expect(setArgs.resolvedAt).toBeInstanceOf(Date);
    });
  });

  describe('runProofChecks (orchestration)', () => {
    it('runs all three checks without throwing even if one fails', async () => {
      // First call (checkPhotoReuse media fetch) → throw
      (db as any).where
        .mockRejectedValueOnce(new Error('DB connection error'))
        .mockResolvedValue([]);

      // Should resolve without throwing
      await expect(adversarialService.runProofChecks('iss-1', 'm1')).resolves.toBeUndefined();
    });

    it('does not throw even if all three checks fail', async () => {
      (db as any).where.mockRejectedValue(new Error('Total outage'));
      await expect(adversarialService.runProofChecks('iss-1', 'm1')).resolves.toBeUndefined();
    });
  });
});
