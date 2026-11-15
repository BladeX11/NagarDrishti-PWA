import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractExifGps, storeIssueImage } from '../server/services/objectStorage.js';
import { privacyService } from '../server/services/privacyService.js';

// ─── S3 Mocking ─────────────────────────────────────────────────────────────
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: vi.fn().mockImplementation((args) => args),
  };
});

// ─── Sharp Mocking ──────────────────────────────────────────────────────────
vi.mock('sharp', () => {
  return {
    default: vi.fn().mockImplementation((buffer: Buffer) => {
      // Reject non-image or explicit SVG/HTML payloads
      const str = buffer.toString('utf8', 0, Math.min(buffer.length, 100));
      if (str.includes('<svg') || str.includes('<html')) {
        throw new Error('Input buffer contains unsupported vector or markup format');
      }

      return {
        rotate: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(
          // Return a sanitized minimal JPEG buffer (SOI + DQT + EOI) with NO EXIF
          Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x01, 0xff, 0xd9])
        ),
      };
    }),
  };
});

// ─── File System Mocking ────────────────────────────────────────────────────
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// ─── Synthetic EXIF Buffer Generator ─────────────────────────────────────────
function createJpegWithGps(opts: {
  lat: [number, number, number]; // [deg, min, sec]
  latRef: 'N' | 'S';
  lng: [number, number, number];
  lngRef: 'E' | 'W';
}): Buffer {
  // Little-Endian TIFF Header + IFD0 (tag 0x8825) + GPS IFD + Rational Values
  const tiff = Buffer.alloc(140);
  let p = 0;

  // TIFF Header: 'II', magic 42, offset to IFD0 (8)
  tiff.write('II', p); p += 2;
  tiff.writeUInt16LE(42, p); p += 2;
  tiff.writeUInt32LE(8, p); p += 4;

  // IFD0: 1 entry (GPS IFD tag 0x8825)
  tiff.writeUInt16LE(1, p); p += 2; // entry count = 1
  tiff.writeUInt16LE(0x8825, p); p += 2; // tag 0x8825 (GPS IFD)
  tiff.writeUInt16LE(4, p); p += 2; // type LONG
  tiff.writeUInt32LE(1, p); p += 4; // count 1
  tiff.writeUInt32LE(26, p); p += 4; // offset to GPS IFD = 26
  tiff.writeUInt32LE(0, p); p += 4; // next IFD = 0

  // GPS IFD (at offset 26): 4 entries
  tiff.writeUInt16LE(4, p); p += 2; // count = 4

  // Tag 1: GPSLatitudeRef
  tiff.writeUInt16LE(1, p); p += 2;
  tiff.writeUInt16LE(2, p); p += 2; // ASCII
  tiff.writeUInt32LE(2, p); p += 4; // count 2
  tiff.write(opts.latRef + '\0', p); p += 4; // value inline

  // Tag 2: GPSLatitude (offset to 3 rationals)
  tiff.writeUInt16LE(2, p); p += 2;
  tiff.writeUInt16LE(5, p); p += 2; // RATIONAL
  tiff.writeUInt32LE(3, p); p += 4; // count 3
  const latValOffset = 80;
  tiff.writeUInt32LE(latValOffset, p); p += 4;

  // Tag 3: GPSLongitudeRef
  tiff.writeUInt16LE(3, p); p += 2;
  tiff.writeUInt16LE(2, p); p += 2; // ASCII
  tiff.writeUInt32LE(2, p); p += 4; // count 2
  tiff.write(opts.lngRef + '\0', p); p += 4; // value inline

  // Tag 4: GPSLongitude (offset to 3 rationals)
  tiff.writeUInt16LE(4, p); p += 2;
  tiff.writeUInt16LE(5, p); p += 2; // RATIONAL
  tiff.writeUInt32LE(3, p); p += 4; // count 3
  const lngValOffset = 104;
  tiff.writeUInt32LE(lngValOffset, p); p += 4;
  tiff.writeUInt32LE(0, p); p += 4; // next IFD

  // Write Latitude Rationals (at offset 80)
  for (let i = 0; i < 3; i++) {
    tiff.writeUInt32LE(opts.lat[i], latValOffset + i * 8);
    tiff.writeUInt32LE(1, latValOffset + i * 8 + 4); // denominator 1
  }

  // Write Longitude Rationals (at offset 104)
  for (let i = 0; i < 3; i++) {
    tiff.writeUInt32LE(opts.lng[i], lngValOffset + i * 8);
    tiff.writeUInt32LE(1, lngValOffset + i * 8 + 4); // denominator 1
  }

  // Wrap in JPEG APP1 segment: SOI + APP1 marker + length + "Exif\0\0" + TIFF + EOI
  const exifHeader = Buffer.from('Exif\0\0', 'ascii');
  const app1Length = 2 + exifHeader.length + tiff.length;
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    Buffer.from([0xff, 0xe1]), // APP1
    Buffer.from([(app1Length >> 8) & 0xff, app1Length & 0xff]),
    exifHeader,
    tiff,
    Buffer.from([0xff, 0xd9]), // EOI
  ]);

  return jpeg;
}

describe('Object Storage & Citizen Photo Privacy', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. EXIF GPS Extraction & Stripping', () => {
    it('extracts GPS latitude and longitude from valid JPEG with EXIF APP1', () => {
      const jpeg = createJpegWithGps({
        lat: [18, 31, 14], // 18 + 31/60 + 14/3600 = ~18.5205556
        latRef: 'N',
        lng: [73, 51, 24], // 73 + 51/60 + 24/3600 = ~73.8566667
        lngRef: 'E',
      });

      const gps = extractExifGps(jpeg);
      expect(gps.lat).toBeCloseTo(18.5205556, 4);
      expect(gps.lng).toBeCloseTo(73.8566667, 4);
    });

    it('correctly negates coordinates when reference is South or West', () => {
      const jpeg = createJpegWithGps({
        lat: [33, 52, 10],
        latRef: 'S',
        lng: [151, 12, 30],
        lngRef: 'W',
      });

      const gps = extractExifGps(jpeg);
      expect(gps.lat).toBeLessThan(0);
      expect(gps.lat).toBeCloseTo(-33.8694444, 4);
      expect(gps.lng).toBeLessThan(0);
      expect(gps.lng).toBeCloseTo(-151.2083333, 4);
    });

    it('returns nulls safely when image is non-JPEG or contains no EXIF segment', () => {
      const plainPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const gpsPng = extractExifGps(plainPng);
      expect(gpsPng).toEqual({ lat: null, lng: null });

      const plainJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]);
      const gpsPlain = extractExifGps(plainJpeg);
      expect(gpsPlain).toEqual({ lat: null, lng: null });
    });

    it('handles truncated or corrupted EXIF buffers gracefully without throwing', () => {
      const corrupt = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xff]);
      const gps = extractExifGps(corrupt);
      expect(gps).toEqual({ lat: null, lng: null });
    });
  });

  describe('2. Malicious and Non-Raster Payload Rejection', () => {
    it('rejects image/svg+xml uploads to protect against Stored XSS', async () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      await expect(
        storeIssueImage({
          buffer: svgBuffer,
          mimeType: 'image/svg+xml',
          extension: 'svg',
        })
      ).rejects.toThrow(/Vector and HTML images are not permitted/);
    });

    it('rejects text/html uploads disguised with image extensions', async () => {
      const htmlBuffer = Buffer.from('<html><body onload="alert(1)">malicious</body></html>');
      await expect(
        storeIssueImage({
          buffer: htmlBuffer,
          mimeType: 'text/html',
          extension: 'jpg',
        })
      ).rejects.toThrow(/Vector and HTML images are not permitted/);
    });
  });

  describe('3. Public and Private Storage Separation', () => {
    it('stores original unmodified bytes to private path and sanitized derivative to public path in local dev', async () => {
      process.env.OBJECT_STORAGE_REQUIRED = 'false';
      delete process.env.OBJECT_STORAGE_PRIVATE_BUCKET;
      delete process.env.OBJECT_STORAGE_PUBLIC_BUCKET;
      delete process.env.OBJECT_STORAGE_BUCKET;

      const originalJpeg = createJpegWithGps({
        lat: [18, 31, 0],
        latRef: 'N',
        lng: [73, 51, 0],
        lngRef: 'E',
      });

      const result = await storeIssueImage({
        buffer: originalJpeg,
        mimeType: 'image/jpeg',
        extension: 'jpg',
      });

      // Private path points to local private originals
      expect(result.privatePath).toMatch(/^\/uploads\/private\/originals\/.+\.jpg$/);
      // Public path points to local public sanitized issues
      expect(result.publicPath).toMatch(/^\/uploads\/public\/issues\/.+\.jpg$/);
      // EXIF coordinates extracted for backend records
      expect(result.exifLat).toBeCloseTo(18.5166667, 4);
      expect(result.exifLng).toBeCloseTo(73.85, 4);
    });

    it('refuses local disk fallback and throws when OBJECT_STORAGE_REQUIRED is true in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.OBJECT_STORAGE_REQUIRED = 'true';
      delete process.env.OBJECT_STORAGE_PRIVATE_BUCKET;
      delete process.env.OBJECT_STORAGE_PUBLIC_BUCKET;
      delete process.env.OBJECT_STORAGE_BUCKET;

      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
      await expect(
        storeIssueImage({
          buffer,
          mimeType: 'image/jpeg',
          extension: 'jpg',
        })
      ).rejects.toThrow(/Object storage is required in production but is not fully configured/);
    });
  });

  describe('4. Public API Privacy Redaction', () => {
    it('redacts privatePath, exifLat, exifLng, fileHash, perceptualHash, privateLat, privateLng, and reporterId', () => {
      const mockIssue = {
        id: 'issue-101',
        publicRef: 'ND-ABC123',
        title: 'Broken road surface',
        category: 'pothole/road',
        status: 'Open',
        privateLat: 18.5204303,
        privateLng: 73.8567437,
        publicLat: 18.52,
        publicLng: 73.86,
        publicGeohash: 'tek3pw',
        reporterId: 'user-secret-citizen-uuid',
        media: [
          {
            id: 'media-001',
            issueId: 'issue-101',
            type: 'before',
            privatePath: 's3://nagardrishti-private/originals/2026-11-15/secret-original.jpg',
            publicPath: 'https://media.nagardrishti.org/public/issues/2026-11-15/sanitized.jpg',
            fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            perceptualHash: 'e3b0c44298fc1c14',
            exifLat: 18.5204303,
            exifLng: 73.8567437,
            fileSize: 4500000,
            mimeType: 'image/jpeg',
            privacyReviewed: true,
            createdAt: new Date('2026-11-15T00:00:00Z'),
          },
        ],
      };

      const redacted = privacyService.redactForPublic(mockIssue);

      // Verify root-level private coordinates & identity are stripped
      expect(redacted.privateLat).toBeUndefined();
      expect(redacted.privateLng).toBeUndefined();
      expect(redacted.reporterId).toBeUndefined();

      // Verify coarsened coordinates and public reference remain intact
      expect(redacted.publicLat).toBe(18.52);
      expect(redacted.publicLng).toBe(73.86);
      expect(redacted.publicRef).toBe('ND-ABC123');

      // Verify media fields
      expect(redacted.media).toHaveLength(1);
      const publicMedia = redacted.media[0];

      // Sensitive storage & metadata fields MUST be absent
      expect(publicMedia.privatePath).toBeUndefined();
      expect(publicMedia.exifLat).toBeUndefined();
      expect(publicMedia.exifLng).toBeUndefined();
      expect(publicMedia.fileHash).toBeUndefined();
      expect(publicMedia.perceptualHash).toBeUndefined();

      // Safe fields MUST be preserved
      expect(publicMedia.publicPath).toBe('https://media.nagardrishti.org/public/issues/2026-11-15/sanitized.jpg');
      expect(publicMedia.id).toBe('media-001');
      expect(publicMedia.type).toBe('before');
      expect(publicMedia.privacyReviewed).toBe(true);
    });

    it('safely handles issues without media attached', () => {
      const mockIssue = {
        id: 'issue-102',
        title: 'Garbage accumulation',
        privateLat: 18.5204,
        privateLng: 73.8567,
        reporterId: 'user-uuid',
      };

      const redacted = privacyService.redactForPublic(mockIssue);
      expect(redacted.privateLat).toBeUndefined();
      expect(redacted.privateLng).toBeUndefined();
      expect(redacted.reporterId).toBeUndefined();
      expect(redacted.title).toBe('Garbage accumulation');
    });

    it('redacts private fields when supporting or updating an issue (regression check for supportIssue)', () => {
      const mockUpdatedIssue = {
        id: 'issue-103',
        publicRef: 'ND-SUPP99',
        title: 'Water leak',
        category: 'water supply',
        supporterCount: 5,
        privateLat: 18.5204303,
        privateLng: 73.8567437,
        publicLat: 18.52,
        publicLng: 73.86,
        reporterId: 'citizen-reporter-uuid',
      };

      const redacted = privacyService.redactForPublic(mockUpdatedIssue);
      expect(redacted.privateLat).toBeUndefined();
      expect(redacted.privateLng).toBeUndefined();
      expect(redacted.reporterId).toBeUndefined();
      expect(redacted.supporterCount).toBe(5);
      expect(redacted.publicLat).toBe(18.52);
      expect(redacted.publicRef).toBe('ND-SUPP99');
    });
  });
});
