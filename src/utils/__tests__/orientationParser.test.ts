/**
 * Unit tests for JPEG EXIF Orientation parser and dimension reader
 * 
 * Verifies:
 * 1. Big-Endian ('MM') with orientations 1, 3, 6, 8
 * 2. Little-Endian ('II') with orientations 1, 3, 6, 8
 * 3. JPEG without EXIF segment
 * 4. APP1 segment larger than 4KB (>4096 bytes, e.g. Samsung embedded thumbnails)
 * 5. Display dimension rotation (width/height swapped for orientations 5, 6, 7, 8)
 */

import { getJpegExifOrientation, getImageDimensionsFromHeader } from '../imageFormatDetector';

interface CreateJpegOptions {
  byteOrder?: 'MM' | 'II';
  orientation?: number;
  hasExif?: boolean;
  app1Padding?: number; // Extra padding inside APP1 to test >4KB segments
  storedWidth?: number;
  storedHeight?: number;
}

/**
 * Helper to construct synthetic binary JPEG buffers with exact EXIF APP1 structures
 */
function createSyntheticJpeg(options: CreateJpegOptions = {}): Uint8Array {
  const {
    byteOrder = 'MM',
    orientation = 1,
    hasExif = true,
    app1Padding = 0,
    storedWidth = 4000,
    storedHeight = 3000
  } = options;

  const parts: number[] = [];

  // 1. SOI: 0xFF, 0xD8
  parts.push(0xFF, 0xD8);

  // 2. APP1 Exif segment
  if (hasExif) {
    const isLittle = byteOrder === 'II';
    // Base APP1 payload size:
    // 6 ('Exif\0\0') + 8 (TIFF Header) + 2 (numEntries) + 12 (entry 0x0112) + 4 (nextIFD) + app1Padding
    const exifDataLen = 6 + 8 + 2 + 12 + 4 + app1Padding;
    const segmentLen = 2 + exifDataLen; // Includes length word itself

    parts.push(0xFF, 0xE1);
    parts.push((segmentLen >> 8) & 0xFF, segmentLen & 0xFF);

    // 'Exif\0\0'
    parts.push(0x45, 0x78, 0x69, 0x66, 0x00, 0x00);

    // TIFF Header: Byte Order
    if (isLittle) {
      parts.push(0x49, 0x49); // 'II'
      parts.push(0x2A, 0x00); // Magic 42
      parts.push(0x08, 0x00, 0x00, 0x00); // Offset to IFD0 (8 bytes)
    } else {
      parts.push(0x4D, 0x4D); // 'MM'
      parts.push(0x00, 0x2A); // Magic 42
      parts.push(0x00, 0x00, 0x00, 0x08); // Offset to IFD0 (8 bytes)
    }

    // IFD0: 1 entry
    if (isLittle) {
      parts.push(0x01, 0x00); // 1 entry
      // Tag 0x0112 (Orientation)
      parts.push(0x12, 0x01);
      // Type 3 (SHORT)
      parts.push(0x03, 0x00);
      // Count 1
      parts.push(0x01, 0x00, 0x00, 0x00);
      // Value (SHORT in first 2 bytes)
      parts.push(orientation & 0xFF, (orientation >> 8) & 0xFF, 0x00, 0x00);
      // Next IFD offset
      parts.push(0x00, 0x00, 0x00, 0x00);
    } else {
      parts.push(0x00, 0x01); // 1 entry
      // Tag 0x0112 (Orientation)
      parts.push(0x01, 0x12);
      // Type 3 (SHORT)
      parts.push(0x00, 0x03);
      // Count 1
      parts.push(0x00, 0x00, 0x00, 0x01);
      // Value (SHORT in first 2 bytes)
      parts.push((orientation >> 8) & 0xFF, orientation & 0xFF, 0x00, 0x00);
      // Next IFD offset
      parts.push(0x00, 0x00, 0x00, 0x00);
    }

    // Optional padding bytes (e.g. for >4KB APP1 test)
    for (let p = 0; p < app1Padding; p++) {
      parts.push(0x00);
    }
  }

  // 3. SOF0 (Start of Frame 0): 0xFF, 0xC0
  const sofLen = 2 + 1 + 2 + 2 + 1 + 3 * 3; // 17 bytes
  parts.push(0xFF, 0xC0);
  parts.push((sofLen >> 8) & 0xFF, sofLen & 0xFF);
  parts.push(0x08); // 8-bit precision
  parts.push((storedHeight >> 8) & 0xFF, storedHeight & 0xFF);
  parts.push((storedWidth >> 8) & 0xFF, storedWidth & 0xFF);
  parts.push(0x03); // 3 components (YCbCr)
  parts.push(0x01, 0x22, 0x00);
  parts.push(0x02, 0x11, 0x01);
  parts.push(0x03, 0x11, 0x01);

  // 4. EOI: 0xFF, 0xD9
  parts.push(0xFF, 0xD9);

  return new Uint8Array(parts);
}

function runTests() {
  console.log('--- Starting EXIF Orientation & Dimension Parser Tests ---\n');
  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${name} ${details ? `(${details})` : ''}`);
    }
  }

  // Test 1: Big-Endian ('MM') with Orientations 1, 3, 6, 8
  for (const ori of [1, 3, 6, 8]) {
    const bytes = createSyntheticJpeg({ byteOrder: 'MM', orientation: ori });
    const detected = getJpegExifOrientation(bytes);
    assert(
      `Big-Endian ('MM') Orientation ${ori}`,
      detected === ori,
      `Expected ${ori}, got ${detected}`
    );
  }

  // Test 2: Little-Endian ('II') with Orientations 1, 3, 6, 8
  for (const ori of [1, 3, 6, 8]) {
    const bytes = createSyntheticJpeg({ byteOrder: 'II', orientation: ori });
    const detected = getJpegExifOrientation(bytes);
    assert(
      `Little-Endian ('II') Orientation ${ori}`,
      detected === ori,
      `Expected ${ori}, got ${detected}`
    );
  }

  // Test 3: JPEG without EXIF
  {
    const bytes = createSyntheticJpeg({ hasExif: false, storedWidth: 1920, storedHeight: 1080 });
    const detected = getJpegExifOrientation(bytes);
    assert('JPEG without EXIF returns null', detected === null, `Got ${detected}`);

    const dims = getImageDimensionsFromHeader(bytes);
    assert(
      'Dimensions for JPEG without EXIF (1920x1080)',
      dims?.width === 1920 && dims?.height === 1080 && dims?.isRotated === false && dims?.orientation === null,
      JSON.stringify(dims)
    );
  }

  // Test 4: APP1 segment larger than 4KB (e.g. 5,000 bytes padding -> total APP1 > 5KB)
  {
    const largeBytes = createSyntheticJpeg({
      byteOrder: 'MM',
      orientation: 6,
      app1Padding: 5000,
      storedWidth: 4000,
      storedHeight: 3000
    });
    assert('Generated JPEG size is > 5KB', largeBytes.length > 5000, `Length: ${largeBytes.length}`);

    const detected = getJpegExifOrientation(largeBytes);
    assert('Orientation parsed correctly from >4KB APP1 segment', detected === 6, `Expected 6, got ${detected}`);

    const dims = getImageDimensionsFromHeader(largeBytes);
    assert(
      'Oriented dimensions swapped for >4KB APP1 with Orientation 6 (3000x4000)',
      dims?.width === 3000 &&
      dims?.height === 4000 &&
      dims?.storedWidth === 4000 &&
      dims?.storedHeight === 3000 &&
      dims?.isRotated === true &&
      dims?.orientation === 6,
      JSON.stringify(dims)
    );
  }

  // Test 5: Orientations 6 and 8 swap width and height
  {
    // Orientation 6: 4000x3000 stored -> 3000x4000 display
    const bytes6 = createSyntheticJpeg({ byteOrder: 'II', orientation: 6, storedWidth: 4000, storedHeight: 3000 });
    const dims6 = getImageDimensionsFromHeader(bytes6);
    assert(
      'Orientation 6 swaps 4000x3000 -> 3000x4000',
      dims6?.width === 3000 && dims6?.height === 4000 && dims6?.isRotated === true,
      JSON.stringify(dims6)
    );

    // Orientation 8: 4000x3000 stored -> 3000x4000 display
    const bytes8 = createSyntheticJpeg({ byteOrder: 'MM', orientation: 8, storedWidth: 4000, storedHeight: 3000 });
    const dims8 = getImageDimensionsFromHeader(bytes8);
    assert(
      'Orientation 8 swaps 4000x3000 -> 3000x4000',
      dims8?.width === 3000 && dims8?.height === 4000 && dims8?.isRotated === true,
      JSON.stringify(dims8)
    );
  }

  // Test 6: Orientations 1 and 3 do not swap width and height
  {
    // Orientation 1: 4000x3000 stored -> 4000x3000 display
    const bytes1 = createSyntheticJpeg({ byteOrder: 'II', orientation: 1, storedWidth: 4000, storedHeight: 3000 });
    const dims1 = getImageDimensionsFromHeader(bytes1);
    assert(
      'Orientation 1 preserves 4000x3000',
      dims1?.width === 4000 && dims1?.height === 3000 && dims1?.isRotated === false,
      JSON.stringify(dims1)
    );

    // Orientation 3: 4000x3000 stored -> 4000x3000 display
    const bytes3 = createSyntheticJpeg({ byteOrder: 'MM', orientation: 3, storedWidth: 4000, storedHeight: 3000 });
    const dims3 = getImageDimensionsFromHeader(bytes3);
    assert(
      'Orientation 3 preserves 4000x3000',
      dims3?.width === 4000 && dims3?.height === 3000 && dims3?.isRotated === false,
      JSON.stringify(dims3)
    );
  }

  console.log(`\nResults: ${passed} / ${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
