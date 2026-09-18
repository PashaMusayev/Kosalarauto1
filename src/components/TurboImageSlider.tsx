import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // States & Refs for smooth Turbo.az touch & mouse slider
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentTranslateRef = useRef(0);
  const diffRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const isHorizontalDragRef = useRef<boolean | null>(null);

  // Measure container width with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      if (container) {
        const w = container.clientWidth;
        if (w > 0) {
          setContainerWidth(w);
        }
      }
    };

    updateWidth();

    const ro = new ResizeObserver(() => {
      updateWidth();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, []);

  // Preload neighboring images in background
  useEffect(() => {
    if (totalImages > 0) {
      prefetchCarouselWindow(imagesList, activeImageIndex);
    }
  }, [imagesList, activeImageIndex, totalImages]);

  // Navigate to slide
  const goToSlide = useCallback((newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(totalImages - 1, newIndex));
    onIndexChange(clampedIndex);
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (trackRef.current && width > 0) {
      trackRef.current.style.transform = `translateX(${-clampedIndex * width}px)`;
    }
  }, [totalImages, onIndexChange, containerWidth]);

  // Synchronize track position when activeImageIndex or containerWidth changes (when not dragging)
  useEffect(() => {
    if (isDraggingRef.current) return;
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (trackRef.current && width > 0) {
      trackRef.current.style.transform = `translateX(${-activeImageIndex * width}px)`;
    }
  }, [activeImageIndex, containerWidth]);

  // On Drag Start
  const onDragStart = useCallback((clientX: number, clientY: number) => {
    if (totalImages <= 1) return;
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (width <= 0) return;

    isDraggingRef.current = true;
    startXRef.current = clientX;
    startYRef.current = clientY;
    diffRef.current = 0;
    dragStartTimeRef.current = Date.now();
    isHorizontalDragRef.current = null;
    currentTranslateRef.current = -activeImageIndex * width;

    if (trackRef.current) {
      trackRef.current.classList.add('dragging');
    }
  }, [activeImageIndex, totalImages, containerWidth]);

  // On Drag Move
  const onDragMove = useCallback((clientX: number, clientY: number, e?: TouchEvent | MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;

    // Detect direction intent on first few pixels
    if (isHorizontalDragRef.current === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        isHorizontalDragRef.current = Math.abs(dx) >= Math.abs(dy);
      }
    }

    // User is scrolling vertically, cancel slider drag so page scrolls natively
    if (isHorizontalDragRef.current === false) {
      if (trackRef.current) {
        trackRef.current.classList.remove('dragging');
        const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
        trackRef.current.style.transform = `translateX(${-activeImageIndex * width}px)`;
      }
      isDraggingRef.current = false;
      return;
    }

    if (isHorizontalDragRef.current === true && e && e.cancelable) {
      e.preventDefault();
    }

    let diff = dx;
    // Rubber-band resistance if dragging past first or last slide
    if (activeImageIndex === 0 && diff > 0) {
      diff = diff * 0.35;
    } else if (activeImageIndex === totalImages - 1 && diff < 0) {
      diff = diff * 0.35;
    }

    diffRef.current = diff;

    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${currentTranslateRef.current + diff}px)`;
    }
  }, [activeImageIndex, totalImages, containerWidth]);

  // On Drag End
  const onDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const diff = diffRef.current;
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    const threshold = width * 0.25;

    if (trackRef.current) {
      trackRef.current.classList.remove('dragging');
    }

    const elapsed = Date.now() - dragStartTimeRef.current;
    const isQuickFlick = elapsed < 280 && Math.abs(diff) > 35;

    if (Math.abs(diff) < threshold && !isQuickFlick) {
      // Snap back smoothly
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${-activeImageIndex * width}px)`;
      }
    } else {
      // Go to next or prev
      if (diff < 0) {
        // Next slide
        if (activeImageIndex < totalImages - 1) {
          goToSlide(activeImageIndex + 1);
        } else {
          // At end: snap back with rubber-band recovery
          if (trackRef.current) {
            trackRef.current.style.transform = `translateX(${-activeImageIndex * width}px)`;
          }
        }
      } else {
        // Prev slide
        if (activeImageIndex > 0) {
          goToSlide(activeImageIndex - 1);
        } else {
          // At start: snap back with rubber-band recovery
          if (trackRef.current) {
            trackRef.current.style.transform = `translateX(0px)`;
          }
        }
      }
    }

    // Reset after a brief delay so click handlers can inspect diffRef
    setTimeout(() => {
      diffRef.current = 0;
      isHorizontalDragRef.current = null;
    }, 50);
  }, [activeImageIndex, totalImages, containerWidth, goToSlide]);

  const onDragCancel = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (trackRef.current) {
      trackRef.current.classList.remove('dragging');
      trackRef.current.style.transform = `translateX(${-activeImageIndex * width}px)`;
    }
    diffRef.current = 0;
    isHorizontalDragRef.current = null;
  }, [activeImageIndex, containerWidth]);

  // Attach non-passive touch listeners to container for silky smooth mobile gesture
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        onDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        onDragMove(e.touches[0].clientX, e.touches[0].clientY, e);
      }
    };

    const handleTouchEnd = () => {
      onDragEnd();
    };

    const handleTouchCancel = () => {
      onDragCancel();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onDragStart, onDragMove, onDragEnd, onDragCancel]);

  // Desktop Mouse Drag Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left-click
    onDragStart(e.clientX, e.clientY);

    const handleMouseMove = (me: MouseEvent) => {
      onDragMove(me.clientX, me.clientY, me);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Button navigation
  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (activeImageIndex > 0) {
      goToSlide(activeImageIndex - 1);
    } else if (totalImages > 1) {
      goToSlide(totalImages - 1);
    }
  }, [activeImageIndex, totalImages, goToSlide]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (activeImageIndex < totalImages - 1) {
      goToSlide(activeImageIndex + 1);
    } else if (totalImages > 1) {
      goToSlide(0);
    }
  }, [activeImageIndex, totalImages, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    if (disabledKeyNav || totalImages <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabledKeyNav, totalImages, handlePrev, handleNext]);

  // Slide click handler (Lightbox opening / zoom / next-prev)
  const handleSlideClick = (index: number, e: React.MouseEvent) => {
    // If was dragged, do not trigger click
    if (Math.abs(diffRef.current) >= 6) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (isLightbox) {
      if (totalImages > 1) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = rect.width > 0 ? clickX / rect.width : 0.5;
        if (ratio <= 0.35) {
          handlePrev(e);
        } else if (ratio >= 0.65) {
          handleNext(e);
        }
      }
    } else {
      if (onImageClick) {
        onImageClick(index);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={`relative select-none overflow-hidden block touch-pan-y ${
        isLightbox
          ? 'h-full w-full flex-1 min-h-0 bg-black cursor-default'
          : `group ${className || 'bg-black w-full aspect-[4/3] md:aspect-auto md:h-[500px] mx-auto flex items-center justify-center'} cursor-grab active:cursor-grabbing`
      }`}
      style={{ backgroundColor: '#000000' }}
    >
      {/* Smooth Slider Track */}
      <div
        ref={trackRef}
        className="slider-track flex h-full w-full bg-black"
        style={{
          transform: containerWidth > 0 ? `translateX(${-activeImageIndex * containerWidth}px)` : 'translateX(0px)',
        }}
      >
        {imagesList.map((imgSrc, index) => {
          const isCurrentOrNeighbor =
            index === activeImageIndex ||
            index === (activeImageIndex + 1) % totalImages ||
            index === (activeImageIndex - 1 + totalImages) % totalImages;

          return (
            <div
              key={`${index}-${imgSrc}`}
              onClick={(e) => handleSlideClick(index, e)}
              className="w-full h-full shrink-0 flex items-center justify-center overflow-hidden relative bg-black select-none"
              style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%' }}
            >
              {isCurrentOrNeighbor ? (
                <img
                  src={getValidImageUrl(imgSrc)}
                  alt={`${safeTitle} - ${index + 1}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  onError={(e) => {
                    handleImageLoadError(e.currentTarget);
                  }}
                  className={`select-none pointer-events-none block mx-auto drop-shadow-md ${
                    isLightbox
                      ? 'max-w-full max-h-full object-contain p-2 sm:p-4'
                      : 'w-full h-full object-cover md:object-contain'
                  }`}
                  style={{
                    width: isLightbox ? 'auto' : '100%',
                    height: isLightbox ? 'auto' : '100%',
                    objectPosition: 'center',
                  }}
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                </div>
              )}
            </div>
          );
        })}
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

      {/* Turbo.az Desktop Ox Düymələri */}
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
