import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('liveApi authentication & production session support', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('preserves credentials: include and suppresses x-demo-role when import.meta.env.DEV is falsy', async () => {
    // Dynamically import liveApi
    const { liveApi } = await import('../../src/lib/liveApi.js');

    let capturedInit: RequestInit | undefined;
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedInit = init;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 'ND-101', title: 'Road repair' } }),
      } as Response);
    });

    await liveApi.createIssue({
      title: 'Road repair',
      description: 'Pothole on main road',
      category: 'pothole/road',
      latitude: 18.5204,
      longitude: 73.8567,
      language: 'English',
    });

    expect(capturedInit).toBeDefined();
    expect(capturedInit?.credentials).toBe('include');
    
    // In production (import.meta.env.DEV is false), x-demo-role should NOT be attached
    const headers = capturedInit?.headers as Headers;
    if (import.meta.env.DEV) {
      expect(headers.get('x-demo-role')).toBe('citizen');
    } else {
      expect(headers.has('x-demo-role')).toBe(false);
    }
  });

  it('exposes auth methods to support real session management', async () => {
    const { liveApi } = await import('../../src/lib/liveApi.js');

    expect(typeof liveApi.auth.me).toBe('function');
    expect(typeof liveApi.auth.requestOtp).toBe('function');
    expect(typeof liveApi.auth.verifyOtp).toBe('function');
    expect(typeof liveApi.auth.login).toBe('function');
    expect(typeof liveApi.auth.logout).toBe('function');

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 'u123', role: 'citizen', name: 'Citizen Demo' } }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response);
    });

    const user = await liveApi.auth.me();
    expect(user).toEqual({ id: 'u123', role: 'citizen', name: 'Citizen Demo' });
  });

  it('suggestReportCategory sends credentials: include and suppresses x-demo-role in production', async () => {
    const { suggestReportCategory } = await import('../../src/lib/categorySuggestion.js');

    let capturedInit: RequestInit | undefined;
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedInit = init;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { category: 'pothole/road', reason: 'Matched pothole', source: 'local-ml', modelVersion: 'v1' },
        }),
      } as Response);
    });

    const result = await suggestReportCategory({
      description: 'Deep pothole near bus stop',
      category: 'pothole/road',
    });

    expect(result.category).toBe('pothole/road');
    expect(capturedInit?.credentials).toBe('include');
    const headers = capturedInit?.headers as Record<string, string>;
    if (!import.meta.env.DEV) {
      expect(headers['x-demo-role']).toBeUndefined();
    }
  });
});
