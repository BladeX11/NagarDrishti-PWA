import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { issues } from '../db/schema.js';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const PUBLIC_ISSUE_FIELDS = new Set([
  'id', 'publicRef', 'title', 'description', 'category', 'status',
  'departmentId', 'wardId', 'priority', 'supporterCount', 'publicGeohash',
  'publicLat', 'publicLng', 'latitude', 'longitude', 'slaDeadline',
  'slaBreach', 'proofState', 'reopenCount', 'createdAt', 'updatedAt',
  'age', 'updatedAge', 'ageInDays', 'tier', 'inactionDays',
  'verificationVotes', 'events', 'media',
]);

type IssueViewer = { id: string; role: string } | undefined;

function redactTimelineEvent(event: Record<string, unknown>) {
  const publicFields = [
    'id', 'issueId', 'fromStatus', 'toStatus', 'actorRole', 'reason',
    'prevHash', 'eventHash', 'createdAt', 'timestamp',
  ];
  return Object.fromEntries(
    publicFields
      .filter((field) => event[field] !== undefined)
      .map((field) => [field, event[field]])
  );
}

function redactMedia(media: unknown) {
  if (!Array.isArray(media)) return media;
  return media.map((item: Record<string, unknown>) => {
    const safeMedia: Record<string, unknown> = { type: item.type };
    const publicPath = item.publicPath;
    const reviewedDerivative =
      item.privacyReviewed === true &&
      typeof publicPath === 'string' &&
      publicPath !== item.privatePath &&
      (publicPath.startsWith('/uploads/') || /^https:\/\//i.test(publicPath));
    if (reviewedDerivative) safeMedia.publicPath = publicPath;
    return safeMedia;
  });
}

function encodeGeohash(lat: number, lng: number, precision: number = 6): string {
  let isEven = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (isEven) {
      let mid = (lonMin + lonMax) / 2;
      if (lng >= mid) {
        ch |= (1 << (4 - bit));
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      let mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

function decodeGeohash(hash: string) {
  let isEven = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (let i = 0; i < hash.length; i++) {
    const idx = BASE32.indexOf(hash[i]);
    for (let bit = 4; bit >= 0; bit--) {
      const bitVal = (idx >> bit) & 1;
      if (isEven) {
        const mid = (lonMin + lonMax) / 2;
        if (bitVal) {
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (bitVal) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isEven = !isEven;
    }
  }
  return { lat: (latMin + latMax) / 2, lng: (lonMin + lonMax) / 2 };
}

// Simple ward assignment based on lat/lng quadrant (demo purposes, Pune area)
function deriveWard(lat: number, lng: number): string {
  if (lat >= 18.52 && lng >= 73.86) return 'ward-12';
  if (lat >= 18.52 && lng < 73.86) return 'ward-11';
  if (lat < 18.52 && lng >= 73.86) return 'ward-15';
  return 'ward-14';
}

export const privacyService = {
  /**
   * Coarsen a GPS location to a geohash cell center.
   * 6-char geohash ≈ 1.2 km × 0.6 km — privacy-preserving.
   */
  coarsenLocation(lat: number, lng: number) {
    const geohash = encodeGeohash(lat, lng, 6);
    const { lat: publicLat, lng: publicLng } = decodeGeohash(geohash);
    const wardId = deriveWard(lat, lng);
    return { geohash, publicLat, publicLng, wardId };
  },

  /**
   * Whitelist public issue fields and redact nested event/media records.
   */
  redactForPublic(issue: Record<string, unknown>) {
    const publicIssue = Object.fromEntries(
      Object.entries(issue).filter(([field]) => PUBLIC_ISSUE_FIELDS.has(field))
    );
    if (Array.isArray(publicIssue.events)) {
      publicIssue.events = publicIssue.events.map((event) =>
        redactTimelineEvent(event as Record<string, unknown>)
      );
    }
    if (Array.isArray(publicIssue.media)) {
      publicIssue.media = redactMedia(publicIssue.media);
    }
    return publicIssue;
  },

  redactTimelineEvent,

  forViewer(issue: Record<string, unknown>, viewer: IssueViewer) {
    const isStaff = viewer?.role === 'officer' || viewer?.role === 'admin';
    const isReporter = viewer?.role === 'citizen' && viewer.id === issue.reporterId;
    return isStaff || isReporter ? issue : this.redactForPublic(issue);
  },
};
