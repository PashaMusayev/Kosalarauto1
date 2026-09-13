import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
}

interface SlideItemProps {
  slide: { src: string; originalIndex: number };
  activeImageIndex: number;
  safeTitle: string;
  isLightbox: boolean;
  isPreloadAllowed: boolean;
  onSlideClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onZoomChange?: (isZoomed: boolean) => void;
  onCancelDrag?: () => void;
  onTouchActivity?: () => void;
}

const SlideItem = React.memo<SlideItemProps>(({
  slide,
  activeImageIndex,
  safeTitle,
  isLightbox,
  isPreloadAllowed,
  onSlideClick,
  onZoomChange,
  onCancelDrag,
  onTouchActivity,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const isActive = slide.originalIndex === activeImageIndex;

  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // References to keep gesture math synchronous without re-renders during 60fps touchmove
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const isZoomedRef = useRef(false);

  // Gesture tracking
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const pinchStartCenterRef = useRef({ x: 0, y: 0 });
  const pinchStartTranslateRef = useRef({ x: 0, y: 0 });

  const panStartTouchRef = useRef({ x: 0, y: 0 });
  const panStartTranslateRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const isPinchingRef = useRef(false);

  // Tap & double-tap tracking
  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchMovedRef = useRef(false);

  // Sync internal refs
  scaleRef.current = scale;
  translateRef.current = translate;
  isZoomedRef.current = scale > 1.02;

  // If image is already complete in browser HTTP cache, mark loaded immediately
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [slide.src, isPreloadAllowed]);

  // Apply transform with or without CSS transition directly to DOM for 60fps responsiveness
  const applyTransform = useCallback((s: number, x: number, y: number, withTransition: boolean) => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.transition = withTransition
      ? 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1)'
      : 'none';
    wrapperRef.current.style.transform = `translate3d(${x}px, ${y}px, 0px) scale(${s})`;
  }, []);

  // Reset zoom helper
  const handleResetZoom = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
    isZoomedRef.current = false;
    applyTransform(1, 0, 0, true);
    onZoomChange?.(false);
  }, [applyTransform, onZoomChange]);

  // Reset zoom whenever slide becomes inactive
  useEffect(() => {
    if (!isActive && isLightbox) {
      handleResetZoom();
    }
  }, [isActive, isLightbox, handleResetZoom]);

  // Toggle zoom (for double-tap on mobile / double-click on desktop)
  const handleToggleZoom = useCallback((clientX: number, clientY: number) => {
    if (!isLightbox) return;

    if (scaleRef.current > 1.05) {
      // Zoom out to 1x
      handleResetZoom();
    } else {
      // Zoom in to 2.5x centered at tap/click coordinates
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const targetScale = 2.5;

      // Distance from container center
      const offsetX = clientX - (rect.left + rect.width / 2);
      const offsetY = clientY - (rect.top + rect.height / 2);

      const targetX = -offsetX * (targetScale - 1);
      const targetY = -offsetY * (targetScale - 1);

      const maxX = Math.max(0, (rect.width * (targetScale - 1)) / 2);
      const maxY = Math.max(0, (rect.height * (targetScale - 1)) / 2);

      const clampedX = Math.max(-maxX, Math.min(maxX, targetX));
      const clampedY = Math.max(-maxY, Math.min(maxY, targetY));

      setScale(targetScale);
      setTranslate({ x: clampedX, y: clampedY });
      scaleRef.current = targetScale;
      translateRef.current = { x: clampedX, y: clampedY };
      isZoomedRef.current = true;
      applyTransform(targetScale, clampedX, clampedY, true);
      onZoomChange?.(true);
    }
  }, [isLightbox, handleResetZoom, applyTransform, onZoomChange]);

  // Attach native non-passive touch listeners for 60fps pinch-to-zoom & pan in Lightbox
  useEffect(() => {
    if (!isLightbox) return;
    const container = containerRef.current;
    if (!container) return;

    // Prevent pointerdown from bubbling to Embla when zoomed
    const onPointerDownCapture = (e: PointerEvent) => {
      if (scaleRef.current > 1.02) {
        e.stopPropagation();
      }
    };

    // Prevent Safari iOS default multi-touch page zoom
    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!isActive) return;
      onTouchActivity?.();

      if (e.touches.length >= 2) {
        // PINCH START
        isPinchingRef.current = true;
        isPanningRef.current = false;
        touchMovedRef.current = true;
        e.preventDefault();
        e.stopPropagation();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        pinchStartDistRef.current = Math.max(10, Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY));
        pinchStartScaleRef.current = scaleRef.current;
        pinchStartTranslateRef.current = { ...translateRef.current };
        pinchStartCenterRef.current = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
        onZoomChange?.(true);
        onCancelDrag?.();
      } else if (e.touches.length === 1) {
        // SINGLE TOUCH
        isPinchingRef.current = false;
        touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchMovedRef.current = false;

        if (scaleRef.current > 1.02) {
          // If zoomed: PAN within image, prevent gallery swipe
          isPanningRef.current = true;
          e.preventDefault();
          e.stopPropagation();
          panStartTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          panStartTranslateRef.current = { ...translateRef.current };
        } else {
          // If 1x: Allow normal horizontal swipe through Embla
          isPanningRef.current = false;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isActive) return;

      if (e.touches.length >= 2) {
        // Multi-touch: PINCH IN PROGRESS
        if (!isPinchingRef.current) {
          isPinchingRef.current = true;
          isPanningRef.current = false;
          const t0 = e.touches[0];
          const t1 = e.touches[1];
          pinchStartDistRef.current = Math.max(10, Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY));
          pinchStartScaleRef.current = scaleRef.current;
          pinchStartTranslateRef.current = { ...translateRef.current };
          pinchStartCenterRef.current = {
            x: (t0.clientX + t1.clientX) / 2,
            y: (t0.clientY + t1.clientY) / 2,
          };
          onZoomChange?.(true);
          onCancelDrag?.();
        }

        e.preventDefault();
        e.stopPropagation();
        touchMovedRef.current = true;

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        if (pinchStartDistRef.current <= 0) return;

        const factor = dist / pinchStartDistRef.current;
        // Limit zoom scale between 0.85x and 4.2x during active pinch
        const newScale = Math.min(4.2, Math.max(0.85, pinchStartScaleRef.current * factor));

        const currCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };

        const rect = container.getBoundingClientRect();
        const cX = rect.left + rect.width / 2;
        const cY = rect.top + rect.height / 2;

        const focalX = pinchStartCenterRef.current.x - cX;
        const focalY = pinchStartCenterRef.current.y - cY;
        const scaleRatio = newScale / Math.max(0.01, pinchStartScaleRef.current);

        const zoomDx = (focalX - pinchStartTranslateRef.current.x) * (1 - scaleRatio);
        const zoomDy = (focalY - pinchStartTranslateRef.current.y) * (1 - scaleRatio);

        const panDx = currCenter.x - pinchStartCenterRef.current.x;
        const panDy = currCenter.y - pinchStartCenterRef.current.y;

        const rawX = pinchStartTranslateRef.current.x + zoomDx + panDx;
        const rawY = pinchStartTranslateRef.current.y + zoomDy + panDy;

        const maxX = Math.max(0, (rect.width * (newScale - 1)) / 2);
        const maxY = Math.max(0, (rect.height * (newScale - 1)) / 2);
        const clampedX = Math.max(-maxX * 1.15, Math.min(maxX * 1.15, rawX));
        const clampedY = Math.max(-maxY * 1.15, Math.min(maxY * 1.15, rawY));

        scaleRef.current = newScale;
        translateRef.current = { x: clampedX, y: clampedY };
        applyTransform(newScale, clampedX, clampedY, false); // No CSS transition during active pinch
      } else if (e.touches.length === 1) {
        // Single touch
        const moveDist = Math.hypot(
          e.touches[0].clientX - touchStartPosRef.current.x,
          e.touches[0].clientY - touchStartPosRef.current.y
        );
        if (moveDist > 8) {
          touchMovedRef.current = true;
        }

        if (isPanningRef.current && scaleRef.current > 1.02) {
          // PANNING ZOOMED IMAGE
          e.preventDefault();
          e.stopPropagation();

          const dx = e.touches[0].clientX - panStartTouchRef.current.x;
          const dy = e.touches[0].clientY - panStartTouchRef.current.y;

          const rawX = panStartTranslateRef.current.x + dx;
          const rawY = panStartTranslateRef.current.y + dy;

          const rect = container.getBoundingClientRect();
          const currentScale = scaleRef.current;
          const maxX = Math.max(0, (rect.width * (currentScale - 1)) / 2);
          const maxY = Math.max(0, (rect.height * (currentScale - 1)) / 2);

          const clampedX = Math.max(-maxX, Math.min(maxX, rawX));
          const clampedY = Math.max(-maxY, Math.min(maxY, rawY));

          translateRef.current = { x: clampedX, y: clampedY };
          applyTransform(currentScale, clampedX, clampedY, false); // No CSS transition during active pan
        }
        // If scale <= 1.02, we do not preventDefault/stopPropagation: Embla handles gallery swipe!
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isActive) return;
      onTouchActivity?.();

      if (isPinchingRef.current) {
        if (e.touches.length === 0) {
          isPinchingRef.current = false;
          e.preventDefault();
          e.stopPropagation();

          if (scaleRef.current <= 1.05) {
            // Pinched back down to ~1x: snap smoothly back to 1x
            handleResetZoom();
          } else {
            // Clamped final zoom level between 1x and 4x
            const rect = container.getBoundingClientRect();
            const currentScale = Math.min(4, Math.max(1, scaleRef.current));
            const maxX = Math.max(0, (rect.width * (currentScale - 1)) / 2);
            const maxY = Math.max(0, (rect.height * (currentScale - 1)) / 2);

            const finalX = Math.max(-maxX, Math.min(maxX, translateRef.current.x));
            const finalY = Math.max(-maxY, Math.min(maxY, translateRef.current.y));

            setScale(currentScale);
            setTranslate({ x: finalX, y: finalY });
            scaleRef.current = currentScale;
            translateRef.current = { x: finalX, y: finalY };
            isZoomedRef.current = currentScale > 1.02;
            applyTransform(currentScale, finalX, finalY, true); // Smooth snap animation
            onZoomChange?.(true);
          }
          return;
        } else if (e.touches.length === 1) {
          // Transition from pinch to single-finger pan
          isPinchingRef.current = false;
          if (scaleRef.current > 1.05) {
            isPanningRef.current = true;
            panStartTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            panStartTranslateRef.current = { ...translateRef.current };
          }
        }
      }

      if (isPanningRef.current && e.touches.length === 0) {
        isPanningRef.current = false;
        e.preventDefault();
        e.stopPropagation();

        const rect = container.getBoundingClientRect();
        const currentScale = scaleRef.current;
        const maxX = Math.max(0, (rect.width * (currentScale - 1)) / 2);
        const maxY = Math.max(0, (rect.height * (currentScale - 1)) / 2);

        const finalX = Math.max(-maxX, Math.min(maxX, translateRef.current.x));
        const finalY = Math.max(-maxY, Math.min(maxY, translateRef.current.y));

        setTranslate({ x: finalX, y: finalY });
        translateRef.current = { x: finalX, y: finalY };
        applyTransform(currentScale, finalX, finalY, true);
        return;
      }

      // DOUBLE-TAP DETECTION:
      // When a single finger lifts without dragging
      if (!touchMovedRef.current && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const now = Date.now();
        const timeDiff = now - lastTapTimeRef.current;
        const distFromLastTap = Math.hypot(
          touch.clientX - lastTapPosRef.current.x,
          touch.clientY - lastTapPosRef.current.y
        );

        if (timeDiff > 40 && timeDiff < 320 && distFromLastTap < 40) {
          // Double-tap confirmed!
          e.preventDefault();
          e.stopPropagation();
          lastTapTimeRef.current = 0;
          lastTapPosRef.current = { x: 0, y: 0 };
          handleToggleZoom(touch.clientX, touch.clientY);
        } else {
          lastTapTimeRef.current = now;
          lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDownCapture, { capture: true });
    container.addEventListener('gesturestart', onGesture, { passive: false });
    container.addEventListener('gesturechange', onGesture, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('pointerdown', onPointerDownCapture, { capture: true });
      container.removeEventListener('gesturestart', onGesture);
      container.removeEventListener('gesturechange', onGesture);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isActive, isLightbox, handleResetZoom, handleToggleZoom, applyTransform, onZoomChange, onCancelDrag, onTouchActivity]);

  return (
    <div
      ref={containerRef}
      onClick={scale <= 1.02 ? onSlideClick : undefined}
      onDoubleClick={(e) => {
        if (isLightbox) {
          e.stopPropagation();
          handleToggleZoom(e.clientX, e.clientY);
        }
      }}
      className="flex-[0_0_100%] min-w-0 h-full w-full relative overflow-hidden p-0 m-0 flex items-center justify-center bg-black select-none"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        touchAction: isLightbox ? (scale > 1.02 ? 'none' : 'pan-y') : 'pan-y',
        cursor: isLightbox ? (scale > 1.02 ? 'grab' : 'default') : 'pointer',
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
    duration: 25,
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
      emblaApi.scrollTo(activeImageIndex, true);
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
        emblaApi.scrollTo(diff1 <= diff2 ? candidate1 : candidate2, true);
      } else {
        emblaApi.scrollTo(activeImageIndex, true);
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
        if (emblaApi) emblaApi.scrollNext();
      } else if (e.key === 'ArrowLeft') {
        if (emblaApi) emblaApi.scrollPrev();
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
      emblaApi.scrollPrev();
    }
  }, [emblaApi]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (emblaApi) {
      emblaApi.scrollNext();
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
          : (className || 'bg-black w-full aspect-[4/3] md:aspect-auto md:h-[500px] mx-auto flex items-center justify-center')
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
        className={`overflow-hidden w-full h-full bg-black ${isLightbox ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`} 
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
                safeTitle={safeTitle}
                isLightbox={isLightbox}
                isPreloadAllowed={isPreloadAllowed}
                onSlideClick={handleSlideClick(slide.originalIndex)}
                onZoomChange={handleZoomChange}
                onCancelDrag={handleCancelDrag}
                onTouchActivity={recordTouchActivity}
              />
            );
          })}
        </div>
      </div>

      {/* Turbo.az Sağ Aşağı Künc Şəkil Sayğacı (Yalnız qeyri-lightbox rejimdə göstərilir) */}
      {!isLightbox && (
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 pointer-events-none flex items-center gap-1 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs sm:text-[13px] font-semibold border border-white/20 shadow-md">
          <span>{activeImageIndex + 1}</span>
          <span className="text-white/60 font-light">/</span>
          <span className="text-white/90">{totalImages}</span>
        </div>
      )}

      {/* Turbo.az Desktop Ox Düymələri */}
      {totalImages > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="hidden sm:flex absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 active:scale-95 text-white items-center justify-center z-20 border border-white/20 transition-all cursor-pointer shadow-md"
            title="Əvvəlki şəkil"
            aria-label="Əvvəlki şəkil"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="hidden sm:flex absolute right-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 active:scale-95 text-white items-center justify-center z-20 border border-white/20 transition-all cursor-pointer shadow-md"
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
