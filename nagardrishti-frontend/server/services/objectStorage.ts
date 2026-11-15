import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { extractExifGps } from './exifParser.js';

export { extractExifGps };

/**
 * Dual-bucket configuration:
 * - Private bucket: stores unmodified citizen original uploads (for forensics, audit ledger, and adversarial fraud checks).
 * - Public bucket: stores sanitized derivatives (EXIF/GPS/device metadata stripped).
 */
const privateBucket = process.env.OBJECT_STORAGE_PRIVATE_BUCKET || process.env.OBJECT_STORAGE_BUCKET;
const publicBucket = process.env.OBJECT_STORAGE_PUBLIC_BUCKET || process.env.OBJECT_STORAGE_BUCKET;
const publicBaseUrl = process.env.OBJECT_STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, '');
const isStorageRequired = process.env.OBJECT_STORAGE_REQUIRED === 'true';

const s3 = (privateBucket || publicBucket) ? new S3Client({
  region: process.env.OBJECT_STORAGE_REGION || 'auto',
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined,
  forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === 'true',
  credentials: process.env.OBJECT_STORAGE_ACCESS_KEY && process.env.OBJECT_STORAGE_SECRET_KEY
    ? { accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY, secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY }
    : undefined,
}) : null;

/**
 * Stores a citizen-uploaded issue photo into persistent storage:
 * 1. Validates and rejects unsafe/non-raster image formats (SVG, HTML, XML).
 * 2. Extracts original EXIF GPS metadata for private fraud/audit verification.
 * 3. Sanitizes and re-encodes the image via Sharp (auto-orient, EXIF/GPS/device metadata stripped).
 * 4. Uploads raw original to private storage and sanitized derivative to public storage.
 * 5. Returns separate private and public storage paths.
 */
export async function storeIssueImage(input: {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}) {
  // 1. Validate format - reject vector, executable, and markup payloads
  const normalizedMime = input.mimeType.toLowerCase();
  const disallowedMimes = ['image/svg+xml', 'text/html', 'text/xml', 'application/xml', 'application/xhtml+xml'];
  if (disallowedMimes.includes(normalizedMime)) {
    throw new Error('Unsupported image format: Vector and HTML images are not permitted for security reasons');
  }

  // 2. Extract EXIF GPS coordinates from the original buffer before stripping
  const gps = extractExifGps(input.buffer);

  // 3. Auto-orient and sanitize image with Sharp (strips all EXIF, GPS, and device metadata)
  let sanitizedBuffer: Buffer;
  const sanitizedMimeType = 'image/jpeg';
  const sanitizedExtension = 'jpg';

  try {
    sanitizedBuffer = await sharp(input.buffer)
      .rotate()
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch (err: any) {
    throw new Error(`Invalid or corrupt image format: ${err?.message || 'Processing failed'}`);
  }

  const datePrefix = new Date().toISOString().slice(0, 10);
  const id = nanoid(16);
  const privateKey = `originals/${datePrefix}/${id}.${input.extension}`;
  const publicKey = `public/issues/${datePrefix}/${id}.${sanitizedExtension}`;

  // 4. Cloud Object Storage (S3 / Cloudflare R2 Dual-Bucket)
  if (s3 && privateBucket && publicBucket) {
    // Write unmodified original to private bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: privateBucket,
        Key: privateKey,
        Body: input.buffer,
        ContentType: input.mimeType,
        CacheControl: 'private, no-cache',
      })
    );

    // Write sanitized derivative to public bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: publicBucket,
        Key: publicKey,
        Body: sanitizedBuffer,
        ContentType: sanitizedMimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const publicPath = publicBaseUrl ? `${publicBaseUrl}/${publicKey}` : undefined;
    return {
      privatePath: `s3://${privateBucket}/${privateKey}`,
      publicPath: publicPath ?? `s3://${publicBucket}/${publicKey}`,
      exifLat: gps.lat,
      exifLng: gps.lng,
      originalSize: input.buffer.length,
      sanitizedSize: sanitizedBuffer.length,
    };
  }

  // 5. Strict enforcement: refuse insecure local disk fallback in production or when required
  if (isStorageRequired || process.env.NODE_ENV === 'production') {
    throw new Error('Object storage is required in production but is not fully configured (missing bucket, credentials, or public base URL)');
  }

  // 6. Local Development Storage Fallback
  // Keep original and public images in strictly separated directories
  const filename = `${nanoid(12)}_${Date.now()}`;
  const privateDir = path.resolve(process.cwd(), 'uploads', 'private', 'originals');
  const publicDir = path.resolve(process.cwd(), 'uploads', 'public', 'issues');

  await mkdir(privateDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  const privateFilename = `${filename}.${input.extension}`;
  const publicFilename = `${filename}.${sanitizedExtension}`;

  await writeFile(path.join(privateDir, privateFilename), input.buffer);
  await writeFile(path.join(publicDir, publicFilename), sanitizedBuffer);

  return {
    privatePath: `/uploads/private/originals/${privateFilename}`,
    publicPath: `/uploads/public/issues/${publicFilename}`,
    exifLat: gps.lat,
    exifLng: gps.lng,
    originalSize: input.buffer.length,
    sanitizedSize: sanitizedBuffer.length,
  };
}
