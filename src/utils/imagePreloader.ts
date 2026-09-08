import { getValidImageUrl } from './imageFallback';

/**
 * Global memory cache of prefetched image URLs.
 * Keeps track of URLs already preloaded in the current browser session
 * to prevent duplicate network instantiation.
 */
const prefetchedCache = new Set<string>();

/**
 * Invisible background image prefetching via `new Image()`.
 * Preloads the image into the browser's HTTP cache so that when rendered into an <img> tag,
 * it appears INSTANTLY without any network roundtrip delay or blank black frame.
 */
export function prefetchImage(url: string | undefined | null): void {
  if (!url || typeof url !== 'string') return;
  const valid = getValidImageUrl(url.trim());
  if (!valid || prefetchedCache.has(valid)) return;

  prefetchedCache.add(valid);

  try {
    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = valid;
  } catch {
    // Fail silently in environments where Image() is restricted
  }
}

/**
 * Prefetch an array of image URLs in background
 */
export function prefetchImages(urls: (string | undefined | null)[]): void {
  if (!Array.isArray(urls)) return;
  for (const u of urls) {
    if (u) prefetchImage(u);
  }
}

/**
 * Preload the carousel window:
 * - Current image
 * - Next 1 image
 * - Next 2 images
 * - Previous 1 image
 */
export function prefetchCarouselWindow(images: string[], currentIndex: number): void {
  if (!images || images.length === 0) return;
  const total = images.length;
  if (total === 1) {
    prefetchImage(images[0]);
    return;
  }

  const current = ((currentIndex % total) + total) % total;
  const next1 = (current + 1) % total;
  const next2 = (current + 2) % total;
  const prev1 = (current - 1 + total) % total;

  // Prefetch in priority order: current -> next 1 -> next 2 -> prev 1
  prefetchImage(images[current]);
  prefetchImage(images[next1]);
  if (total > 2) {
    prefetchImage(images[next2]);
  }
  prefetchImage(images[prev1]);
}
