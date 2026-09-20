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
  disabledKeyNav: _disabledKeyNav,
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

  // Synchronous index ref to prevent rapid-click stale state issues (Issue 3)
  const currentIndexRef = useRef(activeImageIndex);
  useEffect(() => {
    currentIndexRef.current = activeImageIndex;
  }, [activeImageIndex]);

  // States & Refs for smooth Turbo.az touch & mouse slider
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentTranslateRef = useRef(0);
  const diffRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const isHorizontalDragRef = useRef<boolean | null>(null);

  // Touch vs synthetic click tracking (Fixes Issue 3 conflict)
  const lastTouchTimeRef = useRef(0);
  const lastDoubleTapTimeRef = useRef(0);

  // Zoom states for Turbo.az pinch-to-zoom and double-tap zoom
  const [scale, setScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const scaleRef = useRef(1);
  const isZoomedRef = useRef(false);
  const panRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pinch tracking
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const isPinchingRef = useRef(false);

  // Pan tracking when zoomed
  const panStartXRef = useRef(0);
  const panStartYRef = useRef(0);
  const panStartPosRef = useRef({ x: 0, y: 0 });
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchStartTimeRef = useRef(0);
  const isTouchOnControlRef = useRef(false);

  // Reset zoom on active slide change
  useEffect(() => {
    setScale(1);
    scaleRef.current = 1;
    setIsZoomed(false);
    isZoomedRef.current = false;
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
  }, [activeImageIndex]);

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

  // Helper to jump immediately to a slide without fly-through sliding transition (Issue 2)
  const applyPositionWithoutTransition = useCallback((targetIndex: number) => {
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (!trackRef.current || width <= 0) return;
    const track = trackRef.current;
    track.classList.add('no-transition');
    track.style.setProperty('transition', 'none', 'important');
    track.style.transform = `translateX(${-targetIndex * width}px)`;
    void track.offsetWidth; // Force reflow
    track.classList.remove('no-transition');
    track.style.removeProperty('transition');
  }, [containerWidth]);

  // Navigate to slide with clean boundary handling (Issue 2: Generalized jump fix)
  const goToSlide = useCallback((newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(totalImages - 1, newIndex));
    const prevIndex = currentIndexRef.current;
    currentIndexRef.current = clampedIndex;
    onIndexChange(clampedIndex);

    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (!trackRef.current || width <= 0) return;

    const track = trackRef.current;
    const isJump =
      Math.abs(clampedIndex - prevIndex) > 1 ||
      (prevIndex === totalImages - 1 && clampedIndex === 0) ||
      (prevIndex === 0 && clampedIndex === totalImages - 1);

    if (isJump) {
      // Clean non-sliding jump for wraps and multi-step jumps
      applyPositionWithoutTransition(clampedIndex);
    } else {
      // Normal adjacent sliding: 100% UNTOUCHED
      // Uses the exact existing CSS transition: transform 350ms cubic-bezier(0.25, 0.1, 0.25, 1)
      track.style.transform = `translateX(${-clampedIndex * width}px)`;
    }
  }, [totalImages, onIndexChange, containerWidth, applyPositionWithoutTransition]);

  // Button navigation (synchronous sequential steps using currentIndexRef)
  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isZoomedRef.current) {
      setScale(1);
      scaleRef.current = 1;
      setIsZoomed(false);
      isZoomedRef.current = false;
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
    }
    const current = currentIndexRef.current;
    if (current > 0) {
      goToSlide(current - 1);
    } else if (totalImages > 1) {
      goToSlide(totalImages - 1);
    }
  }, [totalImages, goToSlide]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isZoomedRef.current) {
      setScale(1);
      scaleRef.current = 1;
      setIsZoomed(false);
      isZoomedRef.current = false;
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
    }
    const current = currentIndexRef.current;
    if (current < totalImages - 1) {
      goToSlide(current + 1);
    } else if (totalImages > 1) {
      goToSlide(0);
    }
  }, [totalImages, goToSlide]);

  const prevSyncedIndexRef = useRef(activeImageIndex);

  // Synchronize track position when activeImageIndex or containerWidth changes (when not dragging)
  // Generalizes the jump fix to ANY jump > 1 or external prop change (grid / lightbox thumbnail clicks / hover preview)
  useEffect(() => {
    const prevIndex = prevSyncedIndexRef.current;
    prevSyncedIndexRef.current = activeImageIndex;
    const wasExternalChange = currentIndexRef.current !== activeImageIndex;
    currentIndexRef.current = activeImageIndex;

    if (isDraggingRef.current) return;
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (!trackRef.current || width <= 0) return;

    const isJump =
      Math.abs(activeImageIndex - prevIndex) > 1 ||
      (prevIndex === totalImages - 1 && activeImageIndex === 0) ||
      (prevIndex === 0 && activeImageIndex === totalImages - 1) ||
      wasExternalChange;

    if (isJump) {
      applyPositionWithoutTransition(activeImageIndex);
    } else {
      trackRef.current.style.transform = `translateX(${-activeImageIndex * width}px)`;
    }
  }, [activeImageIndex, containerWidth, totalImages, applyPositionWithoutTransition]);

  // On Drag Start for Slider Track
  const onDragStart = useCallback((clientX: number, clientY: number) => {
    if (totalImages <= 1) return;
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (width <= 0) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = clientX;
    startYRef.current = clientY;
    diffRef.current = 0;
    dragStartTimeRef.current = Date.now();
    isHorizontalDragRef.current = null;
    currentTranslateRef.current = -currentIndexRef.current * width;

    if (trackRef.current) {
      trackRef.current.classList.add('dragging');
    }
  }, [totalImages, containerWidth]);

  // On Drag Move for Slider Track
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
        trackRef.current.style.transform = `translateX(${-currentIndexRef.current * width}px)`;
      }
      isDraggingRef.current = false;
      setIsDragging(false);
      return;
    }

    if (isHorizontalDragRef.current === true && e && e.cancelable) {
      e.preventDefault();
    }

    let diff = dx;
    const currentIdx = currentIndexRef.current;
    // Rubber-band resistance if dragging past first or last slide
    if (currentIdx === 0 && diff > 0) {
      diff = diff * 0.35;
    } else if (currentIdx === totalImages - 1 && diff < 0) {
      diff = diff * 0.35;
    }

    diffRef.current = diff;

    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${currentTranslateRef.current + diff}px)`;
    }
  }, [totalImages, containerWidth]);

  // On Drag End for Slider Track (Issue 3: boundary wrap-around navigation)
  const onDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    const diff = diffRef.current;
    const currentIdx = currentIndexRef.current;
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    const threshold = width * 0.25;

    if (trackRef.current) {
      trackRef.current.classList.remove('dragging');
    }

    const elapsed = Date.now() - dragStartTimeRef.current;
    const isBoundary =
      (currentIdx === totalImages - 1 && diff < 0) ||
      (currentIdx === 0 && diff > 0);
    const effectiveThreshold = isBoundary ? threshold * 0.45 : threshold;
    const isQuickFlick = elapsed < 320 && Math.abs(diff) > (isBoundary ? 20 : 35);

    if (Math.abs(diff) < effectiveThreshold && !isQuickFlick) {
      // Snap back smoothly if gesture threshold is not reached
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${-currentIdx * width}px)`;
      }
    } else {
      // Go to next or prev
      if (diff < 0) {
        // Next slide (wrap around to first image when swiping past the last image)
        if (currentIdx < totalImages - 1) {
          goToSlide(currentIdx + 1);
        } else if (totalImages > 1) {
          goToSlide(0);
        } else {
          if (trackRef.current) {
            trackRef.current.style.transform = `translateX(${-currentIdx * width}px)`;
          }
        }
      } else {
        // Prev slide (wrap around to last image when swiping before the first image)
        if (currentIdx > 0) {
          goToSlide(currentIdx - 1);
        } else if (totalImages > 1) {
          goToSlide(totalImages - 1);
        } else {
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
  }, [totalImages, containerWidth, goToSlide]);

  const onDragCancel = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    const width = containerRef.current ? containerRef.current.clientWidth : containerWidth;
    if (trackRef.current) {
      trackRef.current.classList.remove('dragging');
      trackRef.current.style.transform = `translateX(${-currentIndexRef.current * width}px)`;
    }
    diffRef.current = 0;
    isHorizontalDragRef.current = null;
  }, [containerWidth]);

  // Touch listener attached with non-passive touchmove for gesture control & zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Issue 1: If touch starts on a button or control, ignore so control handles it directly
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('button') ||
          target.closest('#btn-all-photos-grid') ||
          target.closest('#badge-detail-image-counter'))
      ) {
        isTouchOnControlRef.current = true;
        return;
      }
      isTouchOnControlRef.current = false;

      // Pinch-zoom with 2 fingers
      if (e.touches.length === 2) {
        e.preventDefault();
        onDragCancel();
        pinchStartDistRef.current = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        pinchStartScaleRef.current = scaleRef.current;
        isPinchingRef.current = true;
        isDraggingRef.current = true;
        setIsDragging(true);
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        touchStartTimeRef.current = Date.now();

        // When zoomed, 1 finger pans the zoomed image, NOT changing slide
        if (scaleRef.current > 1.05) {
          isDraggingRef.current = true;
          setIsDragging(true);
          panStartXRef.current = touch.clientX;
          panStartYRef.current = touch.clientY;
          panStartPosRef.current = { ...panRef.current };
          return;
        }

        // Standard slider swipe
        onDragStart(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isTouchOnControlRef.current) return;

      // Pinching with 2 fingers
      if (e.touches.length === 2 && isPinchingRef.current) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        if (pinchStartDistRef.current > 0) {
          let newScale = pinchStartScaleRef.current * (currentDist / pinchStartDistRef.current);
          newScale = Math.max(1, Math.min(3.5, newScale));
          scaleRef.current = newScale;
          setScale(newScale);
          if (newScale > 1.05) {
            isZoomedRef.current = true;
            setIsZoomed(true);
          } else {
            isZoomedRef.current = false;
            setIsZoomed(false);
            setPan({ x: 0, y: 0 });
            panRef.current = { x: 0, y: 0 };
          }
        }
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];

        // When zoomed, pan within the zoomed image
        if (scaleRef.current > 1.05) {
          e.preventDefault();
          const dx = touch.clientX - panStartXRef.current;
          const dy = touch.clientY - panStartYRef.current;

          const containerH = container.clientHeight || 400;
          const maxX = Math.max(0, (containerWidth * (scaleRef.current - 1)) / 2);
          const maxY = Math.max(0, (containerH * (scaleRef.current - 1)) / 2);

          const newPanX = Math.max(-maxX, Math.min(maxX, panStartPosRef.current.x + dx));
          const newPanY = Math.max(-maxY, Math.min(maxY, panStartPosRef.current.y + dy));

          panRef.current = { x: newPanX, y: newPanY };
          setPan({ x: newPanX, y: newPanY });
          return;
        }

        // Standard slider drag
        onDragMove(touch.clientX, touch.clientY, e);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Issue 1: If touch was on a button or control, exit immediately
      if (isTouchOnControlRef.current) {
        isTouchOnControlRef.current = false;
        return;
      }

      lastTouchTimeRef.current = Date.now();

      // Pinch end
      if (isPinchingRef.current) {
        isPinchingRef.current = false;
        isDraggingRef.current = false;
        setIsDragging(false);
        if (scaleRef.current <= 1.05) {
          setScale(1);
          scaleRef.current = 1;
          setIsZoomed(false);
          isZoomedRef.current = false;
          setPan({ x: 0, y: 0 });
          panRef.current = { x: 0, y: 0 };
        }
        return;
      }

      const touch = e.changedTouches[0];
      const now = Date.now();
      const distFromStart = touch
        ? Math.hypot(touch.clientX - touchStartPosRef.current.x, touch.clientY - touchStartPosRef.current.y)
        : 0;

      // When zoomed in (scale > 1.05)
      if (scaleRef.current > 1.05) {
        // Double-tap to zoom out
        if (distFromStart < 15 && (now - touchStartTimeRef.current < 320)) {
          if (now - lastTapRef.current < 320) {
            e.preventDefault();
            lastDoubleTapTimeRef.current = now;
            lastTapRef.current = 0;
            if (singleTapTimeoutRef.current) {
              clearTimeout(singleTapTimeoutRef.current);
              singleTapTimeoutRef.current = null;
            }

            // Zoom out to 1x
            setScale(1);
            scaleRef.current = 1;
            setIsZoomed(false);
            isZoomedRef.current = false;
            setPan({ x: 0, y: 0 });
            panRef.current = { x: 0, y: 0 };
            isDraggingRef.current = false;
            setIsDragging(false);
            onDragCancel();
            return;
          } else {
            lastTapRef.current = now;
          }
        }

        // ISSUE 4: Detect swipe-to-navigate while zoomed
        // If the user makes a clear, deliberate horizontal swipe gesture, switch slides and reset zoom to 1x
        if (touch && totalImages > 1) {
          const dx = touch.clientX - touchStartPosRef.current.x;
          const dy = touch.clientY - touchStartPosRef.current.y;
          const dt = Math.max(1, now - touchStartTimeRef.current);
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          const speedX = absDx / dt;

          const isHorizontalMotion = absDx >= absDy * 1.5 && absDy < 80;
          const isQuickFlick = absDx >= 45 && dt < 350 && speedX >= 0.35;
          const isSubstantialSwipe = absDx >= 85 && dt < 650 && absDx >= absDy * 2;

          if (isHorizontalMotion && (isQuickFlick || isSubstantialSwipe)) {
            // Reset zoom back to 1x for the newly selected image
            setScale(1);
            scaleRef.current = 1;
            setIsZoomed(false);
            isZoomedRef.current = false;
            setPan({ x: 0, y: 0 });
            panRef.current = { x: 0, y: 0 };
            isDraggingRef.current = false;
            setIsDragging(false);

            if (dx < 0) {
              handleNext();
            } else {
              handlePrev();
            }
            return;
          }
        }

        isDraggingRef.current = false;
        setIsDragging(false);
        return;
      }

      // When not zoomed (scale <= 1.05)
      // Double-tap to zoom in with focal-point targeting (Issue 2)
      if (distFromStart < 15 && (now - touchStartTimeRef.current < 320)) {
        if (now - lastTapRef.current < 320) {
          // Double-tap confirmed! Strictly prevent single tap navigation/click
          e.preventDefault();
          lastDoubleTapTimeRef.current = now;
          lastTapRef.current = 0;
          if (singleTapTimeoutRef.current) {
            clearTimeout(singleTapTimeoutRef.current);
            singleTapTimeoutRef.current = null;
          }

          // Focal-point zoom: calculate pan so tapped point is centered in zoomed view
          const targetScale = 2.5;
          let initialPanX = 0;
          let initialPanY = 0;

          if (container && touch) {
            const rect = container.getBoundingClientRect();
            const tapX = touch.clientX - rect.left;
            const tapY = touch.clientY - rect.top;
            const containerW = rect.width || containerWidth || 400;
            const containerH = rect.height || container.clientHeight || 400;

            const deltaX = tapX - containerW / 2;
            const deltaY = tapY - containerH / 2;

            const rawPanX = -deltaX * (targetScale - 1);
            const rawPanY = -deltaY * (targetScale - 1);

            const maxX = Math.max(0, (containerW * (targetScale - 1)) / 2);
            const maxY = Math.max(0, (containerH * (targetScale - 1)) / 2);

            initialPanX = Math.max(-maxX, Math.min(maxX, rawPanX));
            initialPanY = Math.max(-maxY, Math.min(maxY, rawPanY));
          }

          // Zoom in to 2.5x with focal point
          setScale(targetScale);
          scaleRef.current = targetScale;
          setIsZoomed(true);
          isZoomedRef.current = true;
          setPan({ x: initialPanX, y: initialPanY });
          panRef.current = { x: initialPanX, y: initialPanY };

          onDragCancel();
          return;
        } else {
          lastTapRef.current = now;
          // Trigger onImageClick ONLY if a second tap does NOT follow within 300ms (and not in lightbox)
          if (!isZoomedRef.current && !isLightbox && onImageClick) {
            if (singleTapTimeoutRef.current) {
              clearTimeout(singleTapTimeoutRef.current);
            }
            const clickIdx = currentIndexRef.current;
            singleTapTimeoutRef.current = setTimeout(() => {
              if (Date.now() - lastDoubleTapTimeRef.current > 500) {
                onImageClick(clickIdx);
              }
              singleTapTimeoutRef.current = null;
            }, 300);
          }
        }
      }

      onDragEnd();
    };

    const handleTouchCancel = () => {
      if (isTouchOnControlRef.current) {
        isTouchOnControlRef.current = false;
        return;
      }

      lastTouchTimeRef.current = Date.now();
      isPinchingRef.current = false;
      isDraggingRef.current = false;
      setIsDragging(false);
      onDragCancel();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [containerWidth, onDragStart, onDragMove, onDragEnd, onDragCancel, isLightbox, onImageClick, totalImages, handleNext, handlePrev]);

  // Desktop Mouse Drag Handling (Standard drag only; desktop has no zoom capability - Issue 1)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left-click

    // Ignore drag start if clicking buttons or controls
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('#badge-detail-image-counter')) {
      return;
    }

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

  // Slide click handler (Desktop lightbox navigation / click to open modal)
  const handleSlideClick = (index: number, e: React.MouseEvent) => {
    // If click is synthetic from a touch event or occurred right after a double tap, ignore it! (Issue 3)
    const isSyntheticTouchClick =
      Date.now() - lastTouchTimeRef.current < 700 ||
      Date.now() - lastDoubleTapTimeRef.current < 1000;

    if (isSyntheticTouchClick) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (Math.abs(diffRef.current) >= 6 || isZoomed || scaleRef.current > 1.05) {
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
      className={`relative select-none overflow-hidden block ${
        isLightbox
          ? 'h-full w-full flex-1 min-h-0 bg-black cursor-default'
          : `group ${className || 'bg-black w-full aspect-[4/3] md:aspect-auto md:h-[500px] mx-auto flex items-center justify-center'} ${
              isZoomed ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'
            }`
      }`}
      style={{ backgroundColor: '#000000', touchAction: isZoomed ? 'none' : 'pan-y' }}
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
          const isActiveSlide = index === activeImageIndex;

          return (
            <div
              key={`${index}-${imgSrc}`}
              onClick={(e) => handleSlideClick(index, e)}
              className="w-full h-full shrink-0 flex items-center justify-center overflow-hidden relative bg-black select-none"
              style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%' }}
            >
              <img
                src={getValidImageUrl(imgSrc)}
                alt={`${safeTitle} - ${index + 1}`}
                loading={Math.abs(index - activeImageIndex) <= 1 ? 'eager' : 'lazy'}
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
                  transform: isActiveSlide && isZoomed
                    ? `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${scale})`
                    : 'scale(1)',
                  transition: isDragging ? 'none' : 'transform 300ms ease',
                  transformOrigin: 'center center',
                  willChange: 'transform',
                }}
              />
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
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
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

      {/* Turbo.az Desktop Ox Düymələri (Desktop button-only navigation, Issue 1) */}
      {totalImages > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
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
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
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
