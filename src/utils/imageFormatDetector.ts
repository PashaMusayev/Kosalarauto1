/**
 * Magic-Byte Image Format Detector & Header Dimension Parser
 * 
 * Inspects raw bytes to determine genuine image format, ignoring misleading file extensions or MIME types.
 * Supports: JPEG, PNG, WebP, GIF, HEIC/HEIF (ISO-BMFF ftyp brands), and AVIF.
 */

export type DetectedImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | 'avif' | 'unknown';

export interface ImageFormatInfo {
  format: DetectedImageFormat;
  mimeType: string;
  extension: string;
  isHeic: boolean;
  isDirectlyUploadable: boolean; // Genuine JPEG, PNG, WebP, GIF accepted by server
}

/**
 * Detect image format from raw buffer using standard magic bytes
 */
export function detectImageFormatFromBuffer(buffer: ArrayBuffer | Uint8Array): ImageFormatInfo {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!bytes || bytes.length < 4) {
    return {
      format: 'unknown',
      mimeType: 'application/octet-stream',
      extension: 'bin',
      isHeic: false,
      isDirectlyUploadable: false
    };
  }

  // 1. JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return {
      format: 'jpeg',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      isHeic: false,
      isDirectlyUploadable: true
    };
  }

  // 2. PNG: 89 50 4E 47 (\x89PNG)
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return {
      format: 'png',
      mimeType: 'image/png',
      extension: 'png',
      isHeic: false,
      isDirectlyUploadable: true
    };
  }

  // 3. GIF: 47 49 46 38 ('GIF8')
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return {
      format: 'gif',
      mimeType: 'image/gif',
      extension: 'gif',
      isHeic: false,
      isDirectlyUploadable: true
    };
  }

  // 4. WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return {
      format: 'webp',
      mimeType: 'image/webp',
      extension: 'webp',
      isHeic: false,
      isDirectlyUploadable: true
    };
  }

  // 5. ISO-BMFF container (HEIC / HEIF / AVIF): bytes 4-7 === 'ftyp'
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    const scanLen = Math.min(bytes.length, 64);
    let ftypString = '';
    for (let i = 8; i < scanLen; i++) {
      ftypString += String.fromCharCode(bytes[i]);
    }

    const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'];
    for (const brand of heicBrands) {
      if (ftypString.includes(brand)) {
        return {
          format: 'heic',
          mimeType: 'image/heic',
          extension: 'heic',
          isHeic: true,
          isDirectlyUploadable: false
        };
      }
    }

    if (ftypString.includes('avif') || ftypString.includes('avis')) {
      return {
        format: 'avif',
        mimeType: 'image/avif',
        extension: 'avif',
        isHeic: false,
        isDirectlyUploadable: false
      };
    }
  }

  return {
    format: 'unknown',
    mimeType: 'application/octet-stream',
    extension: 'bin',
    isHeic: false,
    isDirectlyUploadable: false
  };
}

/**
 * Fast header dimension parser for JPEG, PNG, GIF, and WebP.
 * Allows pre-calculating resize dimensions before calling createImageBitmap.
 */
export function getImageDimensionsFromHeader(bytes: Uint8Array): { width: number; height: number } | null {
  if (!bytes || bytes.length < 16) return null;

  try {
    // PNG: bytes 16..19 width, 20..23 height (Big Endian)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      if (bytes.length >= 24) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const width = view.getUint32(16, false);
        const height = view.getUint32(20, false);
        if (width > 0 && height > 0) return { width, height };
      }
    }

    // GIF: bytes 6..7 width, 8..9 height (Little Endian)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      if (bytes.length >= 10) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const width = view.getUint16(6, true);
        const height = view.getUint16(8, true);
        if (width > 0 && height > 0) return { width, height };
      }
    }

    // JPEG: Scan for SOF markers (SOF0: 0xFFC0, SOF1: 0xFFC1, SOF2: 0xFFC2)
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      let offset = 2;
      const len = bytes.length;
      while (offset < len - 8) {
        if (bytes[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = bytes[offset + 1];
        if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
          offset += 2;
          continue;
        }
        if (offset + 4 > len) break;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const segmentLen = view.getUint16(offset + 2, false);
        if (segmentLen < 2) break;

        const isSof =
          (marker >= 0xC0 && marker <= 0xC3) ||
          (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) ||
          (marker >= 0xCD && marker <= 0xCF);

        if (isSof && offset + 9 <= len) {
          const height = view.getUint16(offset + 5, false);
          const width = view.getUint16(offset + 7, false);
          if (width > 0 && height > 0) return { width, height };
        }

        offset += 2 + segmentLen;
      }
    }
  } catch (e) {
    // Non-fatal parse warning
  }

  return null;
}
