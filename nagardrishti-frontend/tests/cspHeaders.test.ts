import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../server/app.js';

describe('createApp CSP headers', () => {
  let server: Server | null = null;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
      server = null;
    }
  });

  it('allows OpenStreetMap tiles, blob previews, and strict script-src self', async () => {
    const app = createApp();
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    expect(port).toBeGreaterThan(0);

    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);

    const csp = res.headers.get('content-security-policy') || '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-inline' 'self'");
    expect(csp).toContain('https://*.tile.openstreetmap.org');
    expect(csp).toContain('blob:');
    expect(csp).toContain("object-src 'none'");
  });
});
