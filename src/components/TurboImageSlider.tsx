import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { DEFAULT_VEHICLE_PLACEHOLDER, getValidImageUrl, handleImageLoadError } from '../utils/imageFallback';

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

  // Embla Carousel with true infinite loop mode (zero rewind)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: totalImages > 1,
    skipSnaps: false,
    duration: 25,
    startIndex: activeImageIndex || 0,
    watchDrag: totalImages > 1,
  });

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

  // Preload neighboring images to ensure seamless, zero-flicker transitions
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(() => {
    const current = activeImageIndex || 0;
    const initial = new Set<number>([current]);
    if (totalImages > 1) {
      initial.add((current + 1) % totalImages);
      initial.add((current - 1 + totalImages) % totalImages);
    }
    return initial;
  });

  useEffect(() => {
    setLoadedIndices((prev) => {
      const nextIdx = (activeImageIndex + 1) % totalImages;
      const prevIdx = (activeImageIndex - 1 + totalImages) % totalImages;

      if (prev.has(activeImageIndex) && prev.has(nextIdx) && prev.has(prevIdx)) {
        return prev;
      }
      const updated = new Set(prev);
      updated.add(activeImageIndex);
      if (totalImages > 1) {
        updated.add(nextIdx);
        updated.add(prevIdx);
      }
      return updated;
    });
  }, [activeImageIndex, totalImages]);

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

  // Open Lightbox only when clicked without dragging, synchronizing clicked index
  const handleSlideClick = useCallback((slideIndex: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragDistanceRef.current < 8) {
      onIndexChange(slideIndex);
      if (onImageClick) {
        onImageClick(slideIndex);
      }
    }
  }, [onImageClick, onIndexChange]);

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
        className="overflow-hidden w-full h-full cursor-grab active:cursor-grabbing bg-black" 
        ref={emblaRef}
      >
        <div 
          className="flex h-full w-full touch-pan-y will-change-transform bg-black"
        >
          {displaySlides.map((slide, index) => {
            const isPreloadAllowed = loadedIndices.has(slide.originalIndex);
            const imgSrc = isPreloadAllowed ? slide.src : null;

            return (
              <div
                key={`${slide.originalIndex}-${index}`}
                onClick={handleSlideClick(slide.originalIndex)}
                className="flex-[0_0_100%] min-w-0 h-full w-full relative overflow-hidden p-0 m-0 flex items-center justify-center cursor-pointer bg-black"
                style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={`${safeTitle} - ${slide.originalIndex + 1}`}
                    loading={slide.originalIndex === activeImageIndex ? 'eager' : 'lazy'}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectPosition: 'center',
                    }}
                    className={`w-full h-full select-none pointer-events-none relative z-10 block mx-auto object-center drop-shadow-md ${
                      isLightbox 
                        ? 'object-contain p-2 sm:p-4' 
                        : 'object-cover md:object-contain p-0 md:p-2'
                    }`}
                    onError={(e) => {
                      handleImageLoadError(e.currentTarget);
                    }}
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center bg-black" 
                    style={{ backgroundColor: '#000000' }}
                  />
                )}
              </div>
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
