/**
 * Zero-dependency EXIF GPS parser for citizen-uploaded JPEG photos.
 * Reads TIFF IFD0 and GPS IFD tags directly from raw buffers to extract
 * exact latitude and longitude for private fraud detection / adversarial checks
 * before Sharp strips all metadata for the public derivative.
 */

export function extractExifGps(buffer: Buffer): { lat: number | null; lng: number | null } {
  try {
    if (!buffer || buffer.length < 14) return { lat: null, lng: null };
    // Verify JPEG SOI marker
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return { lat: null, lng: null };

    let offset = 2;
    while (offset < buffer.length - 4) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);

      // APP1 marker (0xFFE1) containing Exif
      if (marker === 0xe1) {
        const exifHeader = buffer.toString('ascii', offset + 4, offset + 10);
        if (exifHeader === 'Exif\0\0') {
          const tiffStart = offset + 10;
          return parseTiffGps(buffer, tiffStart);
        }
      }
      offset += 2 + length;
    }
    return { lat: null, lng: null };
  } catch {
    return { lat: null, lng: null };
  }
}

function parseTiffGps(buffer: Buffer, tiffStart: number): { lat: number | null; lng: number | null } {
  try {
    if (tiffStart + 8 > buffer.length) return { lat: null, lng: null };
    const endianStr = buffer.toString('ascii', tiffStart, tiffStart + 2);
    const isLittle = endianStr === 'II';
    if (!isLittle && endianStr !== 'MM') return { lat: null, lng: null };

    const readU16 = (o: number) => (isLittle ? buffer.readUInt16LE(o) : buffer.readUInt16BE(o));
    const readU32 = (o: number) => (isLittle ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o));

    // Magic number 42
    if (readU16(tiffStart + 2) !== 42) return { lat: null, lng: null };

    const firstIfdOffset = readU32(tiffStart + 4);
    const ifdOffset = tiffStart + firstIfdOffset;
    if (ifdOffset + 2 > buffer.length) return { lat: null, lng: null };

    const ifdCount = readU16(ifdOffset);
    let gpsIfdOffset: number | null = null;

    for (let i = 0; i < ifdCount; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > buffer.length) break;
      const tag = readU16(entryOffset);
      // Tag 0x8825 is GPS IFD Pointer
      if (tag === 0x8825) {
        gpsIfdOffset = tiffStart + readU32(entryOffset + 8);
        break;
      }
    }

    if (!gpsIfdOffset || gpsIfdOffset + 2 > buffer.length) return { lat: null, lng: null };

    const gpsCount = readU16(gpsIfdOffset);
    let latRef: string | null = null;
    let latRationals: number[] | null = null;
    let lngRef: string | null = null;
    let lngRationals: number[] | null = null;

    for (let i = 0; i < gpsCount; i++) {
      const entryOffset = gpsIfdOffset + 2 + i * 12;
      if (entryOffset + 12 > buffer.length) break;
      const tag = readU16(entryOffset);

      if (tag === 0x0001) {
        latRef = String.fromCharCode(buffer[entryOffset + 8]);
      } else if (tag === 0x0002) {
        const valOffset = tiffStart + readU32(entryOffset + 8);
        latRationals = readRationals(buffer, valOffset, 3, isLittle);
      } else if (tag === 0x0003) {
        lngRef = String.fromCharCode(buffer[entryOffset + 8]);
      } else if (tag === 0x0004) {
        const valOffset = tiffStart + readU32(entryOffset + 8);
        lngRationals = readRationals(buffer, valOffset, 3, isLittle);
      }
    }

    let lat: number | null = null;
    let lng: number | null = null;

    if (latRationals && latRationals.length === 3) {
      lat = latRationals[0] + latRationals[1] / 60 + latRationals[2] / 3600;
      if (latRef === 'S') lat = -lat;
    }

    if (lngRationals && lngRationals.length === 3) {
      lng = lngRationals[0] + lngRationals[1] / 60 + lngRationals[2] / 3600;
      if (lngRef === 'W') lng = -lng;
    }

    return {
      lat: lat !== null && Number.isFinite(lat) ? Math.round(lat * 1e7) / 1e7 : null,
      lng: lng !== null && Number.isFinite(lng) ? Math.round(lng * 1e7) / 1e7 : null,
    };
  } catch {
    return { lat: null, lng: null };
  }
}

function readRationals(buffer: Buffer, offset: number, count: number, isLittle: boolean): number[] {
  const readU32 = (o: number) => (isLittle ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o));
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const o = offset + i * 8;
    if (o + 8 > buffer.length) break;
    const num = readU32(o);
    const den = readU32(o + 4);
    result.push(den !== 0 ? num / den : 0);
  }
  return result;
}
