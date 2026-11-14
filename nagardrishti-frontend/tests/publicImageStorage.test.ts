import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Server } from 'node:http';
import type { Express } from 'express';

let storeIssueImage: typeof import('../server/services/objectStorage.js').storeIssueImage;
let createApp: typeof import('../server/app.js').createApp;
let app: Express;
let server: Server;
let baseUrl: string;
const storedFiles: Array<{ privatePath: string; publicPath: string }> = [];

function gpsExifSegment() {
  const tiff = Buffer.alloc(128);
  tiff.write('II', 0, 'ascii');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x8825, 10);
  tiff.writeUInt16LE(4, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt32LE(26, 18);
  tiff.writeUInt16LE(4, 26);

  const writeEntry = (index: number, tag: number, type: number, count: number, value: number) => {
    const offset = 28 + index * 12;
    tiff.writeUInt16LE(tag, offset);
    tiff.writeUInt16LE(type, offset + 2);
    tiff.writeUInt32LE(count, offset + 4);
    tiff.writeUInt32LE(value, offset + 8);
  };
  writeEntry(0, 1, 2, 2, 0x4e);
  writeEntry(1, 2, 5, 3, 80);
  writeEntry(2, 3, 2, 2, 0x45);
  writeEntry(3, 4, 5, 3, 104);
  tiff.writeUInt32LE(0, 76);
  [18, 31, 0].forEach((value, index) => {
    tiff.writeUInt32LE(value, 80 + index * 8);
    tiff.writeUInt32LE(1, 84 + index * 8);
  });
  [73, 51, 0].forEach((value, index) => {
    tiff.writeUInt32LE(value, 104 + index * 8);
    tiff.writeUInt32LE(1, 108 + index * 8);
  });

  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const segment = Buffer.alloc(4 + payload.length);
  segment.writeUInt16BE(0xffe1, 0);
  segment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(segment, 4);
  return segment;
}

async function makeGpsJpeg() {
  const jpeg = await sharp({
    create: { width: 24, height: 16, channels: 3, background: '#e85d04' },
  }).jpeg().toBuffer();
  return Buffer.concat([jpeg.subarray(0, 2), gpsExifSegment(), jpeg.subarray(2)]);
}

function publicFilePath(publicPath: string) {
  return path.resolve(process.cwd(), 'uploads', 'public', publicPath.replace(/^\/uploads\//, ''));
}

async function fetchPublicDerivative(publicPath: string) {
  const response = await fetch(`${baseUrl}${publicPath}`);
  expect(response.status).toBe(200);
  return Buffer.from(await response.arrayBuffer());
}

describe('public issue image storage', () => {
  beforeAll(async () => {
    vi.stubEnv('OBJECT_STORAGE_BUCKET', '');
    vi.stubEnv('OBJECT_STORAGE_PUBLIC_BASE_URL', '');
    ({ storeIssueImage } = await import('../server/services/objectStorage.js'));
    ({ createApp } = await import('../server/app.js'));
    app = createApp();
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    for (const file of storedFiles.splice(0)) {
      const privateFilename = file.privatePath.replace('private://issues/', '');
      const publicFilename = file.publicPath.replace('/uploads/', '');
      await Promise.all([
        unlink(path.resolve(process.cwd(), 'uploads-private', 'issues', privateFilename)).catch(() => undefined),
        unlink(path.resolve(process.cwd(), 'uploads', 'public', publicFilename)).catch(() => undefined),
      ]);
    }
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    vi.unstubAllEnvs();
  });

  it('serves an anonymous JPEG derivative with GPS EXIF removed and keeps the original private', async () => {
    const original = await makeGpsJpeg();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const stored = await storeIssueImage({ buffer: original, mimeType: 'image/jpeg' });
    storedFiles.push(stored);
    expect(stored.privatePath).toMatch(/^private:\/\//);
    expect(stored.publicPath).toMatch(/^\/uploads\/issues\//);
    const privateFilename = stored.privatePath.replace('private://issues/', '');
    expect((await fetch(`${baseUrl}/uploads/private/issues/${privateFilename}`)).status).toBe(404);

    const response = await fetchPublicDerivative(stored.publicPath);
    const metadata = await sharp(response).metadata();
    expect(metadata.format).toBe('jpeg');
    expect(metadata.exif).toBeUndefined();
    expect(metadata.width).toBeLessThanOrEqual(2048);
    expect(metadata.height).toBeLessThanOrEqual(2048);
    await expect(readFile(publicFilePath(stored.publicPath))).resolves.toEqual(response);
  });

  it.each([
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('re-encodes %s as a publicly fetchable image without EXIF', async (mimeType, format) => {
    const source = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#2a9d8f' },
    }).png().toBuffer();
    const original = mimeType === 'image/png' ? source : await sharp(source).webp().toBuffer();
    const stored = await storeIssueImage({ buffer: original, mimeType });
    storedFiles.push(stored);

    const response = await fetchPublicDerivative(stored.publicPath);
    const metadata = await sharp(response).metadata();
    expect(metadata.format).toBe(format);
    expect(metadata.exif).toBeUndefined();
  });
});
