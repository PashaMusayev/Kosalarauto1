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

export interface HeaderDimensions {
  width: number;
  height: number;
  storedWidth?: number;
  storedHeight?: number;
  orientation?: number | null;
  isRotated?: boolean;
}

/**
 * Reads the EXIF Orientation tag (0x0112) from JPEG bytes.
 * Walks JPEG segments (APP1, APP2, DQT, DHT, SOF, etc.) by their 16-bit big-endian length.
 * Handles both Big-Endian ('MM', 0x4D4D) and Little-Endian ('II', 0x4949) TIFF headers.
 * Returns orientation (1-8) or null if not present or invalid.
 */
export function getJpegExifOrientation(bytes: Uint8Array): number | null {
  if (!bytes || bytes.length < 14) return null;

  // Must start with JPEG SOI marker: FF D8
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;

  try {
    const len = bytes.length;
    let offset = 2;

    while (offset < len - 4) {
      if (bytes[offset] !== 0xFF) {
        offset++;
        continue;
      }

      const marker = bytes[offset + 1];

      // Standalone markers without length: SOI (D8), EOI (D9), RSTn (D0-D7)
      if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
        offset += 2;
        continue;
      }

      // Stop on SOS (Start of Scan 0xDA) or null marker
      if (marker === 0xDA || marker === 0x00) break;

      if (offset + 4 > len) break;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const segmentLen = view.getUint16(offset + 2, false);
      if (segmentLen < 2) break;

      // APP1 segment: 0xFF, 0xE1 (EXIF metadata)
      if (marker === 0xE1) {
        const app1Start = offset + 4;
        const app1End = Math.min(len, offset + 2 + segmentLen);

        // Verify 'Exif\0\0' prefix (6 bytes)
        if (
          app1Start + 6 <= app1End &&
          bytes[app1Start] === 0x45 &&     // 'E'
          bytes[app1Start + 1] === 0x78 && // 'x'
          bytes[app1Start + 2] === 0x69 && // 'i'
          bytes[app1Start + 3] === 0x66 && // 'f'
          bytes[app1Start + 4] === 0x00 &&
          bytes[app1Start + 5] === 0x00
        ) {
          const tiffStart = app1Start + 6;
          if (tiffStart + 8 <= app1End) {
            // TIFF header byte order: II (0x4949 = Little Endian) or MM (0x4D4D = Big Endian)
            const byteOrder = view.getUint16(tiffStart, false);
            let isLittleEndian: boolean;
            if (byteOrder === 0x4949) {
              isLittleEndian = true;
            } else if (byteOrder === 0x4D4D) {
              isLittleEndian = false;
            } else {
              offset += 2 + segmentLen;
              continue;
            }

            // Verify TIFF magic number: 0x002A (42)
            const tiffMagic = view.getUint16(tiffStart + 2, isLittleEndian);
            if (tiffMagic === 42) {
              const ifd0Offset = view.getUint32(tiffStart + 4, isLittleEndian);
              const ifd0Start = tiffStart + ifd0Offset;

              if (ifd0Start + 2 <= app1End) {
                const numEntries = view.getUint16(ifd0Start, isLittleEndian);
                let entryOffset = ifd0Start + 2;

                for (let i = 0; i < numEntries && entryOffset + 12 <= app1End; i++, entryOffset += 12) {
                  const tag = view.getUint16(entryOffset, isLittleEndian);
                  if (tag === 0x0112) { // Orientation tag
                    const orientation = view.getUint16(entryOffset + 8, isLittleEndian);
                    if (orientation >= 1 && orientation <= 8) {
                      return orientation;
                    }
                  }
                }
              }
            }
          }
        }
      }

      offset += 2 + segmentLen;
    }
  } catch (e) {
    // Non-fatal parse warning
  }

  return null;
}

/**
 * Fast header dimension parser for JPEG, PNG, GIF, and WebP.
 * Fully respects EXIF orientation:
 * If a JPEG has Orientation 5, 6, 7, or 8 (90° or 270° rotation),
 * the output width and height are swapped to reflect the true DISPLAY / ORIENTED dimensions.
 */
export function getImageDimensionsFromHeader(bytes: Uint8Array): HeaderDimensions | null {
  if (!bytes || bytes.length < 16) return null;

  try {
    // PNG: bytes 16..19 width, 20..23 height (Big Endian)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      if (bytes.length >= 24) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const width = view.getUint32(16, false);
        const height = view.getUint32(20, false);
        if (width > 0 && height > 0) {
          return {
            width,
            height,
            storedWidth: width,
            storedHeight: height,
            orientation: 1,
            isRotated: false
          };
        }
      }
    }

    // GIF: bytes 6..7 width, 8..9 height (Little Endian)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      if (bytes.length >= 10) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const width = view.getUint16(6, true);
        const height = view.getUint16(8, true);
        if (width > 0 && height > 0) {
          return {
            width,
            height,
            storedWidth: width,
            storedHeight: height,
            orientation: 1,
            isRotated: false
          };
        }
      }
    }

    // WebP: RIFF....WEBP
    if (
      bytes.length >= 30 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

      // VP8X (Extended WebP)
      if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58 && bytes.length >= 30) {
        const width = 1 + view.getUint8(24) + (view.getUint8(25) << 8) + (view.getUint8(26) << 16);
        const height = 1 + view.getUint8(27) + (view.getUint8(28) << 8) + (view.getUint8(29) << 16);
        if (width > 0 && height > 0) {
          return { width, height, storedWidth: width, storedHeight: height, orientation: 1, isRotated: false };
        }
      }

      // VP8 (Simple lossy WebP)
      if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20 && bytes.length >= 30) {
        if (bytes[23] === 0x9D && bytes[24] === 0x01 && bytes[25] === 0x2A) {
          const width = view.getUint16(26, true) & 0x3FFF;
          const height = view.getUint16(28, true) & 0x3FFF;
          if (width > 0 && height > 0) {
            return { width, height, storedWidth: width, storedHeight: height, orientation: 1, isRotated: false };
          }
        }
      }
    }

    // JPEG: Scan for SOF markers (SOF0: 0xFFC0, SOF1: 0xFFC1, SOF2: 0xFFC2, etc.)
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
        if (marker === 0xDA || marker === 0x00) break; // Start of Scan (SOS)
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
          const storedHeight = view.getUint16(offset + 5, false);
          const storedWidth = view.getUint16(offset + 7, false);
          if (storedWidth > 0 && storedHeight > 0) {
            // Check EXIF orientation
            const orientation = getJpegExifOrientation(bytes);
            // Orientations 5, 6, 7, 8 require swapping width and height for display/target calculations
            const isRotated = orientation === 5 || orientation === 6 || orientation === 7 || orientation === 8;
            return {
              width: isRotated ? storedHeight : storedWidth,
              height: isRotated ? storedWidth : storedHeight,
              storedWidth,
              storedHeight,
              orientation,
              isRotated
            };
          }
        }

        offset += 2 + segmentLen;
      }
    }
  } catch (e) {
    // Non-fatal parse warning
  }

  return null;
}
