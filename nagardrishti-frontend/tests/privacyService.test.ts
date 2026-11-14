import { describe, expect, it } from 'vitest';
import { privacyService } from '../server/services/privacyService.js';

const issue = {
  id: 'issue-1',
  publicRef: 'ND-QA-1',
  title: 'Blocked drain',
  description: 'Water collects after rain.',
  category: 'drainage/sewage',
  status: 'Open',
  departmentId: 'drainage',
  wardId: 'ward-11',
  priority: 2,
  supporterCount: 3,
  publicGeohash: 'tderm0',
  publicLat: 18.52,
  publicLng: 73.85,
  privateLat: 18.520123,
  privateLng: 73.850456,
  reporterId: 'citizen-owner',
  assignedTo: 'officer-id',
  createdAt: new Date('2026-11-14T00:00:00Z'),
  updatedAt: new Date('2026-11-14T01:00:00Z'),
  media: [{
    id: 'media-1',
    type: 'before',
    privatePath: '/uploads/issues/original.jpg',
    publicPath: '/uploads/issues/original.jpg',
    exifLat: 18.520123,
    exifLng: 73.850456,
    privacyReviewed: false,
  }],
  events: [{
    id: 'event-1',
    issueId: 'issue-1',
    toStatus: 'Open',
    actorId: 'citizen-owner',
    actorRole: 'citizen',
    reason: 'Initial report',
    eventHash: 'event-hash',
    prevHash: 'GENESIS',
    createdAt: new Date('2026-11-14T00:00:00Z'),
  }],
};

const PRIVATE_KEYS = ['privateLat', 'privateLng', 'reporterId', 'assignedTo', 'privatePath', 'exifLat', 'exifLng', 'actorId'];

function expectNoPrivateKeys(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach(expectNoPrivateKeys);
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of PRIVATE_KEYS) expect(record).not.toHaveProperty(key);
    Object.values(record).forEach(expectNoPrivateKeys);
  }
}

describe('privacyService public issue responses', () => {
  it.each([
    ['anonymous', undefined],
    ['another citizen', { id: 'citizen-other', role: 'citizen' }],
  ])('removes private issue, media, and actor fields for %s', (_name, viewer) => {
    const response = privacyService.forViewer(issue, viewer);

    expectNoPrivateKeys(response);
    expect(response).toMatchObject({
      id: issue.id,
      publicRef: issue.publicRef,
      publicLat: issue.publicLat,
      publicLng: issue.publicLng,
    });
    expect(response.media).toEqual([{ type: 'before' }]);
    expect(response.events?.[0]).toMatchObject({ actorRole: 'citizen', toStatus: 'Open' });
  });

  it.each([
    ['owner', { id: 'citizen-owner', role: 'citizen' }],
    ['officer', { id: 'officer-id', role: 'officer' }],
    ['admin', { id: 'admin-id', role: 'admin' }],
  ])('preserves fields the %s view currently needs', (_name, viewer) => {
    const response = privacyService.forViewer(issue, viewer);

    expect(response).not.toBe(issue);
    expect(response).toHaveProperty('privateLat', issue.privateLat);
    expect(response).toHaveProperty('reporterId', issue.reporterId);
    expect(response.media?.[0]).not.toHaveProperty('privatePath');
    expect(response.media?.[0]).toHaveProperty('publicPath', issue.media[0].publicPath);
  });

  it('allows only a reviewed derivative URL in public media', () => {
    const safeIssue = {
      ...issue,
      media: [{
        ...issue.media[0],
        privacyReviewed: true,
        publicPath: 'https://cdn.example.test/redacted.jpg',
      }],
    };

    expect(privacyService.redactForPublic(safeIssue).media).toEqual([
      { type: 'before', publicPath: 'https://cdn.example.test/redacted.jpg' },
    ]);
  });

  it('redacts actorId from the public timeline response', () => {
    const response = privacyService.redactTimelineEvent(issue.events[0]);

    expect(response).toHaveProperty('actorRole', 'citizen');
    expect(response).not.toHaveProperty('actorId');
  });
});
