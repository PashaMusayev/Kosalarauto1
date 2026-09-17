import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TransitCar } from '../types';
import { WHATSAPP_NUMBER } from '../data/transits';
import { DEFAULT_VEHICLE_PLACEHOLDER } from '../utils/imageFallback';
import { useBodyScrollLock } from '../utils/scrollLock';
import { TurboImageSlider } from './TurboImageSlider';
import { prefetchImages, prefetchCarouselWindow } from '../utils/imagePreloader';

// Subcomponents
import { DetailModalErrorBoundary } from './detail/DetailModalErrorBoundary';
import { 
  formatNumberSafe, 
  formatBrandDisplayName, 
  formatModelDisplayName, 
  parseAndFilterFeatures 
} from './detail/detailUtils';
import { DetailMobileHeader } from './detail/DetailMobileHeader';
import { DetailDesktopSidebar } from './detail/DetailDesktopSidebar';
import { DetailMobileTitleBlock } from './detail/DetailMobileTitleBlock';
import { DetailMobileSpecs } from './detail/DetailMobileSpecs';
import { DetailFeaturesAndShowroom } from './detail/DetailFeaturesAndShowroom';
import { DetailSimilarCars } from './detail/DetailSimilarCars';
import { DetailMobileBottomBar } from './detail/DetailMobileBottomBar';
import { DetailLightbox } from './detail/DetailLightbox';
import { DetailPhotoGrid } from './detail/DetailPhotoGrid';

export { formatBrandDisplayName, formatModelDisplayName };

interface TransitDetailModalProps {
  car: TransitCar | null;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (carId: string) => void;
  allCars?: TransitCar[];
  onSelectCar?: (car: TransitCar) => void;
  favorites?: string[];
}

const TransitDetailModalContent: React.FC<TransitDetailModalProps> = ({
  car,
  onClose,
  isFavorite = false,
  onToggleFavorite,
  allCars = [],
  onSelectCar,
  favorites = []
}) => {
  // Bulletproof Body Scroll Lock when modal is open
  useBodyScrollLock(Boolean(car));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Overlay (grid/lightbox) states
  const [isPhotoGridOpen, setIsPhotoGridOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSource, setLightboxSource] = useState<'detail' | 'grid'>('detail');
  const photoGridScrollPositionRef = useRef<number>(0);

  // Reset active image & scroll to top when car changes
  useEffect(() => {
    setActiveImageIndex(0);
    setCopied(false);
    setIsPhotoGridOpen(false);
    setIsLightboxOpen(false);
    setLightboxSource('detail');
    photoGridScrollPositionRef.current = 0;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
      scrollContainerRef.current.scrollTop = 0;
    }
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    });
  }, [car?.id]);

  // Safe Image Array Extraction
  const imagesList = useMemo(() => {
    if (!car) return [];
    const list: string[] = [];
    
    // Add primaryImage first if valid
    if (car?.primaryImage && typeof car.primaryImage === 'string' && car.primaryImage.trim().length > 0) {
      list.push(car.primaryImage.trim());
    }

    // Add secondary images safely
    if (car?.images && Array.isArray(car.images)) {
      for (const img of car.images) {
        if (typeof img === 'string' && img.trim().length > 0 && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      }
    }

    return list.length > 0 ? list : [DEFAULT_VEHICLE_PLACEHOLDER];
  }, [car]);

  // Arxa fonda şəkil preloading: İlk 4 şəkli dərhal əvvəlcədən yüklə
  useEffect(() => {
    if (imagesList && imagesList.length > 0) {
      prefetchImages(imagesList.slice(0, 4));
    }
  }, [imagesList]);

  // Aktiv şəkil dəyişdikdə: Növbəti 2 və əvvəlki 1 şəkli arxa fonda təmin et
  useEffect(() => {
    if (imagesList && imagesList.length > 0) {
      prefetchCarouselWindow(imagesList, activeImageIndex);
    }
  }, [imagesList, activeImageIndex]);

  // URL və tarixçə ilə sinxronizasiya (həm açılışda, həm də popstate zamanı)
  const syncOverlaysFromUrl = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const overlayParam = params.get('overlay');
      const photoParam = params.get('photo');
      const state = window.history.state || {};

      if (photoParam !== null || state.overlay === 'lightbox') {
        if (photoParam !== null) {
          const photoIdx = parseInt(photoParam, 10);
          if (!isNaN(photoIdx) && photoIdx >= 0) {
            setActiveImageIndex(photoIdx);
          }
        }
        setIsLightboxOpen(true);
        setIsPhotoGridOpen(false);
        if (overlayParam === 'grid' || state.from === 'grid') {
          setLightboxSource('grid');
        } else {
          setLightboxSource('detail');
        }
      } else if (overlayParam === 'grid' || state.overlay === 'grid') {
        setIsPhotoGridOpen(true);
        setIsLightboxOpen(false);
      } else {
        setIsLightboxOpen(false);
        setIsPhotoGridOpen(false);
        photoGridScrollPositionRef.current = 0;
      }
    } catch (e) {
      setIsLightboxOpen(false);
      setIsPhotoGridOpen(false);
      photoGridScrollPositionRef.current = 0;
    }
  }, []);

  const isHistoryNavigatingRef = useRef<boolean>(false);

  useEffect(() => {
    syncOverlaysFromUrl();
    const handleOverlayPopState = () => {
      isHistoryNavigatingRef.current = false;
      syncOverlaysFromUrl();
    };
    window.addEventListener('popstate', handleOverlayPopState);
    return () => window.removeEventListener('popstate', handleOverlayPopState);
  }, [syncOverlaysFromUrl]);

  // Overlay (grid/lightbox) açılışlarını və bağlanışlarını dəqiq idarə edir
  const openPhotoGrid = useCallback(() => {
    isHistoryNavigatingRef.current = false;
    prefetchImages(imagesList);
    photoGridScrollPositionRef.current = 0;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('overlay', 'grid');
      url.searchParams.delete('photo');
      window.history.pushState({ carModal: true, overlay: 'grid' }, '', url.toString());
    } catch (e) {}
    setIsPhotoGridOpen(true);
    setIsLightboxOpen(false);
  }, [imagesList]);

  const closePhotoGrid = useCallback(() => {
    photoGridScrollPositionRef.current = 0;
    if (isHistoryNavigatingRef.current) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('overlay') === 'grid' || window.history.state?.overlay === 'grid') {
        isHistoryNavigatingRef.current = true;
        window.history.back();
        setTimeout(() => {
          isHistoryNavigatingRef.current = false;
        }, 150);
        return;
      }
    } catch (e) {}
    setIsPhotoGridOpen(false);
  }, []);

  const openLightbox = useCallback((source: 'detail' | 'grid' = 'detail', index?: number) => {
    isHistoryNavigatingRef.current = false;
    const targetIdx = typeof index === 'number' ? index : activeImageIndex;
    setLightboxSource(source);
    try {
      const url = new URL(window.location.href);
      if (source === 'grid') {
        url.searchParams.set('overlay', 'grid');
      } else {
        url.searchParams.delete('overlay');
      }
      url.searchParams.set('photo', String(targetIdx));
      window.history.pushState({ carModal: true, overlay: 'lightbox', from: source, photo: targetIdx }, '', url.toString());
    } catch (e) {}
    setIsLightboxOpen(true);
    setIsPhotoGridOpen(false);
  }, [activeImageIndex]);

  const closeLightbox = useCallback(() => {
    if (isHistoryNavigatingRef.current) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('photo') || window.history.state?.overlay === 'lightbox') {
        isHistoryNavigatingRef.current = true;
        window.history.back();
        setTimeout(() => {
          isHistoryNavigatingRef.current = false;
        }, 150);
        return;
      }
    } catch (e) {}
    setIsLightboxOpen(false);
  }, []);

  // Lightbox-da şəkil dəyişdikdə URL-dəki 'photo' parametrini replaceState ilə yenilə
  const handleLightboxIndexChange = useCallback((newIndex: number) => {
    setActiveImageIndex(newIndex);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('photo', String(newIndex));
      window.history.replaceState({ carModal: true, overlay: 'lightbox', from: lightboxSource, photo: newIndex }, '', url.toString());
    } catch (e) {}
  }, [lightboxSource]);

  // Grid-dən şəkil seçiləndə: grid qeydi tarixçədə qalır, üstünə lightbox əlavə olunur
  const handleSelectPhotoFromGrid = useCallback((index: number) => {
    setActiveImageIndex(index);
    openLightbox('grid', index);
  }, [openLightbox]);

  // Keyboard navigation (Escape to close lightbox, photo grid or modal)
  useEffect(() => {
    if (!car) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Prevent key-repeat if user holds down Escape
        if (e.repeat) return;

        // If a history pop is already in-flight, ignore until popstate resolves to avoid double-popping
        if (isHistoryNavigatingRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (isLightboxOpen) {
          closeLightbox();
        } else if (isPhotoGridOpen) {
          closePhotoGrid();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [car?.id, isLightboxOpen, isPhotoGridOpen, closeLightbox, closePhotoGrid, onClose]);

  // Check if car object is valid
  if (!car) return null;

  // Safe fallback values
  const safeTitle = car?.title || 'Ford Transit';
  const safeMake = formatBrandDisplayName(car?.brand || car?.make, car?.title);
  const safeModel = formatModelDisplayName(car?.model, car?.title);
  const safeYear = car?.year ? String(car.year) : '';
  const safePrice = formatNumberSafe(car?.price, '0');
  const safeMileage = formatNumberSafe(car?.mileage, '0');
  const safeEngine = car?.engine || '2.2';
  const safeFuelType = car?.fuelType || 'Dizel';
  const safeTransmission = car?.transmission || 'Mexanika';
  const safeBodyType = car?.bodyType || 'Yük furqonu';
  const safeColor = car?.color || 'Ağ';
  const safeWheelDrive = car?.wheelDrive || 'Ön çəkən (FWD)';
  const safeBaseLength = car?.baseLength || '3.30 m';
  const safeRoofHeight = car?.roofHeight || 'Orta dam';
  const safeLocation = car?.city || car?.location || 'Bakı';
  const safeCondition = car?.condition || 'Vuruğu yoxdur, rənglənməyib';
  const safeHp = car?.hp ? `${car.hp} a.g.` : '';
  const safeSeatCount = car?.seatCount ? String(car.seatCount).trim() : '';

  // Subtitle format without horsepower
  const engineSubtitle = safeEngine.includes('L') ? safeEngine : `${safeEngine} L`;
  const vehicleMainTitle = `${safeTitle}, ${engineSubtitle}${safeYear ? `, ${safeYear} il` : ''}`;

  // Turbo.az Lightbox details format: e.g. "Mercedes Sprinter, 2.2L, 2012 il, 215 000 km"
  const cleanEngineText = useMemo(() => {
    if (!safeEngine) return '';
    const eng = safeEngine.trim();
    if (eng.toLowerCase().includes('l')) return eng;
    return `${eng}L`;
  }, [safeEngine]);

  const lightboxCarDetails = useMemo(() => {
    const parts = [
      safeTitle,
      cleanEngineText,
      safeYear ? `${safeYear} il` : '',
      safeMileage && safeMileage !== '0' ? `${safeMileage} km` : ''
    ].filter(Boolean);
    return parts.join(', ');
  }, [safeTitle, cleanEngineText, safeYear, safeMileage]);

  const carDirectLink = useMemo(() => {
    if (typeof window === 'undefined' || !car?.id) {
      return `https://kosalarauto.az/?car=${car?.id || ''}`;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('car', car.id);
      return url.toString();
    } catch {
      return `${window.location.origin}/?car=${encodeURIComponent(car.id)}`;
    }
  }, [car?.id]);

  const shareUrl = carDirectLink;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${safeTitle} - Kosalar Auto`,
          text: `${safeTitle} (${safeYear}-ci il) - ${safePrice} AZN. Kosalar Auto:`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
    }
  };

  const whatsappMsg = useMemo(() => {
    const rawLines = [
      `Salam! Kosalar Auto, bu avtomobil haqqında ətraflı məlumat almaq istəyirəm:`,
      ``,
      `🚗 Avtomobil: ${safeTitle}`,
      safeYear ? `📅 İl: ${safeYear}` : '',
      `💰 Qiymət: ${safePrice} AZN`,
      safeMileage && safeMileage !== '0' ? `🛣️ Yürüş: ${safeMileage} km` : '',
      safeEngine ? `⚡ Mühərrik: ${engineSubtitle}` : '',
      car?.vinCode ? `🔢 VIN: ${car.vinCode}` : '',
      ``,
      `🔗 Elanın linki:`,
      carDirectLink
    ];

    const cleanedLines = rawLines.filter(line => typeof line === 'string' && (line !== '' || line === rawLines[1] || line === rawLines[8]));

    return encodeURIComponent(cleanedLines.join('\n'));
  }, [safeTitle, safeYear, safePrice, safeMileage, engineSubtitle, car?.vinCode, carDirectLink]);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`;

  // Safe Features Parser (Only returns active/true features)
  const activeFeaturesList = useMemo(() => {
    return parseAndFilterFeatures(car?.features);
  }, [car?.features]);

  // Turbo.az Style: Similar Cars (Bənzər elanlar) Algorithm
  const similarCars = useMemo(() => {
    if (!allCars || allCars.length === 0 || !car) return [];
    
    // Filter out current car and sold cars
    const activeInventory = allCars.filter(c => c.id !== car.id && c.status !== 'sold');
    if (activeInventory.length === 0) return [];

    const currentBrand = (car.brand || car.make || '').toLowerCase();
    const currentModel = (car.model || '').toLowerCase();
    const currentBody = (car.bodyType || '').toLowerCase();
    const currentFuel = (car.fuelType || '').toLowerCase();
    const currentPrice = car.price || 0;

    const scored = activeInventory.map(item => {
      let score = 0;
      const itemBrand = (item.brand || item.make || '').toLowerCase();
      const itemModel = (item.model || '').toLowerCase();
      const itemBody = (item.bodyType || '').toLowerCase();
      const itemFuel = (item.fuelType || '').toLowerCase();
      const itemPrice = item.price || 0;

      // 1. Same Brand (+50 pts)
      if (currentBrand && itemBrand && (currentBrand === itemBrand || currentBrand.includes(itemBrand) || itemBrand.includes(currentBrand))) {
        score += 50;
      }
      // 2. Same Model (+40 pts)
      if (currentModel && itemModel && (currentModel === itemModel || currentModel.includes(itemModel) || itemModel.includes(currentModel))) {
        score += 40;
      }
      // 3. Same Body Type (+25 pts)
      if (currentBody && itemBody && currentBody === itemBody) {
        score += 25;
      }
      // 4. Same Fuel Type (+15 pts)
      if (currentFuel && itemFuel && currentFuel === itemFuel) {
        score += 15;
      }
      // 5. Close Price Range (+20 pts for <= 20% diff, +10 for <= 40%)
      if (currentPrice > 0 && itemPrice > 0) {
        const diffRatio = Math.abs(currentPrice - itemPrice) / currentPrice;
        if (diffRatio <= 0.2) score += 20;
        else if (diffRatio <= 0.4) score += 10;
      }
      // 6. Base Length match (+10 pts)
      if (car.baseLength && item.baseLength && car.baseLength === item.baseLength) {
        score += 10;
      }

      return { car: item, score };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map(s => s.car);
  }, [allCars, car]);

  const handleSelectSimilarCar = (simCar: TransitCar) => {
    setActiveImageIndex(0);
    setIsPhotoGridOpen(false);
    setIsLightboxOpen(false);
    setLightboxSource('detail');
    photoGridScrollPositionRef.current = 0;

    if (onSelectCar) {
      onSelectCar(simCar);
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
      scrollContainerRef.current.scrollTop = 0;
    }
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    });
  };

  return (
    <>
      {/* Modal Backdrop (Overlay) */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-xs overflow-hidden overscroll-contain touch-pan-y"
        onClick={isPhotoGridOpen || isLightboxOpen ? undefined : onClose}
      >
        {/* Modal Window: Full-width on mobile, rounded card on tablet/desktop */}
        <div 
          className={`bg-white rounded-none md:rounded-2xl shadow-2xl border-0 md:border border-slate-200 max-w-2xl md:max-w-5xl lg:max-w-6xl w-full h-[100dvh] md:h-auto md:max-h-[90vh] max-h-[100dvh] flex flex-col overflow-hidden my-0 md:my-auto relative animate-in fade-in zoom-in-95 duration-200 overscroll-contain ${
            isPhotoGridOpen || isLightboxOpen ? 'pointer-events-none select-none invisible md:visible' : ''
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Sticky Header */}
          <DetailMobileHeader
            onClose={onClose}
            onShare={handleShare}
            copied={copied}
            isFavorite={isFavorite}
            onToggleFavorite={() => {
              if (car?.id && onToggleFavorite) {
                onToggleFavorite(car.id);
              }
            }}
          />

          {/* Modal Scrollable Content */}
          <div ref={scrollContainerRef} className="overflow-y-auto flex-1 min-h-0 bg-white block w-full overscroll-contain">
            {/* RESPONSIVE HERO SECTION */}
            <div className="flex flex-col md:flex-row w-full bg-white border-b border-slate-200">
              {/* Sol Sütun (Şəkil Sahəsi - Desktopda 60% enində, h-[500px], tam qara arxafon) */}
              <div className="w-full md:w-[58%] lg:w-[60%] shrink-0 bg-black flex items-center justify-center overflow-hidden relative">
                <TurboImageSlider
                  key={`modal-slider-${car?.id}`}
                  images={imagesList}
                  activeImageIndex={activeImageIndex}
                  onIndexChange={setActiveImageIndex}
                  safeTitle={safeTitle}
                  onImageClick={(clickedIndex) => {
                    if (typeof clickedIndex === 'number') {
                      setActiveImageIndex(clickedIndex);
                    }
                    openLightbox('detail');
                  }}
                  onOpenPhotoGrid={openPhotoGrid}
                  disabledKeyNav={isLightboxOpen || isPhotoGridOpen}
                  className="w-full aspect-[4/3] md:aspect-auto md:h-[500px] flex items-center justify-center bg-black"
                />
              </div>

              {/* Sağ Sütun (Məlumat və Əlaqə Sahəsi - YALNIZ Desktopda 40% enində) */}
              <DetailDesktopSidebar
                safePrice={safePrice}
                vehicleMainTitle={vehicleMainTitle}
                safeMileage={safeMileage}
                safeLocation={safeLocation}
                safeYear={safeYear}
                safeEngine={safeEngine}
                safeHp={safeHp}
                safeFuelType={safeFuelType}
                safeTransmission={safeTransmission}
                safeWheelDrive={safeWheelDrive}
                safeBodyType={safeBodyType}
                safeSeatCount={safeSeatCount}
                safeBaseLength={safeBaseLength}
                safeCondition={safeCondition}
                whatsappUrl={whatsappUrl}
              />
            </div>

            {/* Məzmun Gövdəsi: Turbo.az strukturu */}
            <div className="p-4 sm:p-5 md:p-6 pb-20 md:pb-6 space-y-4 sm:space-y-5 max-w-5xl mx-auto block w-full">
              {/* 1. BAŞLIQ VƏ QİYMƏT (YALNIZ MOBİLDƏ GÖSTƏRİLİR) */}
              <DetailMobileTitleBlock
                safePrice={safePrice}
                vehicleMainTitle={vehicleMainTitle}
                safeMileage={safeMileage}
              />

              {/* 2. XÜSUSİYYƏTLƏR CƏDVƏLİ (YALNIZ MOBİLDƏ GÖSTƏRİLİR - TURBO.AZ STİLİ) */}
              <DetailMobileSpecs
                safeLocation={safeLocation}
                safeMake={safeMake}
                safeModel={safeModel}
                safeYear={safeYear}
                safeBodyType={safeBodyType}
                safeSeatCount={safeSeatCount}
                safeColor={safeColor}
                safeEngine={safeEngine}
                safeHp={safeHp}
                safeFuelType={safeFuelType}
                safeMileage={safeMileage}
                safeTransmission={safeTransmission}
                safeWheelDrive={safeWheelDrive}
                safeBaseLength={safeBaseLength}
                safeCondition={safeCondition}
              />

              {/* 3. QEYD VƏ TƏSVİR + 4. TƏCHİZAT + AVTOSALON MƏLUMATI */}
              <DetailFeaturesAndShowroom
                description={car?.description}
                activeFeaturesList={activeFeaturesList}
              />

              {/* 5. BƏNZƏR ELANLAR (TURBO.AZ STYLE SIMILAR ADS) */}
              <DetailSimilarCars
                similarCars={similarCars}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
                onSelectSimilarCar={handleSelectSimilarCar}
              />
            </div>
          </div>

          {/* Floating Bottom Action Bar (Zəng et + WhatsApp) - Yalnız Mobil Rejimdə */}
          <DetailMobileBottomBar whatsappUrl={whatsappUrl} />
        </div>
      </div>

      {/* Mobile-only "Bütün şəkillər" Grid Gallery (Turbo.az Style) */}
      <DetailPhotoGrid
        isOpen={isPhotoGridOpen}
        onClose={closePhotoGrid}
        imagesList={imagesList}
        title={vehicleMainTitle || safeTitle}
        onSelectPhoto={handleSelectPhotoFromGrid}
        disabledEscape={isLightboxOpen}
        initialScrollTop={photoGridScrollPositionRef.current}
        onScrollPositionChange={(top) => {
          photoGridScrollPositionRef.current = top;
        }}
      />

      {/* Fullscreen Photo Lightbox (Turbo.az Style - Desktop & Mobile) */}
      <DetailLightbox
        isOpen={isLightboxOpen}
        onClose={closeLightbox}
        imagesList={imagesList}
        activeImageIndex={activeImageIndex}
        setActiveImageIndex={handleLightboxIndexChange}
        safeTitle={safeTitle}
        safePrice={safePrice}
        lightboxCarDetails={lightboxCarDetails}
        whatsappUrl={whatsappUrl}
        isFavorite={isFavorite}
        isFromGrid={lightboxSource === 'grid'}
        onToggleFavorite={() => {
          if (car?.id && onToggleFavorite) {
            onToggleFavorite(car.id);
          }
        }}
      />
    </>
  );
};

// EXPORTED COMPONENT WITH ERROR BOUNDARY WRAPPER
export const TransitDetailModal: React.FC<TransitDetailModalProps> = ({
  car,
  onClose,
  isFavorite = false,
  onToggleFavorite,
  allCars = [],
  onSelectCar,
  favorites = []
}) => {
  if (!car) return null;

  return (
    <DetailModalErrorBoundary onClose={onClose} carTitle={car?.title}>
      <TransitDetailModalContent 
        car={car} 
        onClose={onClose} 
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        allCars={allCars}
        onSelectCar={onSelectCar}
        favorites={favorites}
      />
    </DetailModalErrorBoundary>
  );
};
