import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for infinite scrolling using Intersection Observer
 *
 * @param callback - Function to call when user scrolls to bottom
 * @param hasMore - Whether there are more items to load
 * @param loading - Whether data is currently loading
 * @param threshold - Percentage of element visibility to trigger (0-1, default: 1.0)
 * @returns ref - Ref to attach to the sentinel element
 *
 * @example
 * const loadMoreRef = useInfiniteScroll(loadMoreProducts, hasMore, loading);
 *
 * return (
 *   <div>
 *     {products.map(p => <Product key={p.id} {...p} />)}
 *     <div ref={loadMoreRef}>Loading...</div>
 *   </div>
 * );
 */
export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean,
  loading: boolean,
  threshold: number = 1.0
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];

      // Only load more if:
      // 1. Element is intersecting (visible)
      // 2. There are more items to load
      // 3. Not currently loading
      if (target.isIntersecting && hasMore && !loading) {
        callback();
      }
    },
    [callback, hasMore, loading]
  );

  useEffect(() => {
    // Create Intersection Observer
    const options = {
      root: null, // Use viewport as root
      rootMargin: '100px', // Start loading 100px before reaching the sentinel
      threshold, // Element must be 100% visible (or custom threshold)
    };

    observerRef.current = new IntersectionObserver(handleObserver, options);

    // Observe the sentinel element
    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observerRef.current.observe(currentSentinel);
    }

    // Cleanup
    return () => {
      if (observerRef.current && currentSentinel) {
        observerRef.current.unobserve(currentSentinel);
      }
    };
  }, [handleObserver, threshold]);

  return sentinelRef;
}
