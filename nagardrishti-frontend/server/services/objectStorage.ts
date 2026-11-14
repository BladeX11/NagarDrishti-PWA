import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const bucket = process.env.OBJECT_STORAGE_BUCKET;
const publicBaseUrl = process.env.OBJECT_STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, '');
const s3 = bucket ? new S3Client({
  region: process.env.OBJECT_STORAGE_REGION || 'auto',
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined,
  forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === 'true',
  credentials: process.env.OBJECT_STORAGE_ACCESS_KEY && process.env.OBJECT_STORAGE_SECRET_KEY
    ? { accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY, secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY }
    : undefined,
}) : null;

const IMAGE_FORMATS = {
  'image/jpeg': { extension: 'jpg', format: 'jpeg' as const },
  'image/png': { extension: 'png', format: 'png' as const },
  'image/webp': { extension: 'webp', format: 'webp' as const },
};

export async function storeIssueImage(input: { buffer: Buffer; mimeType: string }) {
  const imageFormat = IMAGE_FORMATS[input.mimeType as keyof typeof IMAGE_FORMATS];
  if (!imageFormat) throw new Error('Only JPEG, PNG, and WEBP images are supported');

  // rotate() applies EXIF orientation; encoding to a fresh output strips all source metadata.
  const pipeline = sharp(input.buffer, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true });
  const publicBuffer = await (imageFormat.format === 'jpeg'
    ? pipeline.jpeg({ quality: 85 })
    : imageFormat.format === 'png'
      ? pipeline.png({ compressionLevel: 9 })
      : pipeline.webp({ quality: 82 })).toBuffer();

  const token = nanoid(16);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const privateKey = `private/issues/${datePrefix}/${token}.${imageFormat.extension}`;
  const publicKey = `issues/${datePrefix}/${token}.${imageFormat.extension}`;

  if (s3 && bucket) {
    // S3 objects are private by default; only the re-encoded derivative gets a public URL.
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: privateKey,
      Body: input.buffer,
      ContentType: input.mimeType,
      CacheControl: 'private, max-age=31536000, immutable',
    }));
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: publicKey,
      Body: publicBuffer,
      ContentType: input.mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    const publicPath = publicBaseUrl ? `${publicBaseUrl}/${publicKey}` : `s3://${bucket}/${publicKey}`;
    return { privatePath: `s3://${bucket}/${privateKey}`, publicPath, mimeType: input.mimeType, extension: imageFormat.extension };
  }

  if (process.env.NODE_ENV === 'production' && process.env.OBJECT_STORAGE_REQUIRED === 'true') throw new Error('Object storage is required in production but is not configured');
  const privateFilename = `${token}.${imageFormat.extension}`;
  const privateDirectory = path.resolve(process.cwd(), 'uploads-private', 'issues');
  const publicFilename = `${nanoid(12)}_${Date.now()}.${imageFormat.extension}`;
  const publicDirectory = path.resolve(process.cwd(), 'uploads', 'public', 'issues');
  await Promise.all([
    mkdir(privateDirectory, { recursive: true }),
    mkdir(publicDirectory, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(privateDirectory, privateFilename), input.buffer),
    writeFile(path.join(publicDirectory, publicFilename), publicBuffer),
  ]);
  return {
    privatePath: `private://issues/${privateFilename}`,
    publicPath: `/uploads/issues/${publicFilename}`,
    mimeType: input.mimeType,
    extension: imageFormat.extension,
  };
}
