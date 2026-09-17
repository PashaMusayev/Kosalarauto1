import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { DEFAULT_VEHICLE_PLACEHOLDER, getValidImageUrl, handleImageLoadError } from '../utils/imageFallback';
import { prefetchCarouselWindow } from '../utils/imagePreloader';

interface TurboImageSliderProps {
  images: string[];
  activeImageIndex: number;
  onIndexChange: (newIndex: number) => void;
  safeTitle: string;
  onImageClick?: (index?: number) => void;
  isLightbox?: boolean;
  disabledKeyNav?: boolean;
  className?: string;
  onOpenPhotoGrid?: () => void;
}

interface SlideItemProps {
  slide: { src: string; originalIndex: number };
  activeImageIndex: number;
  totalImages: number;
  safeTitle: string;
  isLightbox: boolean;
  isPreloadAllowed: boolean;
  onSlideClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onZoomChange?: (isZoomed: boolean) => void;
  onCancelDrag?: () => void;
  onTouchActivity?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

enum GestureState {
  IDLE = 'IDLE',
  PINCH = 'PINCH',
  PAN = 'PAN',
  SWIPE = 'SWIPE',
}

const SlideItem = React.memo<SlideItemProps>(({
  slide,
  activeImageIndex,
  totalImages,
  safeTitle,
  isLightbox,
  isPreloadAllowed,
  onSlideClick,
  onZoomChange,
  onCancelDrag,
  onTouchActivity,
  onPrev,
  onNext,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
  });

  const isActive = slide.originalIndex === activeImageIndex;

  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Authoritative synchronous refs for 60fps gesture transforms (immune to React render lag)
  const currentScaleRef = useRef(1);
  const currentTranslateRef = useRef({ x: 0, y: 0 });
  const gestureStateRef = useRef<GestureState>(GestureState.IDLE);

  // Pinch tracking
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const pinchStartTranslateRef = useRef({ x: 0, y: 0 });
  const pinchStartFocalRef = useRef({ x: 0, y: 0 });
  const pinchStartCenterScreenRef = useRef({ x: 0, y: 0 });

  // Pan tracking
  const panStartTouchRef = useRef({ x: 0, y: 0 });
  const panStartTranslateRef = useRef({ x: 0, y: 0 });
  const panBoundaryOverflowXRef = useRef(0);
  const panHasMovedRef = useRef(false);

  // Tap & double-tap tracking
  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });
  const touchStartTimeRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  // If image is already complete in browser HTTP cache, mark loaded immediately
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [slide.src, isPreloadAllowed]);

  // Apply transform directly to DOM for 60fps responsiveness
  const applyTransform = useCallback((s: number, x: number, y: number, withTransition: boolean) => {
    // Strictly isolate & disable desktop Lightbox zoom transforms (md: and above)
    if (isLightbox && typeof window !== 'undefined' && window.innerWidth >= 768) {
      s = 1;
      x = 0;
      y = 0;
    }

    currentScaleRef.current = s;
    currentTranslateRef.current = { x, y };

    if (!wrapperRef.current) return;
    wrapperRef.current.style.transition = withTransition
      ? 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1)'
      : 'none';
    wrapperRef.current.style.transform = `translate3d(${x}px, ${y}px, 0px) scale(${s})`;
  }, [isLightbox]);

  // Reset zoom helper: resets scale=1, panX=0, panY=0
  const handleResetZoom = useCallback((withTransition = true) => {
    currentScaleRef.current = 1;
    currentTranslateRef.current = { x: 0, y: 0 };
    setIsZoomed(false);
    applyTransform(1, 0, 0, withTransition);
    onZoomChange?.(false);
  }, [applyTransform, onZoomChange]);

  // Track responsive viewport size and reset zoom if transitioning to desktop
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop && isLightbox && currentScaleRef.current > 1) {
        handleResetZoom(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLightbox, handleResetZoom]);

  // Reset zoom whenever slide becomes inactive
  useEffect(() => {
    if (!isActive && isLightbox) {
      handleResetZoom(false);
    }
  }, [isActive, isLightbox, handleResetZoom]);

  // Toggle zoom (for double-tap on mobile; strictly disabled on desktop md: and above)
  const handleToggleZoom = useCallback((clientX: number, clientY: number) => {
    if (!isLightbox) return;
    // Strictly disable zoom on desktop (md: breakpoint >= 768px)
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return;
    }

    if (currentScaleRef.current > 1.02) {
      // Return cleanly to 1x
      handleResetZoom(true);
    } else {
      // Zoom in to 2.5x centered at tap/click coordinates
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const targetScale = 2.5;

      const cX = rect.left + rect.width / 2;
      const cY = rect.top + rect.height / 2;
      const offsetX = clientX - cX;
      const offsetY = clientY - cY;

      const targetX = -offsetX * (targetScale - 1);
      const targetY = -offsetY * (targetScale - 1);

      const maxX = Math.max(0, (rect.width * (targetScale - 1)) / 2);
      const maxY = Math.max(0, (rect.height * (targetScale - 1)) / 2);

      const clampedX = Math.max(-maxX, Math.min(maxX, targetX));
      const clampedY = Math.max(-maxY, Math.min(maxY, targetY));

      currentScaleRef.current = targetScale;
      currentTranslateRef.current = { x: clampedX, y: clampedY };
      setIsZoomed(true);
      applyTransform(targetScale, clampedX, clampedY, true);
      onZoomChange?.(true);
    }
  }, [isLightbox, handleResetZoom, applyTransform, onZoomChange]);

  // Native touch gesture listeners for 60fps pinch-to-zoom & pan in Lightbox
  useEffect(() => {
    if (!isLightbox) return;
    const container = containerRef.current;
    if (!container) return;

    // Prevent Safari iOS default page zoom
    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!isActive) return;
      // On desktop (md: breakpoint >= 768px), disable touch pinch/zoom gestures
      if (window.innerWidth >= 768) return;
      onTouchActivity?.();

      if (e.touches.length >= 2) {
        // TWO-FINGER PINCH START
        gestureStateRef.current = GestureState.PINCH;
        panHasMovedRef.current = true;
        e.preventDefault();
        e.stopPropagation();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);

        pinchStartDistRef.current = Math.max(10, dist);
        // CRITICAL: Always use CURRENT scale as base zoom! Never reset to 1x!
        pinchStartScaleRef.current = currentScaleRef.current;
        pinchStartTranslateRef.current = { ...currentTranslateRef.current };

        const rect = container.getBoundingClientRect();
        const cX = rect.left + rect.width / 2;
        const cY = rect.top + rect.height / 2;
        pinchStartCenterScreenRef.current = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
        pinchStartFocalRef.current = {
          x: pinchStartCenterScreenRef.current.x - cX,
          y: pinchStartCenterScreenRef.current.y - cY,
        };

        onCancelDrag?.();
        return;
      }

      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartTimeRef.current = Date.now();
        panHasMovedRef.current = false;
        panBoundaryOverflowXRef.current = 0;
        panStartTouchRef.current = { x: t.clientX, y: t.clientY };
        panStartTranslateRef.current = { ...currentTranslateRef.current };

        if (currentScaleRef.current > 1.02) {
          gestureStateRef.current = GestureState.PAN;
        } else {
          gestureStateRef.current = GestureState.SWIPE;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isActive) return;
      // On desktop (md: breakpoint >= 768px), disable touch pinch/zoom gestures
      if (window.innerWidth >= 768) return;

      if (e.touches.length >= 2) {
        // TWO-FINGER PINCH IN PROGRESS
        if (gestureStateRef.current !== GestureState.PINCH) {
          gestureStateRef.current = GestureState.PINCH;
          panHasMovedRef.current = true;
          const t0 = e.touches[0];
          const t1 = e.touches[1];
          pinchStartDistRef.current = Math.max(10, Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY));
          pinchStartScaleRef.current = currentScaleRef.current;
          pinchStartTranslateRef.current = { ...currentTranslateRef.current };
          const rect = container.getBoundingClientRect();
          const cX = rect.left + rect.width / 2;
          const cY = rect.top + rect.height / 2;
          pinchStartCenterScreenRef.current = {
            x: (t0.clientX + t1.clientX) / 2,
            y: (t0.clientY + t1.clientY) / 2,
          };
          pinchStartFocalRef.current = {
            x: pinchStartCenterScreenRef.current.x - cX,
            y: pinchStartCenterScreenRef.current.y - cY,
          };
          onCancelDrag?.();
        }

        e.preventDefault();
        e.stopPropagation();
        panHasMovedRef.current = true;

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        if (pinchStartDistRef.current <= 0) return;

        const ratio = dist / pinchStartDistRef.current;
        const rawScale = pinchStartScaleRef.current * ratio;

        // CRITICAL: Hard limits MIN_ZOOM = 1.0, MAX_ZOOM = 4.0
        // Never allow shrinking below 1x (no 0.9x, 0.8x, 0.5x). Continuous scaling.
        const newScale = Math.min(4.0, Math.max(1.0, rawScale));

        const currCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };

        // Continuous focal point tracking
        const scaleRatio = newScale / Math.max(0.01, pinchStartScaleRef.current);
        const zoomDx = (pinchStartFocalRef.current.x - pinchStartTranslateRef.current.x) * (1 - scaleRatio);
        const zoomDy = (pinchStartFocalRef.current.y - pinchStartTranslateRef.current.y) * (1 - scaleRatio);

        const panDx = currCenter.x - pinchStartCenterScreenRef.current.x;
        const panDy = currCenter.y - pinchStartCenterScreenRef.current.y;

        const rawX = pinchStartTranslateRef.current.x + zoomDx + panDx;
        const rawY = pinchStartTranslateRef.current.y + zoomDy + panDy;

        const rect = container.getBoundingClientRect();
        const maxX = Math.max(0, (rect.width * (newScale - 1)) / 2);
        const maxY = Math.max(0, (rect.height * (newScale - 1)) / 2);

        const clampedX = Math.max(-maxX, Math.min(maxX, rawX));
        const clampedY = Math.max(-maxY, Math.min(maxY, rawY));

        currentScaleRef.current = newScale;
        currentTranslateRef.current = { x: clampedX, y: clampedY };
        applyTransform(newScale, clampedX, clampedY, false);

        if (newScale > 1.02) {
          setIsZoomed(true);
          onZoomChange?.(true);
        } else {
          setIsZoomed(false);
          onZoomChange?.(false);
        }
        return;
      }

      if (e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - panStartTouchRef.current.x;
        const dy = t.clientY - panStartTouchRef.current.y;
        const moveDist = Math.hypot(dx, dy);

        if (moveDist > 6) {
          panHasMovedRef.current = true;
        }

        // ONE-FINGER PAN AFTER ZOOM
        if (gestureStateRef.current === GestureState.PAN && currentScaleRef.current > 1.02) {
          e.preventDefault();
          e.stopPropagation();

          const rect = container.getBoundingClientRect();
          const scale = currentScaleRef.current;
          const maxX = Math.max(0, (rect.width * (scale - 1)) / 2);
          const maxY = Math.max(0, (rect.height * (scale - 1)) / 2);

          const rawX = panStartTranslateRef.current.x + dx;
          const rawY = panStartTranslateRef.current.y + dy;

          let targetX = rawX;
          let overflowX = 0;

          if (rawX > maxX) {
            overflowX = rawX - maxX;
            targetX = maxX + overflowX * 0.3; // natural boundary resistance
          } else if (rawX < -maxX) {
            overflowX = rawX - (-maxX);
            targetX = -maxX + overflowX * 0.3; // natural boundary resistance
          }

          const clampedY = Math.max(-maxY, Math.min(maxY, rawY));

          panBoundaryOverflowXRef.current = overflowX;
          currentTranslateRef.current = { x: targetX, y: clampedY };
          applyTransform(scale, targetX, clampedY, false);
        }
        // At 1x (scale <= 1.02): gestureState is SWIPE -> Embla handles carousel drag
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isActive) return;
      onTouchActivity?.();

      // PINCH END
      if (gestureStateRef.current === GestureState.PINCH) {
        if (e.touches.length === 0) {
          gestureStateRef.current = GestureState.IDLE;
          suppressClickUntilRef.current = Date.now() + 400;
          lastTapTimeRef.current = 0; // Prevent pinch release from triggering double-tap!

          e.preventDefault();
          e.stopPropagation();

          if (currentScaleRef.current <= 1.02) {
            handleResetZoom(true);
          } else {
            // Keep current zoom level, clamp boundaries
            const rect = container.getBoundingClientRect();
            const scale = currentScaleRef.current;
            const maxX = Math.max(0, (rect.width * (scale - 1)) / 2);
            const maxY = Math.max(0, (rect.height * (scale - 1)) / 2);

            const clampedX = Math.max(-maxX, Math.min(maxX, currentTranslateRef.current.x));
            const clampedY = Math.max(-maxY, Math.min(maxY, currentTranslateRef.current.y));

            currentTranslateRef.current = { x: clampedX, y: clampedY };
            applyTransform(scale, clampedX, clampedY, true);
            setIsZoomed(true);
            onZoomChange?.(true);
          }
          return;
        } else if (e.touches.length === 1) {
          // Transition from pinch to single-finger pan
          gestureStateRef.current = GestureState.PAN;
          panHasMovedRef.current = true;
          panBoundaryOverflowXRef.current = 0;
          const t = e.touches[0];
          panStartTouchRef.current = { x: t.clientX, y: t.clientY };
          panStartTranslateRef.current = { ...currentTranslateRef.current };
          return;
        }
      }

      // PAN / SWIPE / TAP END
      if (e.touches.length === 0) {
        const wasPan = gestureStateRef.current === GestureState.PAN;
        gestureStateRef.current = GestureState.IDLE;

        // Check if this was a clean single tap (not a drag/swipe)
        const isTap = !panHasMovedRef.current && (Date.now() - touchStartTimeRef.current < 300);

        if (isTap && e.changedTouches.length === 1) {
          const touch = e.changedTouches[0];
          const now = Date.now();
          const timeDiff = now - lastTapTimeRef.current;
          const distFromLastTap = Math.hypot(
            touch.clientX - lastTapPosRef.current.x,
            touch.clientY - lastTapPosRef.current.y
          );

          if (timeDiff > 40 && timeDiff < 350 && distFromLastTap < 45) {
            // CRITICAL: DOUBLE-TAP CONFIRMED!
            // 1x -> 2.5x, or 2.5x -> 1x (resets scale=1, panX=0, panY=0)
            e.preventDefault();
            e.stopPropagation();
            suppressClickUntilRef.current = now + 400;
            lastTapTimeRef.current = 0;
            lastTapPosRef.current = { x: 0, y: 0 };
            handleToggleZoom(touch.clientX, touch.clientY);
            return;
          } else {
            // First tap of potential double-tap
            lastTapTimeRef.current = now;
            lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
            return;
          }
        }

        // Drag/move occurred: reset tap tracking so drag never triggers double-tap
        lastTapTimeRef.current = 0;

        if (wasPan && currentScaleRef.current > 1.02) {
          e.preventDefault();
          e.stopPropagation();
          suppressClickUntilRef.current = Date.now() + 300;

          const overflowX = panBoundaryOverflowXRef.current;
          panBoundaryOverflowXRef.current = 0;

          // Transition to gallery navigation if user dragged strongly past horizontal boundary
          if (overflowX > 60 && totalImages > 1) {
            handleResetZoom(false);
            onPrev?.();
            return;
          } else if (overflowX < -60 && totalImages > 1) {
            handleResetZoom(false);
            onNext?.();
            return;
          }

          // Normal pan: snapback within boundaries
          const rect = container.getBoundingClientRect();
          const scale = currentScaleRef.current;
          const maxX = Math.max(0, (rect.width * (scale - 1)) / 2);
          const maxY = Math.max(0, (rect.height * (scale - 1)) / 2);

          const clampedX = Math.max(-maxX, Math.min(maxX, currentTranslateRef.current.x));
          const clampedY = Math.max(-maxY, Math.min(maxY, currentTranslateRef.current.y));

          currentTranslateRef.current = { x: clampedX, y: clampedY };
          applyTransform(scale, clampedX, clampedY, true);
        }
      }
    };

    const onTouchCancel = () => {
      gestureStateRef.current = GestureState.IDLE;
      lastTapTimeRef.current = 0;
      panBoundaryOverflowXRef.current = 0;
      if (currentScaleRef.current <= 1.02) {
        handleResetZoom(false);
      }
    };

    // Prevent desktop trackpad pinch-to-zoom or mouse wheel zoom inside Lightbox
    const onWheel = (e: WheelEvent) => {
      if (isLightbox && window.innerWidth >= 768) {
        if (e.ctrlKey) {
          e.preventDefault();
        }
      }
    };

    container.addEventListener('gesturestart', onGesture, { passive: false });
    container.addEventListener('gesturechange', onGesture, { passive: false });
    container.addEventListener('gestureend', onGesture, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchCancel, { passive: false });
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('gesturestart', onGesture);
      container.removeEventListener('gesturechange', onGesture);
      container.removeEventListener('gestureend', onGesture);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchCancel);
      container.removeEventListener('wheel', onWheel);
    };
  }, [isActive, isLightbox, totalImages, handleResetZoom, handleToggleZoom, applyTransform, onZoomChange, onCancelDrag, onTouchActivity, onPrev, onNext]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if (Date.now() < suppressClickUntilRef.current || currentScaleRef.current > 1.02) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        onSlideClick(e);
      }}
      onDoubleClick={(e) => {
        if (isLightbox) {
          e.stopPropagation();
          // Strictly disable double-click zoom on desktop (md: breakpoint >= 768px)
          if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            return;
          }
          handleToggleZoom(e.clientX, e.clientY);
        }
      }}
      className="flex-[0_0_100%] min-w-0 h-full w-full relative overflow-hidden p-0 m-0 flex items-center justify-center bg-black select-none"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        touchAction: isLightbox ? (isDesktop ? 'pan-y' : (isZoomed ? 'none' : 'pan-y')) : 'pan-y',
        cursor: isLightbox
          ? isDesktop
            ? totalImages > 1
              ? 'pointer'
              : 'default'
            : isZoomed
              ? 'grab'
              : 'default'
          : 'pointer',
      }}
    >
      {/* Sleek Skeleton / Blur dark placeholder during initial download */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-0 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white/10 border-t-white/70 animate-spin" />
          </div>
        </div>
      )}

      {isPreloadAllowed && (
        <div
          ref={wrapperRef}
          className="w-full h-full flex items-center justify-center relative will-change-transform"
          style={{
            width: '100%',
            height: '100%',
            transformOrigin: 'center center',
          }}
        >
          <img
            ref={imgRef}
            src={slide.src}
            alt={`${safeTitle} - ${slide.originalIndex + 1}`}
            loading={isActive ? 'eager' : 'lazy'}
            fetchPriority={isActive ? 'high' : 'auto'}
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              handleImageLoadError(e.currentTarget);
              setIsLoaded(true);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectPosition: 'center',
            }}
            className={`w-full h-full select-none pointer-events-none relative z-10 block mx-auto object-center drop-shadow-md transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${
              isLightbox
                ? 'object-contain p-2 sm:p-4'
                : 'object-cover md:object-contain p-0'
            }`}
          />
        </div>
      )}
    </div>
  );
});

export const TurboImageSlider: React.FC<TurboImageSliderProps> = ({
  images,
  activeImageIndex,
  onIndexChange,
  safeTitle,
  onImageClick,
  isLightbox = false,
  disabledKeyNav = false,
  className,
  onOpenPhotoGrid,
}) => {
  const imagesList = useMemo(() => {
    return images && images.length > 0 ? images : [DEFAULT_VEHICLE_PLACEHOLDER];
  }, [images]);

  const totalImages = imagesList.length;

  const isSlideZoomedRef = useRef(false);
  const [isSlideZoomed, setIsSlideZoomed] = useState(false);
  const lastTouchTimeRef = useRef<number>(0);

  const handleZoomChange = useCallback((zoomed: boolean) => {
    isSlideZoomedRef.current = zoomed;
    setIsSlideZoomed(zoomed);
  }, []);

  const recordTouchActivity = useCallback(() => {
    lastTouchTimeRef.current = Date.now();
  }, []);

  // Embla Carousel with true infinite loop mode (zero rewind)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: totalImages > 1,
    skipSnaps: false,
    duration: 35, // Smooth slide transition ~320-350ms (replaces abrupt 25)
    startIndex: activeImageIndex || 0,
    watchDrag: (embla, evt) => {
      if (totalImages <= 1) return false;
      if (isLightbox && isSlideZoomedRef.current) return false;
      if ('touches' in evt && (evt as TouchEvent).touches && (evt as TouchEvent).touches.length > 1) {
        return false;
      }
      return true;
    },
  });

  const handleCancelDrag = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollTo(activeImageIndex, false);
    }
  }, [emblaApi, activeImageIndex]);

  // Re-init or update drag watching dynamically when zoom state changes
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, isSlideZoomed]);

  // Reset zoom state on active index change
  useEffect(() => {
    isSlideZoomedRef.current = false;
    setIsSlideZoomed(false);
  }, [activeImageIndex]);

  // Infinite loop slides list:
  // Embla requires at least 3 slides in track for loop mode. For 2 images, duplicate to 4.
  const displaySlides = useMemo(() => {
    if (totalImages === 0) return [];
    if (totalImages === 1) {
      return [{ src: getValidImageUrl(imagesList[0]), originalIndex: 0 }];
    }
    if (totalImages === 2) {
      return [
        { src: getValidImageUrl(imagesList[0]), originalIndex: 0 },
        { src: getValidImageUrl(imagesList[1]), originalIndex: 1 },
        { src: getValidImageUrl(imagesList[0]), originalIndex: 0 },
        { src: getValidImageUrl(imagesList[1]), originalIndex: 1 },
      ];
    }
    return imagesList.map((url, idx) => ({
      src: getValidImageUrl(url),
      originalIndex: idx,
    }));
  }, [imagesList, totalImages]);

  // Preload neighboring images (current, next 2, previous 1) in background
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(() => {
    const current = ((activeImageIndex % totalImages) + totalImages) % totalImages;
    const initial = new Set<number>([current]);
    if (totalImages > 1) {
      initial.add((current + 1) % totalImages);
      initial.add((current + 2) % totalImages);
      initial.add((current - 1 + totalImages) % totalImages);
    }
    return initial;
  });

  useEffect(() => {
    if (totalImages === 0) return;

    // 1. Prefetch via new Image() in invisible background cache
    prefetchCarouselWindow(imagesList, activeImageIndex);

    // 2. Expand loadedIndices in component state so DOM <img> elements are present
    setLoadedIndices((prev) => {
      const current = ((activeImageIndex % totalImages) + totalImages) % totalImages;
      const next1 = (current + 1) % totalImages;
      const next2 = (current + 2) % totalImages;
      const prev1 = (current - 1 + totalImages) % totalImages;

      if (
        prev.has(current) &&
        prev.has(next1) &&
        prev.has(next2) &&
        prev.has(prev1)
      ) {
        return prev;
      }

      const updated = new Set(prev);
      updated.add(current);
      if (totalImages > 1) {
        updated.add(next1);
        updated.add(next2);
        updated.add(prev1);
      }
      return updated;
    });
  }, [activeImageIndex, totalImages, imagesList]);

  // Sync internal slide selection to parent state
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const snap = emblaApi.selectedScrollSnap();
    const logical = totalImages > 0 ? (snap % totalImages) : 0;
    if (logical !== activeImageIndex) {
      isSlideZoomedRef.current = false;
      setIsSlideZoomed(false);
      onIndexChange(logical);
    }
  }, [emblaApi, totalImages, activeImageIndex, onIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Sync external activeImageIndex change into Embla Carousel
  useEffect(() => {
    if (!emblaApi || totalImages <= 1) return;
    const currentSnap = emblaApi.selectedScrollSnap();
    const currentLogical = currentSnap % totalImages;
    if (currentLogical !== activeImageIndex) {
      if (totalImages === 2) {
        const candidate1 = activeImageIndex;
        const candidate2 = activeImageIndex + 2;
        const diff1 = Math.abs(currentSnap - candidate1);
        const diff2 = Math.abs(currentSnap - candidate2);
        emblaApi.scrollTo(diff1 <= diff2 ? candidate1 : candidate2, false);
      } else {
        emblaApi.scrollTo(activeImageIndex, false);
      }
    }
  }, [emblaApi, activeImageIndex, totalImages]);

  // Re-init carousel when imagesList changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi, displaySlides]);

  // Keyboard navigation (ArrowLeft / ArrowRight) with seamless infinite loop
  useEffect(() => {
    if (disabledKeyNav || totalImages <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (emblaApi) emblaApi.scrollNext(false);
      } else if (e.key === 'ArrowLeft') {
        if (emblaApi) emblaApi.scrollPrev(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emblaApi, disabledKeyNav, totalImages]);

  // Button navigation handlers
  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (emblaApi) {
      emblaApi.scrollPrev(false);
    }
  }, [emblaApi]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (emblaApi) {
      emblaApi.scrollNext(false);
    }
  }, [emblaApi]);

  // Track pointer distance to distinguish a clean click/tap from a swipe drag
  const isPointerDownRef = useRef<boolean>(false);
  const dragDistanceRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      lastTouchTimeRef.current = Date.now();
    }
    isPointerDownRef.current = true;
    dragDistanceRef.current = 0;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const dx = Math.abs(e.clientX - startXRef.current);
    const dy = Math.abs(e.clientY - startYRef.current);
    dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.sqrt(dx * dx + dy * dy));
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  // Open Lightbox only when clicked without dragging, synchronizing clicked index.
  // In Lightbox, clicking left ~40% navigates to prev, right ~40% navigates to next.
  const handleSlideClick = useCallback((slideIndex: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (dragDistanceRef.current < 8) {
      if (isLightbox) {
        // Mobile / touch devices navigate via horizontal swipe, not image click.
        // Ignore click events initiated by touch within the last 800ms.
        const isRecentTouch = Date.now() - lastTouchTimeRef.current < 800;
        if (isRecentTouch) {
          return;
        }

        if (totalImages > 1) {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = rect.width > 0 ? clickX / rect.width : 0.5;
          if (ratio <= 0.4) {
            handlePrev(e);
          } else if (ratio >= 0.6) {
            handleNext(e);
          }
        }
      } else {
        onIndexChange(slideIndex);
        if (onImageClick) {
          onImageClick(slideIndex);
        }
      }
    }
  }, [isLightbox, totalImages, handlePrev, handleNext, onIndexChange, onImageClick]);

  return (
    <div
      className={`relative select-none overflow-hidden block ${
        isLightbox
          ? 'h-full w-full flex-1 min-h-0 bg-black'
          : `group ${className || 'bg-black w-full aspect-[4/3] md:aspect-auto md:h-[500px] mx-auto flex items-center justify-center'}`
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        backgroundColor: '#000000',
      }}
    >
      {/* Embla Viewport */}
      <div 
        className={`overflow-hidden w-full h-full bg-black ${
          isLightbox 
            ? totalImages > 1 ? 'cursor-pointer' : 'cursor-default' 
            : 'cursor-grab active:cursor-grabbing'
        }`} 
        ref={emblaRef}
      >
        <div 
          className="flex h-full w-full touch-pan-y will-change-transform bg-black"
        >
          {displaySlides.map((slide, index) => {
            const isPreloadAllowed = loadedIndices.has(slide.originalIndex);

            return (
              <SlideItem
                key={`${slide.originalIndex}-${index}`}
                slide={slide}
                activeImageIndex={activeImageIndex}
                totalImages={totalImages}
                safeTitle={safeTitle}
                isLightbox={isLightbox}
                isPreloadAllowed={isPreloadAllowed}
                onSlideClick={handleSlideClick(slide.originalIndex)}
                onZoomChange={handleZoomChange}
                onCancelDrag={handleCancelDrag}
                onTouchActivity={recordTouchActivity}
                onPrev={handlePrev}
                onNext={handleNext}
              />
            );
          })}
        </div>
      </div>

      {/* Turbo.az Image Controls: Bottom-Center Counter & Bottom-Right "Bütün şəkillər" Button */}
      {!isLightbox && (
        <>
          {/* Mərkəzi Şəkil Sayğacı (Bottom-Center, bg-black/40 backdrop-blur-sm, desktopda hover zamanı) */}
          <div
            id="badge-detail-image-counter"
            className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-medium opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 select-none shadow-xs"
          >
            <span>{activeImageIndex + 1}</span>
            <span className="text-white/60 font-light">/</span>
            <span>{totalImages}</span>
          </div>

          {/* Sağ Aşağı "Bütün şəkillər" Düyməsi (Bottom-Right, Frosted Glass light look) */}
          {onOpenPhotoGrid && totalImages > 1 && (
            <button
              type="button"
              id="btn-all-photos-grid"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPhotoGrid();
              }}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex items-center gap-1.5 backdrop-blur-md bg-white/70 hover:bg-white/90 text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/20 transition-all cursor-pointer select-none active:scale-95 shadow-xs opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="Bütün şəkillər"
              aria-label="Bütün şəkillər"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-gray-700" />
              <span>Bütün şəkillər</span>
            </button>
          )}
        </>
      )}

      {/* Turbo.az Desktop Ox Düymələri (Non-lightbox desktop rejimində hover zamanı görünür, lightbox-da və mobildə həmişə aktivdir) */}
      {totalImages > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className={`hidden sm:flex absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 active:scale-95 text-white items-center justify-center z-20 border border-white/20 transition-all cursor-pointer shadow-md ${
              !isLightbox
                ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 duration-200'
                : 'opacity-100'
            }`}
            title="Əvvəlki şəkil"
            aria-label="Əvvəlki şəkil"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`hidden sm:flex absolute right-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 active:scale-95 text-white items-center justify-center z-20 border border-white/20 transition-all cursor-pointer shadow-md ${
              !isLightbox
                ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 duration-200'
                : 'opacity-100'
            }`}
            title="Növbəti şəkil"
            aria-label="Növbəti şəkil"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}
    </div>
  );
};
