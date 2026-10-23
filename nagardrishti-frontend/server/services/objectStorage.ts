import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

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

export async function storeIssueImage(input: { buffer: Buffer; mimeType: string; extension: string }) {
  const key = `issues/${new Date().toISOString().slice(0, 10)}/${nanoid(16)}.${input.extension}`;
  if (s3 && bucket) {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: input.buffer, ContentType: input.mimeType, CacheControl: 'private, max-age=31536000, immutable' }));
    const publicPath = publicBaseUrl ? `${publicBaseUrl}/${key}` : undefined;
    return { privatePath: `s3://${bucket}/${key}`, publicPath: publicPath ?? `s3://${bucket}/${key}` };
  }

  if (process.env.NODE_ENV === 'production' && process.env.OBJECT_STORAGE_REQUIRED === 'true') throw new Error('Object storage is required in production but is not configured');
  const filename = `${nanoid(12)}_${Date.now()}.${input.extension}`;
  const directory = path.resolve(process.cwd(), 'uploads', 'issues');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), input.buffer);
  return { privatePath: `/uploads/issues/${filename}`, publicPath: `/uploads/issues/${filename}` };
}
