import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
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
}

const SlideItem = React.memo<SlideItemProps>(({
  slide,
  activeImageIndex,
  safeTitle,
  isLightbox,
  isPreloadAllowed,
  onSlideClick,
  onZoomChange,
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
  const lastTapTimeRef = useRef(0);

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

    const onTouchStart = (e: TouchEvent) => {
      if (!isActive) return;

      if (e.touches.length === 2) {
        // Pinch start
        isPinchingRef.current = true;
        isPanningRef.current = false;
        e.preventDefault();
        e.stopPropagation();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        pinchStartDistRef.current = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        pinchStartScaleRef.current = scaleRef.current;
        pinchStartTranslateRef.current = { ...translateRef.current };
        pinchStartCenterRef.current = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
      } else if (e.touches.length === 1) {
        // Single touch
        isPinchingRef.current = false;
        if (scaleRef.current > 1.02) {
          // If zoomed, pan within image
          isPanningRef.current = true;
          e.preventDefault();
          e.stopPropagation();
          panStartTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          panStartTranslateRef.current = { ...translateRef.current };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isActive) return;

      if (isPinchingRef.current && e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        if (pinchStartDistRef.current <= 0) return;

        const factor = dist / pinchStartDistRef.current;
        const newScale = Math.min(4, Math.max(0.85, pinchStartScaleRef.current * factor));

        const currCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
        const dx = currCenter.x - pinchStartCenterRef.current.x;
        const dy = currCenter.y - pinchStartCenterRef.current.y;

        const newX = pinchStartTranslateRef.current.x + dx;
        const newY = pinchStartTranslateRef.current.y + dy;

        scaleRef.current = newScale;
        translateRef.current = { x: newX, y: newY };
        applyTransform(newScale, newX, newY, false);
      } else if (isPanningRef.current && e.touches.length === 1) {
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
        applyTransform(currentScale, clampedX, clampedY, false);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isActive) return;

      if (isPinchingRef.current) {
        isPinchingRef.current = false;
        e.preventDefault();
        e.stopPropagation();

        if (scaleRef.current <= 1.05) {
          // Snap back to normal scale
          handleResetZoom();
        } else {
          // Clamp bounds
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
          applyTransform(currentScale, finalX, finalY, true);
          onZoomChange?.(true);
        }
        return;
      }

      if (isPanningRef.current) {
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

      // Detect double-tap when touch ended cleanly without pan/pinch
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const now = Date.now();
        const timeDiff = now - lastTapTimeRef.current;
        if (timeDiff > 40 && timeDiff < 320) {
          // Double-tap detected!
          e.preventDefault();
          e.stopPropagation();
          lastTapTimeRef.current = 0;
          handleToggleZoom(touch.clientX, touch.clientY);
        } else {
          lastTapTimeRef.current = now;
        }
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isActive, isLightbox, handleResetZoom, handleToggleZoom, applyTransform, onZoomChange]);

  return (
    <div
      ref={containerRef}
      onClick={scale <= 1.02 ? onSlideClick : undefined}
      className="flex-[0_0_100%] min-w-0 h-full w-full relative overflow-hidden p-0 m-0 flex items-center justify-center bg-black select-none"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        touchAction: isLightbox && scale > 1.02 ? 'none' : 'pan-y',
        cursor: 'pointer',
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

      {/* Floating Zoom Level Pill with Reset button when zoomed in Lightbox */}
      {isLightbox && isActive && scale > 1.05 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-2xl select-none pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-blue-400 font-mono tracking-tight">{scale.toFixed(1)}x</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <button
            type="button"
            onClick={handleResetZoom}
            className="text-white hover:text-blue-300 active:scale-95 transition-colors cursor-pointer flex items-center gap-1.5"
            title="İlkin ölçüyə qaytar"
          >
            <RotateCcw className="w-3 h-3 text-white/80" />
            <span>Sıfırla</span>
          </button>
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

  const [isSlideZoomed, setIsSlideZoomed] = useState(false);

  // Embla Carousel with true infinite loop mode (zero rewind)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: totalImages > 1,
    skipSnaps: false,
    duration: 25,
    startIndex: activeImageIndex || 0,
    watchDrag: !isSlideZoomed && totalImages > 1,
  });

  // Re-init or update drag watching dynamically when zoom state changes
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit({ watchDrag: !isSlideZoomed && totalImages > 1 });
  }, [emblaApi, isSlideZoomed, totalImages]);

  // Reset zoom state on active index change
  useEffect(() => {
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
                onZoomChange={setIsSlideZoomed}
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
