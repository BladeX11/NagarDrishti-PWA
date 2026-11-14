import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { issues } from '../db/schema.js';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

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

// Ward centroids aligned with MapView and official municipal wards
const WARD_CENTROIDS: Record<string, [number, number]> = {
  'ward-11': [18.5029, 73.8153], // Kothrud (West)
  'ward-12': [18.5147, 73.8402], // Deccan Gymkhana (Central/West)
  'ward-14': [18.5029, 73.8553], // Swargate (South/Central)
  'ward-15': [18.5529, 73.9053], // Kalyani Nagar (East/North-East)
};

function deriveWard(lat: number, lng: number): string {
  let closestWard = 'ward-12';
  let minDistanceSq = Infinity;
  for (const [wardId, [wLat, wLng]] of Object.entries(WARD_CENTROIDS)) {
    const dLat = (lat - wLat) * 111;
    const dLng = (lng - wLng) * 111 * Math.cos((lat * Math.PI) / 180);
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestWard = wardId;
    }
  }
  return closestWard;
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
   * Strip private fields from an issue for public API responses.
   * Strips exact GPS (privateLat, privateLng), reporterId, and photo EXIF/private paths.
   */
  redactForPublic(issue: Record<string, unknown>) {
    const { privateLat, privateLng, reporterId, ...publicFields } = issue;
    if (Array.isArray(publicFields.media)) {
      publicFields.media = (publicFields.media as any[]).map((m: any) => {
        const { exifLat, exifLng, privatePath, ...safeMedia } = m;
        return safeMedia;
      });
    }
    return publicFields;
  },
};
