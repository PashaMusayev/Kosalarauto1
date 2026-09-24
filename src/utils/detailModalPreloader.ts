/**
 * Utility to prefetch the lazy TransitDetailModal chunk
 * Supports deduplicated idle and user-interaction preloading.
 */
let detailModalPromise: Promise<{ default: React.ComponentType<any> }> | null = null;

export const prefetchDetailModal = (): Promise<{ default: React.ComponentType<any> }> => {
  if (!detailModalPromise) {
    detailModalPromise = import('../components/TransitDetailModal');
  }
  return detailModalPromise;
};
