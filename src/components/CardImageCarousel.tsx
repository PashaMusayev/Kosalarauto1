import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { DEFAULT_VEHICLE_PLACEHOLDER, getValidImageUrl, handleImageLoadError } from '../utils/imageFallback';
import { prefetchImages } from '../utils/imagePreloader';

interface CardImageCarouselProps {
  carId: string;
  images?: string[];
  primaryImage?: string;
  safeTitle: string;
  priority?: boolean;
  onCardClick: () => void;
  children?: React.ReactNode;
}

interface CardSlideItemProps {
  src: string;
  idx: number;
  totalImages: number;
  safeTitle: string;
  isPriority: boolean;
  shouldLoad: boolean;
}

const CardSlideItem = React.memo<CardSlideItemProps>(({
  src,
  idx,
  totalImages,
  safeTitle,
  isPriority,
  shouldLoad,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If image is already complete in HTTP cache, mark loaded immediately
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src, shouldLoad]);

  return (
    <div
      className="flex-[0_0_100%] min-w-0 h-full w-full relative overflow-hidden bg-slate-100 select-none flex items-center justify-center"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Shimmer placeholder while image is loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-100 overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200/80 to-slate-100 animate-shimmer" />
        </div>
      )}

      {shouldLoad && (
        <img
          ref={imgRef}
          src={src}
          alt={`${safeTitle} - şəkil ${idx + 1}/${totalImages}`}
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            handleImageLoadError(e.currentTarget);
            setIsLoaded(true);
          }}
          className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 relative z-[1] select-none pointer-events-none ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={idx === 0 && isPriority ? 'eager' : 'lazy'}
          fetchPriority={idx === 0 && isPriority ? 'high' : 'auto'}
          decoding="async"
        />
      )}
    </div>
  );
});

CardSlideItem.displayName = 'CardSlideItem';

export const CardImageCarousel: React.FC<CardImageCarouselProps> = ({
  carId,
  images,
  primaryImage,
  safeTitle,
  priority = false,
  onCardClick,
  children,
}) => {
  // Deduplicate and prioritize primaryImage first
  const imagesList = useMemo(() => {
    const list: string[] = [];
    if (primaryImage && typeof primaryImage === 'string' && primaryImage.trim()) {
      list.push(primaryImage.trim());
    }
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img && typeof img === 'string' && img.trim()) {
          const trimmed = img.trim();
          if (!list.includes(trimmed)) {
            list.push(trimmed);
          }
        }
      }
    }
    return list.length > 0 ? list : [DEFAULT_VEHICLE_PLACEHOLDER];
  }, [primaryImage, images]);

  const totalImages = imagesList.length;
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Lazy loading: only load current and adjacent slide indices
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(() => new Set([0]));

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
    duration: 20,
    watchDrag: totalImages > 1,
  });

  // Reset active slide index when car ID or images change
  useEffect(() => {
    setSelectedIndex(0);
    setLoadedIndices(new Set([0]));
    if (emblaApi) {
      emblaApi.scrollTo(0, true);
    }
  }, [carId, imagesList, emblaApi]);

  // Sync Embla scroll state with React state
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const snap = emblaApi.selectedScrollSnap();
    setSelectedIndex(snap);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Preload neighboring images in carousel window
  useEffect(() => {
    setLoadedIndices((prev) => {
      const updated = new Set(prev);
      updated.add(selectedIndex);
      if (selectedIndex + 1 < totalImages) updated.add(selectedIndex + 1);
      if (selectedIndex - 1 >= 0) updated.add(selectedIndex - 1);
      return updated;
    });

    const candidateUrls = [
      imagesList[selectedIndex + 1],
      imagesList[selectedIndex - 1],
    ].filter(Boolean);

    if (candidateUrls.length > 0) {
      prefetchImages(candidateUrls);
    }
  }, [selectedIndex, totalImages, imagesList]);

  // Desktop Prev & Next navigation
  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Robust gesture vs click discrimination
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  // If Embla is scrolled by user gesture, flag to suppress click
  useEffect(() => {
    if (!emblaApi) return;
    const onEmblaScroll = () => {
      suppressClickUntilRef.current = Date.now() + 350;
      isDraggingRef.current = true;
    };
    emblaApi.on('scroll', onEmblaScroll);
    return () => {
      emblaApi.off('scroll', onEmblaScroll);
    };
  }, [emblaApi]);

  const handlePointerDown = (e: React.PointerEvent) => {
    startPosRef.current = { x: e.clientX, y: e.clientY };
    dragDistanceRef.current = 0;
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    const dist = Math.hypot(dx, dy);
    dragDistanceRef.current = Math.max(dragDistanceRef.current, dist);
    if (dist > 8) {
      isDraggingRef.current = true;
    }
  };

  const handlePointerUp = () => {
    if (isDraggingRef.current || dragDistanceRef.current > 8) {
      suppressClickUntilRef.current = Date.now() + 350;
    }
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent event from bubbling up to outer card wrapper
    e.stopPropagation();

    if (
      isDraggingRef.current ||
      dragDistanceRef.current > 8 ||
      Date.now() < suppressClickUntilRef.current
    ) {
      isDraggingRef.current = false;
      dragDistanceRef.current = 0;
      return;
    }

    // Clean tap -> open car details
    onCardClick();
  };

  return (
    <div
      className="relative aspect-[4/3] bg-slate-100 overflow-hidden flex items-center justify-center select-none"
      title={`${safeTitle} - Ətraflı baxmaq üçün klikləyin`}
      aria-roledescription="carousel"
      aria-label={`${safeTitle} şəkilləri`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      {/* Embla Viewport */}
      <div
        ref={emblaRef}
        className="overflow-hidden w-full h-full cursor-pointer"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex h-full w-full touch-pan-y will-change-transform">
          {imagesList.map((url, idx) => (
            <CardSlideItem
              key={`${idx}-${url}`}
              src={getValidImageUrl(url)}
              idx={idx}
              totalImages={totalImages}
              safeTitle={safeTitle}
              isPriority={priority}
              shouldLoad={loadedIndices.has(idx)}
            />
          ))}
        </div>
      </div>

      {/* Desktop Prev & Next Arrows (Hover-only, clean and unobtrusive) */}
      {totalImages > 1 && (
        <>
          {selectedIndex > 0 && (
            <button
              type="button"
              onClick={scrollPrev}
              className="hidden sm:flex absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 hover:bg-black/80 text-white items-center justify-center z-20 cursor-pointer shadow-md active:scale-95 transition-all opacity-0 group-hover:opacity-100 duration-150"
              title="Əvvəlki şəkil"
              aria-label="Əvvəlki şəkil"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
          )}

          {selectedIndex < totalImages - 1 && (
            <button
              type="button"
              onClick={scrollNext}
              className="hidden sm:flex absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 hover:bg-black/80 text-white items-center justify-center z-20 cursor-pointer shadow-md active:scale-95 transition-all opacity-0 group-hover:opacity-100 duration-150"
              title="Növbəti şəkil"
              aria-label="Növbəti şəkil"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          )}
        </>
      )}

      {/* Overlays (Favorite button, baseLength pill) */}
      {children}
    </div>
  );
};
