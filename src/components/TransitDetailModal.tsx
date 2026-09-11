import React, { useState, useEffect, useCallback, useRef, useMemo, ErrorInfo, ReactNode } from 'react';
import { 
  X, Phone, MapPin, Share2, Heart, ArrowLeft,
  Check, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, ShieldCheck, Map, ArrowUpRight, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TransitCar } from '../types';
import { WHATSAPP_NUMBER, PHONE_NUMBER, SHOWROOM_ADDRESS, SHOWROOM_MAP_URL, WORKING_HOURS } from '../data/transits';
import whatsappLogo from '../pics/whatsapp logo.png';
import { DEFAULT_VEHICLE_PLACEHOLDER, getValidImageUrl } from '../utils/imageFallback';
import { trackWhatsAppClick } from '../services/analyticsService';
import { useBodyScrollLock } from '../utils/scrollLock';
import { TurboImageSlider } from './TurboImageSlider';
import { prefetchImages, prefetchCarouselWindow } from '../utils/imagePreloader';

// ==========================================
// 1. ROBUST ERROR BOUNDARY COMPONENT
// ==========================================
interface ErrorBoundaryProps {
  children: ReactNode;
  onClose?: () => void;
  carTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ModalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TransitDetailModal Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto"
          onClick={this.props.onClose}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                {this.props.carTitle || 'Avtomobil məlumatları yüklənir'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Məlumatlar göstərilərkən kiçik uyğunsuzluq yarandı. Birbaşa əlaqə saxlayaraq ətraflı məlumat ala bilərsiniz.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Salam! Kosalar Auto avtomobili haqqında məlumat almaq istəyirəm.')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick()}
                className="w-full sm:flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all"
              >
                <img src={whatsappLogo} alt="WhatsApp" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                <span>WhatsApp ilə Əlaqə</span>
              </a>

              <button
                type="button"
                onClick={this.props.onClose}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==========================================
// 2. DATA SANITIZERS & SAFE PARSERS
// ==========================================

// Safe Number Formatter (e.g. 14 500)
function formatNumberSafe(val: unknown, fallback = '0'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString('az-AZ').replace(/,/g, ' ');
}

// Format brand display name to always start with proper capital letter
export function formatBrandDisplayName(brand?: string, title?: string): string {
  const raw = (brand || '').trim();
  const lower = raw.toLowerCase();
  if (lower === 'ford') return 'Ford';
  if (lower === 'mercedes' || lower === 'mercedes-benz' || lower === 'mercedes benz') return 'Mercedes';
  if (lower === 'iveco') return 'Iveco';
  if (lower === 'volkswagen' || lower === 'vw') return 'Volkswagen';
  if (lower === 'renault') return 'Renault';
  if (lower === 'peugeot') return 'Peugeot';
  if (lower === 'fiat') return 'Fiat';
  if (lower === 'opel') return 'Opel';
  if (lower === 'hyundai') return 'Hyundai';
  if (lower === 'toyota') return 'Toyota';
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);

  if (title) {
    const tLower = title.toLowerCase();
    if (tLower.includes('mercedes')) return 'Mercedes';
    if (tLower.includes('iveco')) return 'Iveco';
    if (tLower.includes('volkswagen') || tLower.includes('crafter')) return 'Volkswagen';
    if (tLower.includes('renault') || tLower.includes('master')) return 'Renault';
    if (tLower.includes('peugeot') || tLower.includes('boxer')) return 'Peugeot';
    if (tLower.includes('fiat') || tLower.includes('ducato')) return 'Fiat';
  }
  return 'Ford';
}

// Format model display name
export function formatModelDisplayName(model?: string, title?: string): string {
  const raw = (model || '').trim();
  const lower = raw.toLowerCase();
  if (lower === 'transit') return 'Transit';
  if (lower === 'sprinter') return 'Sprinter';
  if (lower === 'daily') return 'Daily';
  if (lower === 'crafter') return 'Crafter';
  if (lower === 'master') return 'Master';
  if (lower === 'boxer') return 'Boxer';
  if (lower === 'ducato') return 'Ducato';
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);

  if (title) {
    const tLower = title.toLowerCase();
    if (tLower.includes('sprinter')) return 'Sprinter';
    if (tLower.includes('daily')) return 'Daily';
    if (tLower.includes('crafter')) return 'Crafter';
    if (tLower.includes('master')) return 'Master';
    if (tLower.includes('boxer')) return 'Boxer';
    if (tLower.includes('ducato')) return 'Ducato';
  }
  return 'Transit';
}

// Safe Features Parser (Only returns active/true features)
function parseAndFilterFeatures(rawFeatures: unknown): string[] {
  if (!rawFeatures) return [];
  
  let list: unknown[] = [];
  if (Array.isArray(rawFeatures)) {
    list = rawFeatures;
  } else if (typeof rawFeatures === 'string') {
    try {
      const parsed = JSON.parse(rawFeatures);
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        list = Object.entries(parsed)
          .filter(([_, val]) => Boolean(val))
          .map(([key]) => key);
      } else {
        list = rawFeatures.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch {
      list = rawFeatures.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else if (typeof rawFeatures === 'object' && rawFeatures !== null) {
    list = Object.entries(rawFeatures as Record<string, unknown>)
      .filter(([_, val]) => Boolean(val))
      .map(([key]) => key);
  }

  const result: string[] = [];
  for (const item of list) {
    if (!item) continue;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.length > 0) result.push(trimmed);
    } else if (typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const isActive = obj.active !== false && obj.checked !== false && obj.enabled !== false && obj.is_active !== false;
      if (isActive) {
        const name = (obj.name || obj.title || obj.feature || obj.label || obj.value || '') as string;
        if (typeof name === 'string' && name.trim().length > 0) {
          result.push(name.trim());
        }
      }
    }
  }

  return Array.from(new Set(result));
}

// ==========================================
// 3. INNER DETAIL MODAL COMPONENT
// ==========================================
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
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);
  const prevIsLightboxOpen = useRef(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Reset active image & scroll to top when car changes
  useEffect(() => {
    setActiveImageIndex(0);
    setCopied(false);
    setIsLightboxOpen(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [car?.id]);

  // Lightbox açıldıqda aktiv şəklin indeksini qoru və uyğun thumbnail-i görünən sahəyə gətir
  useEffect(() => {
    if (isLightboxOpen && !prevIsLightboxOpen.current) {
      const activeThumb = thumbnailRefs.current[activeImageIndex];
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'instant',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
    prevIsLightboxOpen.current = isLightboxOpen;
  }, [isLightboxOpen, activeImageIndex]);

  // Mərkəzləşdirmə və Active State sinxronizasiyası:
  // İstifadəçi hansı şəkildədirsə, uyğun mini şəkil scrollIntoView ilə rəvan şəkildə görünən sahəyə gətirilir.
  useEffect(() => {
    if (!isLightboxOpen) return;

    if (activeImageIndex === 0) {
      if (thumbnailsContainerRef.current) {
        thumbnailsContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
      return;
    }

    const activeThumb = thumbnailRefs.current[activeImageIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeImageIndex, isLightboxOpen]);

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

  // Keyboard navigation & quick image switch
  const handlePrevImage = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    if (imagesList.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
  }, [imagesList.length]);

  const handleNextImage = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    if (imagesList.length <= 1) return;
    setActiveImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
  }, [imagesList.length]);

  // Keyboard navigation (Escape to close lightbox or modal; Arrow keys handled by active slider)
  useEffect(() => {
    if (!car) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [car, isLightboxOpen, onClose]);

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
  const turboSubtitle = `${vehicleMainTitle}, ${safeMileage} km`;

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
    if (onSelectCar) {
      onSelectCar(simCar);
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const currentMainImage = imagesList[activeImageIndex] || imagesList[0] || DEFAULT_VEHICLE_PLACEHOLDER;

  return (
    <>
      {/* Modal Backdrop (Overlay) */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-xs overflow-hidden overscroll-contain touch-pan-y"
        onClick={onClose}
      >
        
        {/* Modal Window: Full-width on mobile, rounded card on tablet/desktop */}
        <div 
          className="bg-white rounded-none md:rounded-2xl shadow-2xl border-0 md:border border-slate-200 max-w-2xl md:max-w-5xl lg:max-w-6xl w-full h-[100dvh] md:h-auto md:max-h-[90vh] max-h-[100dvh] flex flex-col overflow-hidden my-0 md:my-auto relative animate-in fade-in zoom-in-95 duration-200 overscroll-contain"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Top Sticky Header */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-7 sm:pt-3.5 pb-3 sm:pb-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0 relative">
            {/* 1. Sol: Geri Düyməsi (Yalnız İkon, iri və aydın toxunma sahəsi ilə) */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center transition-all shadow-xs"
                title="Geri"
                aria-label="Geri"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" />
              </button>
            </div>

            {/* 2. Tam Ortada: KOSALAR AUTO (İri, Göy şriftlə) */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 h-10 flex items-center justify-center pointer-events-none">
              <span className="text-base sm:text-xl font-black text-[#1D4ED8] tracking-wider select-none">
                Kosalar Auto
              </span>
            </div>

            {/* 3. Sağ: Paylaş və Seçilmişlər (Ürək) Düymələri */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={handleShare}
                className="h-10 px-3 sm:px-3.5 rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm font-bold shadow-xs"
                title="Paylaş"
                aria-label="Paylaş"
              >
                {copied ? <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600" /> : <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700" />}
                <span className="hidden sm:inline">{copied ? 'Kopyalandı' : 'Paylaş'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (car?.id && onToggleFavorite) {
                    onToggleFavorite(car.id);
                  }
                }}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl transition-all flex items-center justify-center active:scale-95 shadow-xs ${
                  isFavorite 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' 
                    : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
                title={isFavorite ? "Seçilmişlərdən çıxart" : "Seçilmişlərə əlavə et"}
                aria-label="Seçilmişlər"
              >
                <Heart className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${
                  isFavorite ? 'fill-rose-600 text-rose-600' : 'text-slate-700'
                }`} />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Content */}
          <div ref={scrollContainerRef} className="overflow-y-auto flex-1 min-h-0 bg-white block w-full overscroll-contain">
            
            {/* ========================================================
                RESPONSIVE HERO SECTION:
                - Mobil: Tək Sütun (Slider yuxarıda)
                - Desktop: İki Sütunlu Split Layout (Sol 60% Şəkil Sahəsi, Sağ 40% Məlumat və Əlaqə)
               ======================================================== */}
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
                    setIsLightboxOpen(true);
                  }}
                  disabledKeyNav={isLightboxOpen}
                  className="w-full aspect-[4/3] md:aspect-auto md:h-[500px] flex items-center justify-center bg-black"
                />
              </div>

              {/* Sağ Sütun (Məlumat və Əlaqə Sahəsi - YALNIZ Desktopda 40% enində) */}
              <div className="hidden md:flex md:w-[42%] lg:w-[40%] flex-col justify-between p-6 lg:p-7 bg-white border-l border-slate-200">
                {/* Yuxarı Məlumatlar */}
                <div className="space-y-4">
                  {/* 1. Qiymət */}
                  <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">
                    {safePrice} <span className="text-2xl lg:text-3xl font-extrabold text-slate-900">₼</span>
                  </div>

                  {/* 2. Avtomobilin Adı və İli */}
                  <div>
                    <h1 className="text-lg lg:text-xl font-bold text-slate-900 leading-snug">
                      {vehicleMainTitle}
                    </h1>
                    <div className="text-sm font-semibold text-slate-600 mt-1">
                      {safeMileage} km
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Gömrük olunub
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" /> Azərbaycanda sürülməyib
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Vuruqsuz və rəngsiz
                      </span>
                    </div>
                  </div>

                  {/* 3. Xüsusiyyətlər (Yığcam Cədvəl - Turbo.az Stili) */}
                  <div className="border-t border-slate-200 pt-3 space-y-2 text-xs lg:text-sm">
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Şəhər</span>
                      <span className="font-semibold text-slate-900">{safeLocation}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Yürüş</span>
                      <span className="font-semibold text-slate-900">{safeMileage} km</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Buraxılış ili</span>
                      <span className="font-semibold text-slate-900">{safeYear || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Mühərrik</span>
                      <span className="font-semibold text-slate-900">{safeEngine} L{safeHp ? ` / ${safeHp}` : ''} / {safeFuelType}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Sürətlər qutusu</span>
                      <span className="font-semibold text-slate-900">{safeTransmission}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Ötürücü</span>
                      <span className="font-semibold text-slate-900">{safeWheelDrive}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Ban növü</span>
                      <span className="font-semibold text-slate-900">{safeBodyType}</span>
                    </div>
                    {safeSeatCount ? (
                      <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                        <span className="text-slate-500 font-normal">Yerlərin sayı</span>
                        <span className="font-semibold text-slate-900">{safeSeatCount}</span>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Baza uzunluğu</span>
                      <span className="font-semibold text-slate-900">{safeBaseLength}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Vəziyyəti</span>
                      <span className="font-semibold text-emerald-700">{safeCondition}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Ən aşağıda bir-birinin altında iri və diqqətçəkən "Zəng et" və "WhatsApp ilə yaz" düymələri */}
                <div className="pt-4 border-t border-slate-200 space-y-2.5 mt-5">
                  <a
                    href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm lg:text-base rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-blue-600/20 active:scale-[0.99]"
                    title="Zəng et"
                  >
                    <Phone className="w-5 h-5 text-white" />
                    <span>Zəng et: {PHONE_NUMBER}</span>
                  </a>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackWhatsAppClick()}
                    className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da851] text-white font-bold text-sm lg:text-base rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99]"
                  >
                    <img 
                      src={whatsappLogo} 
                      alt="WhatsApp" 
                      className="w-5 h-5 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <span>WhatsApp ilə yaz</span>
                  </a>
                </div>
              </div>

            </div>

            {/* Məzmun Gövdəsi: Turbo.az strukturu */}
            <div className="p-4 sm:p-5 md:p-6 space-y-5 max-w-5xl mx-auto block w-full">
              
              {/* ========================================================
                  1. BAŞLIQ VƏ QİYMƏT (YALNIZ MOBİLDƏ GÖSTƏRİLİR)
                 ======================================================== */}
              <div className="border-b border-slate-200 pb-5 block w-full md:hidden">
                {/* Qiymət */}
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {safePrice} <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">₼</span>
                </div>

                {/* Avtomobilin Tam Adı */}
                <h1 className="text-xl sm:text-2xl font-bold text-black mt-2.5 leading-snug">
                  <div className="text-xl sm:text-2xl font-bold text-black">
                    {vehicleMainTitle}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-black mt-1">
                    {safeMileage} km
                  </div>
                </h1>

                {/* Status teqləri */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Gömrük olunub
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Azərbaycanda sürülməyib
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    Vuruqsuz və rəngsiz
                  </span>
                </div>
              </div>

              {/* ========================================================
                  2. XÜSUSİYYƏTLƏR CƏDVƏLİ (YALNIZ MOBİLDƏ GÖSTƏRİLİR - TURBO.AZ STİLİ)
                 ======================================================== */}
              <div className="border-b border-slate-200 pb-3 md:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm">
                  {/* Sol Sütun */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Şəhər</span>
                      <span className="font-semibold text-slate-900">{safeLocation}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Marka</span>
                      <span className="font-semibold text-slate-900">{safeMake}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Model</span>
                      <span className="font-semibold text-slate-900">{safeModel}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Buraxılış ili</span>
                      <span className="font-semibold text-slate-900">{safeYear || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Ban növü</span>
                      <span className="font-semibold text-slate-900">{safeBodyType}</span>
                    </div>
                    {safeSeatCount ? (
                      <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                        <span className="text-slate-500 font-normal">Yerlərin sayı</span>
                        <span className="font-semibold text-slate-900">{safeSeatCount}</span>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Rəng</span>
                      <span className="font-semibold text-slate-900">{safeColor}</span>
                    </div>
                  </div>

                  {/* Sağ Sütun */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Mühərrik</span>
                      <span className="font-semibold text-slate-900">{safeEngine} L{safeHp ? ` / ${safeHp}` : ''} / {safeFuelType}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Yürüş</span>
                      <span className="font-semibold text-slate-900">{safeMileage} km</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Sürətlər qutusu</span>
                      <span className="font-semibold text-slate-900">{safeTransmission}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Ötürücü</span>
                      <span className="font-semibold text-slate-900">{safeWheelDrive}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Baza uzunluğu</span>
                      <span className="font-semibold text-slate-900">{safeBaseLength}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 font-normal">Vəziyyəti</span>
                      <span className="font-semibold text-emerald-700">{safeCondition}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  3. QEYD VƏ TƏSVİR (TURBO.AZ SADƏ PARAQRAF FORMATI - ƏVVƏL GƏLİR)
                 ======================================================== */}
              <div className="border-b border-slate-200 pb-6 text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                {car?.description || 'Almaniyadan yeni gətirilib. Azərbaycanda sürülməyib. 100% gömrük olunub. Vuruğu, dəyişən detalı, pası və ya çürüyü qətiyyən yoxdur. Orijinal probeq. Mühərrik, sürət qutusu və asqı sistemi ideal vəziyyətdədir. Bütün sənədləri qaydasındadır, dərhal ada keçirilir. Real alıcı ilə maşının yanında razılaşmaq olar.'}
              </div>

              {/* ========================================================
                  4. TƏCHİZAT (TURBO.AZ SƏTİR DÜZÜLÜŞÜ - TƏSVİRDƏN SONRA GƏLİR)
                 ======================================================== */}
              {activeFeaturesList && activeFeaturesList.length > 0 && (
                <div className="border-b border-slate-200 pb-6">
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {activeFeaturesList.map((feature, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-100 text-slate-800 text-xs sm:text-sm font-medium border border-slate-200"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Avtosalon Məlumatı */}
              <div className="bg-[#f8fafc] rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Kosalar Auto</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{SHOWROOM_ADDRESS}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{WORKING_HOURS}</span>
                  </div>
                </div>

                <a 
                  href={SHOWROOM_MAP_URL}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-colors shrink-0"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Xəritədə bax</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>

              {/* ========================================================
                  5. BƏNZƏR ELANLAR (TURBO.AZ STYLE SIMILAR ADS)
                 ======================================================== */}
              {similarCars && similarCars.length > 0 && (
                <div className="border-t border-slate-200 pt-6 mt-4 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-black tracking-tight">
                        Bənzər elanlar
                      </h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {similarCars.length}
                      </span>
                    </div>
                  </div>

                  {/* Responsive Grid: 2 columns on mobile, 3 columns on sm/md */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {similarCars.map((simCar) => {
                      const simTitle = simCar.title || `${simCar.brand || 'Ford'} ${simCar.model || 'Transit'}`;
                      const simPrice = (simCar.price || 0).toLocaleString();
                      const simYear = simCar.year ? `${simCar.year} il` : '';
                      const simEngine = simCar.engine ? (simCar.engine.includes('L') ? simCar.engine : `${simCar.engine.split(' ')[0]} L`) : '';
                      const simMileage = simCar.mileage ? `${(simCar.mileage).toLocaleString()} km` : '';
                      const simSpecs = [simYear, simEngine, simMileage].filter(Boolean).join(', ');
                      const simLocation = simCar.location || simCar.city || 'Bakı';
                      const simIsFav = favorites ? favorites.includes(simCar.id) : false;

                      return (
                        <div
                          key={simCar.id}
                          onClick={() => handleSelectSimilarCar(simCar)}
                          className="bg-white rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden cursor-pointer group select-none"
                          title={`${simTitle} - Baxmaq üçün klikləyin`}
                        >
                          {/* Image box (Turbo.az 4:3 aspect, bg-slate-100, object-cover) */}
                          <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden flex items-center justify-center">
                            <img
                              src={getValidImageUrl(simCar.primaryImage || (simCar.images && simCar.images[0]))}
                              alt={simTitle}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_VEHICLE_PLACEHOLDER;
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />

                            {/* Heart Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleFavorite) onToggleFavorite(simCar.id);
                              }}
                              className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition-transform hover:scale-110 z-10 ${
                                simIsFav 
                                  ? 'bg-red-600 text-white shadow-xs' 
                                  : 'bg-slate-900/60 text-white hover:text-red-400 hover:bg-slate-900/90'
                              }`}
                              title={simIsFav ? 'Seçilmişlərdən çıxar' : 'Seçilmişlərə əlavə et'}
                              aria-label="Seçilmişlərə əlavə et"
                            >
                              <Heart className={`w-3.5 h-3.5 ${simIsFav ? 'fill-current' : ''}`} />
                            </button>

                            {/* Base length badge */}
                            {simCar.baseLength && (
                              <div className="absolute bottom-2 right-2 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-700">
                                {simCar.baseLength}
                              </div>
                            )}
                          </div>

                          {/* Card Content */}
                          <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-1.5">
                            <div>
                              {/* Price */}
                              <div className="text-sm sm:text-base font-black text-black leading-tight">
                                {simPrice} <span className="font-black text-black">₼</span>
                              </div>

                              {/* Title */}
                              <div className="font-bold text-xs sm:text-sm text-black group-hover:text-blue-600 transition-colors line-clamp-1 mt-0.5">
                                {simTitle}
                              </div>

                              {/* Specs: Year, Engine, Mileage */}
                              {simSpecs && (
                                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {simSpecs}
                                </div>
                              )}
                            </div>

                            {/* Location & View CTA */}
                            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                              <span className="truncate max-w-[90px] sm:max-w-[110px]">{simLocation}</span>
                              <span className="text-blue-600 font-bold group-hover:underline">Bax &rarr;</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Sticky Bottom Action Bar (Zəng et + WhatsApp) - Yalnız Mobil Rejimdə (Floating Turbo.az Stili) */}
          <div className="px-3 sm:px-4 pb-3 pt-1 sticky bottom-0 z-30 flex md:hidden items-center gap-2.5 shrink-0 pointer-events-none">
            <a
              href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}
              className="px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0 shadow-lg shadow-blue-700/30 active:scale-95 pointer-events-auto"
              title="Zəng et"
            >
              <Phone className="w-4 h-4" />
              <span>Zəng et</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick()}
              className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da851] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-700/30 active:scale-98 pointer-events-auto"
            >
              <img 
                src={whatsappLogo} 
                alt="WhatsApp" 
                className="w-4 h-4 object-contain"
                referrerPolicy="no-referrer"
              />
              <span>WhatsApp ilə yaz</span>
            </a>
          </div>

        </div>

      </div>

      {/* Fullscreen Photo Lightbox (Turbo.az Style - Desktop & Mobile) */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-[70] flex flex-col justify-between bg-black select-none overflow-hidden"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* 1A. Mobil Üst Naviqasiya (Yalnız Mobil: md:hidden) */}
            <div 
              className="flex md:hidden w-full bg-black px-4 pt-3.5 pb-3 items-center justify-between z-30 shrink-0 select-none border-b border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sol yuxarı künc: Təmiz "✕" (bağla) işarəsi */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-white hover:opacity-75 active:scale-95 transition-all cursor-pointer"
                title="Bağla (Esc)"
                aria-label="Bağla"
              >
                <X className="w-6 h-6 text-white stroke-[2.2]" />
              </button>

              {/* Üst mərkəz: Yığcam fraksiya (Məs: 15 / 16) */}
              <div className="text-white text-sm font-semibold tracking-wider select-none">
                <span>{activeImageIndex + 1}</span>
                <span className="text-white/60 mx-1.5 font-normal">/</span>
                <span>{imagesList.length || 1}</span>
              </div>

              {/* Sağ yuxarı künc: Ağ rəngdə "Sevimlilər" (ürək) işarəsi */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (car?.id && onToggleFavorite) {
                    onToggleFavorite(car.id);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center text-white hover:opacity-75 active:scale-95 transition-all cursor-pointer"
                title={isFavorite ? "Seçilmişlərdən çıxart" : "Seçilmişlərə əlavə et"}
                aria-label="Seçilmişlər"
              >
                <Heart 
                  className={`w-6 h-6 transition-transform active:scale-125 ${
                    isFavorite ? 'fill-red-500 text-red-500 stroke-red-500' : 'text-white stroke-[2.2]'
                  }`} 
                />
              </button>
            </div>

            {/* 1B. Desktop Üst Bar (Yalnız Desktop: hidden md:flex) */}
            <div 
              className="hidden md:flex w-full bg-black px-6 py-3.5 items-center justify-between z-30 shrink-0 select-none border-b border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sol yuxarı künc: Elanın adı və qiyməti */}
              <div className="flex items-center gap-3 text-white min-w-0 pr-4">
                <span className="text-base lg:text-lg font-bold text-white tracking-tight truncate">
                  {safeTitle}
                </span>
                <span className="text-white/40 font-light">|</span>
                <span className="text-base lg:text-lg font-black text-white shrink-0">
                  {safePrice} AZN
                </span>
              </div>

              {/* Sağ yuxarı künc: Yaşıl WhatsApp düyməsi, "Seçilmişlərdə saxla" (ürək) və "✕" (bağla) */}
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer select-none"
                  title="WhatsApp ilə yaz"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                    alt="WhatsApp"
                    className="w-4 h-4 object-contain brightness-0 invert"
                    referrerPolicy="no-referrer"
                  />
                  <span>WhatsApp ilə yaz</span>
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (car?.id && onToggleFavorite) {
                      onToggleFavorite(car.id);
                    }
                  }}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer"
                  title={isFavorite ? "Seçilmişlərdən çıxart" : "Seçilmişlərdə saxla"}
                  aria-label="Seçilmişlər"
                >
                  <Heart 
                    className={`w-5 h-5 transition-transform active:scale-125 ${
                      isFavorite ? 'fill-rose-500 text-rose-500 stroke-rose-500' : 'text-white stroke-[2]'
                    }`} 
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer"
                  title="Bağla (Esc)"
                  aria-label="Bağla"
                >
                  <X className="w-6 h-6 text-white stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* 2. Mərkəzi Şəkil (Tam təmiz qara arxafon, ətrafında azca marjin/boşluq) */}
            <div 
              className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-black p-1 sm:p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <TurboImageSlider
                key={`lightbox-slider-${car?.id}`}
                images={imagesList}
                activeImageIndex={activeImageIndex}
                onIndexChange={setActiveImageIndex}
                safeTitle={safeTitle}
                isLightbox={true}
              />
            </div>

            {/* 3A. Mobil Aşağı Məlumat və Əlaqə Bloku (Yalnız Mobil: md:hidden) */}
            <div 
              className="flex md:hidden w-full bg-black border-t border-white/10 px-4 pt-3 pb-6 items-center justify-between gap-3 z-30 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sol aşağı hissə: Maşın elanı məlumatları ağ rəngdə */}
              <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                {/* İlk sətir: Qiymət (Məs: 30 000 ₼) */}
                <div className="text-base font-bold text-white tracking-tight leading-tight">
                  {safePrice} <span className="font-bold text-white">₼</span>
                </div>
                {/* İkinci sətir: Maşın adı və detalları */}
                <div className="text-xs font-normal text-white/90 truncate leading-snug">
                  {lightboxCarDetails}
                </div>
              </div>

              {/* Sağ aşağı hissə: Yaşıl dairəvi "Zəng et" düyməsi */}
              <div className="flex items-center shrink-0">
                <a
                  href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}
                  className="w-12 h-12 rounded-full bg-[#22C55E] hover:bg-[#16A34A] active:scale-95 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
                  title="Zəng et"
                  aria-label="Zəng et"
                >
                  <Phone className="w-5 h-5 text-white stroke-[2.2]" />
                </a>
              </div>
            </div>

            {/* 3B. Desktop Aşağı Bar və Mini Şəkillər (Yalnız Desktop: hidden md:flex) */}
            <div 
              className="hidden md:flex w-full bg-black border-t border-white/10 px-6 pt-2.5 pb-4 flex-col items-center justify-center z-30 shrink-0 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Tək Yığcam Sayğac (Şəklin tam altında, təkrarsız) */}
              <div className="text-xs text-white/80 font-semibold mb-2.5 tracking-wider select-none">
                <span>{activeImageIndex + 1}</span>
                <span className="text-white/40 mx-1.5">/</span>
                <span>{imagesList.length || 1}</span>
              </div>

              {/* Mini Şəkillər (Thumbnails) Sırası */}
              {imagesList.length > 1 && (
                <div 
                  ref={thumbnailsContainerRef}
                  className={`w-full max-w-5xl overflow-x-auto no-scrollbar py-1 flex items-center gap-2.5 px-4 ${
                    imagesList.length <= 7 ? 'justify-center' : 'justify-start'
                  }`}
                >
                  {imagesList.map((img, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <button
                        key={`thumb-desktop-${idx}`}
                        ref={(el) => { thumbnailRefs.current[idx] = el; }}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative rounded-lg overflow-hidden shrink-0 transition-all cursor-pointer h-14 w-20 border-2 ${
                          isActive 
                            ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/60 scale-105 opacity-100 shadow-md z-10' 
                            : 'border-white/15 opacity-50 hover:opacity-85 hover:scale-100'
                        }`}
                        title={`${idx + 1}-ci şəkil`}
                      >
                        <img
                          src={getValidImageUrl(img)}
                          alt={`Önizləmə ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ==========================================
// 4. EXPORTED COMPONENT WITH ERROR BOUNDARY WRAPPER
// ==========================================
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
    <ModalErrorBoundary onClose={onClose} carTitle={car?.title}>
      <TransitDetailModalContent 
        car={car} 
        onClose={onClose} 
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        allCars={allCars}
        onSelectCar={onSelectCar}
        favorites={favorites}
      />
    </ModalErrorBoundary>
  );
};
