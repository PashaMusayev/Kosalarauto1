import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { FilterBar } from './components/FilterBar';
import { TransitCard } from './components/TransitCard';
import { TransitCardSkeleton } from './components/TransitCardSkeleton';
import { TransitDetailModal } from './components/TransitDetailModal';
import { AboutUs } from './components/AboutUs';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { ContactFooter } from './components/ContactFooter';
import { AdminErrorBoundary } from './components/AdminErrorBoundary';
import { NotFound } from './components/NotFound';
import { INITIAL_TRANSITS, WHATSAPP_NUMBER, WHATSAPP_DIRECT_LINK } from './data/transits';
import { TransitCar, FilterState } from './types';
import { MessageCircle, Truck, Sparkles, FilterX } from 'lucide-react';
import whatsappLogo from './pics/whatsapp logo.png';
import { fetchCarsFromSupabase, fetchAllCarsFromApi } from './services/carService';
import { getSupabaseClient } from './services/supabaseClientInit';
import { trackWhatsAppClick } from './services/analyticsService';

const AdminModal = React.lazy(() => import('./components/AdminModal'));

const parseMultiFilter = (val: string | string[] | undefined): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(v => v && v !== 'all' && v !== 'Hamısı');
  if (typeof val === 'string' && val !== 'all' && val !== 'Hamısı') {
    return val.split(',').map(s => s.trim()).filter(s => s && s !== 'all' && s !== 'Hamısı');
  }
  return [];
};

const DEFAULT_FILTERS: FilterState = {
  brand: 'all',
  minYear: 'all',
  maxYear: 'all',
  year: 'all',
  bodyType: 'all',
  baseLength: 'all',
  fuelType: 'all',
  transmission: 'all',
  minPrice: 0,
  maxPrice: 0,
  minMileage: 0,
  maxMileage: 0,
  searchQuery: '',
  sortBy: 'featured'
};

const normalizePath = (p: string) => {
  try {
    const clean = p.toLowerCase().trim();
    if (!clean || clean === '' || clean === '/index.html') return '/';
    return clean;
  } catch (e) {
    return '/';
  }
};

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname);
    }
    return '/';
  });

  const [transits, setTransits] = useState<TransitCar[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kosalar_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string');
        }
      }
    } catch (e) {
      console.warn('Could not load favorites from localStorage:', e);
    }
    return [];
  });
  const [selectedCar, setSelectedCar] = useState<TransitCar | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = normalizePath(window.location.pathname);
      return p === '/admin444' || p === '/admin444/';
    }
    return false;
  });
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Determine if the current route is 404 (Not Found)
  // Valid routes: '/' (home/catalog), '/admin444', '/admin444/'
  const isHomeRoute = currentPath === '/' || currentPath === '' || currentPath === '/index.html';
  const isAdminRoute = currentPath === '/admin444' || currentPath === '/admin444/';
  const is404 = !isHomeRoute && !isAdminRoute;

  // Sync favorites changes with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kosalar_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Could not save favorites to localStorage:', e);
    }
  }, [favorites]);

  // Set document title and sync state with Supabase / server API
  useEffect(() => {
    if (is404) {
      document.title = "404 - Səhifə tapılmadı | Kosalar Auto";
    } else if (adminOpen || isAdminRoute) {
      document.title = "Admin panel - Kosalar Auto";
    } else {
      document.title = "Kosalar Auto - Ford Transit satış mərkəzi";
    }

    let isMounted = true;

    const fetchLatestCars = async (isInitial = false) => {
      if (!isMounted) return;
      // Only show full loading skeleton on the very first initial load when there are no cached cars
      if (isInitial) {
        setIsLoading(true);
      }

      try {
        // 1. Try fetching directly from Supabase with timeout
        try {
          const sbRes = await fetchCarsFromSupabase();
          if (isMounted && sbRes.success && Array.isArray(sbRes.data) && sbRes.data.length > 0) {
            setTransits(sbRes.data);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Supabase direct fetch warning:', e);
        }

        // 2. Fetch from backend API using shared helper
        try {
          const apiRes = await fetchAllCarsFromApi();
          if (isMounted && apiRes.success && Array.isArray(apiRes.cars) && apiRes.cars.length > 0) {
            setTransits(apiRes.cars);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Backend API cars fetch notice:', err);
        }
      } catch (err) {
        console.warn('Cars sync process error:', err);
      } finally {
        if (isMounted) {
          setTransits(prev => (prev.length > 0 ? prev : INITIAL_TRANSITS));
          setIsLoading(false);
        }
      }
    };

    // Initial fetch on mount only (cached in state)
    fetchLatestCars(true);

    // BroadcastChannel for instant real-time sync across tabs and windows (only on explicit car updates)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('kosalar_auto_cars_channel');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'CARS_UPDATED') {
          if (Array.isArray(event.data.cars) && event.data.cars.length > 0) {
            setTransits(event.data.cars);
          } else {
            fetchLatestCars(false);
          }
        }
      };
    } catch (e) {}

    // Explicit manual updates handler (e.g. admin saves changes) - silent update without reload flicker
    const handleExplicitUpdate = () => {
      fetchLatestCars(false);
    };

    window.addEventListener('carsUpdated', handleExplicitUpdate);

    return () => {
      isMounted = false;
      if (bc) bc.close();
      window.removeEventListener('carsUpdated', handleExplicitUpdate);
    };
  }, [adminOpen, isAdminRoute, is404]);

  // Keep selectedCar in sync if transits update (e.g. photos/price changed in admin)
  useEffect(() => {
    if (selectedCar) {
      const updated = transits.find(c => c.id === selectedCar.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedCar)) {
        setSelectedCar(updated);
      }
    }
  }, [transits]);

  // URL route monitoring, shared car link params & keyboard shortcut
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const carId = params.get('car');
      if (carId) {
        const matchedCar = transits.find(c => c.id.toLowerCase() === carId.toLowerCase());
        if (matchedCar) {
          setSelectedCar(matchedCar);
        }
      }

      const p = normalizePath(window.location.pathname);
      setCurrentPath(p);
      if (p === '/admin444' || p === '/admin444/') {
        setAdminOpen(true);
      }
    } catch (e) {}

    const handlePopState = () => {
      const p = normalizePath(window.location.pathname);
      setCurrentPath(p);
      if (p === '/admin444' || p === '/admin444/') {
        setAdminOpen(true);
      } else {
        setAdminOpen(false);
      }
    };

    const handleHashChange = () => {
      const p = normalizePath(window.location.pathname);
      setCurrentPath(p);
      if (p === '/admin444' || p === '/admin444/') {
        setAdminOpen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + A (or Shift + Ctrl + A) shortcut to open Admin Panel
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setAdminOpen(prev => {
          const nextState = !prev;
          try {
            if (nextState) {
              window.history.pushState({}, '', '/admin444');
              setCurrentPath('/admin444');
            } else {
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }
          } catch (err) {}
          return nextState;
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [transits]);

  const handleOpenAdmin = useCallback(() => {
    setAdminOpen(true);
    setCurrentPath('/admin444');
    try {
      window.history.pushState({}, '', '/admin444');
    } catch (e) {}
  }, []);

  const handleCloseAdmin = useCallback(() => {
    setAdminOpen(false);
    try {
      window.history.pushState({}, '', '/');
    } catch (e) {}
    setCurrentPath('/');
  }, []);

  const handleGoHomeFrom404 = useCallback(() => {
    try {
      window.history.pushState({}, '', '/');
    } catch (e) {}
    setCurrentPath('/');
    setAdminOpen(false);
  }, []);

  // Sync modal state with URL
  const handleOpenDetail = useCallback((car: TransitCar) => {
    setSelectedCar(car);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('car', car.id);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedCar(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('car');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  }, []);

  // Filter & Sort Logic (Only active cars displayed on the public visitor catalog)
  const filteredTransits = useMemo(() => {
    const selectedBrands = parseMultiFilter(filters.brand);
    const minYearNum = filters.minYear && filters.minYear !== 'all' && Number(filters.minYear) > 0 ? Number(filters.minYear) : 0;
    const maxYearNum = filters.maxYear && filters.maxYear !== 'all' && Number(filters.maxYear) > 0 ? Number(filters.maxYear) : 0;
    const exactYear = filters.year && filters.year !== 'all' ? String(filters.year).trim() : null;
    const selectedBodyTypes = parseMultiFilter(filters.bodyType);
    const selectedBaseLengths = parseMultiFilter(filters.baseLength);
    const selectedFuelTypes = parseMultiFilter(filters.fuelType);
    const selectedTransmissions = parseMultiFilter(filters.transmission);
    const hasSearchQuery = Boolean(filters.searchQuery && filters.searchQuery.trim() !== '');
    const q = hasSearchQuery ? filters.searchQuery.toLowerCase().trim() : '';

    return transits.filter(car => {
      // 1. Status filter: hide sold cars from public catalog (only show active cars)
      if (car.status === 'sold') {
        return false;
      }

      // 1. Brand filter (Ford, Mercedes-Benz etc.)
      if (selectedBrands.length > 0) {
        const carBrand = (car.brand || car.make || '').toLowerCase().trim();
        const carTitle = (car.title || '').toLowerCase().trim();
        const brandMatch = selectedBrands.some(b => {
          const tb = b.toLowerCase().trim();
          return carBrand.includes(tb) || carTitle.includes(tb);
        });
        if (!brandMatch) return false;
      }

      // 2. Min/Max Year filter (Turbo.az style)
      const carYear = Number(car.year) || 0;
      if (minYearNum > 0 && carYear < minYearNum) return false;
      if (maxYearNum > 0 && carYear > maxYearNum) return false;
      if (exactYear) {
        const carYearStr = String(car.year || '').trim();
        if (carYearStr !== exactYear) return false;
      }

      // 3. Body type filter (Multi-select)
      if (selectedBodyTypes.length > 0) {
        const carBody = (car.bodyType || '').toLowerCase().trim();
        const bodyMatch = selectedBodyTypes.some(bt => {
          const targetBody = bt.toLowerCase().trim();
          const simpleTarget = targetBody.split('/')[0].split('(')[0].trim();
          const simpleCar = carBody.split('/')[0].split('(')[0].trim();
          return (
            carBody === targetBody ||
            carBody.includes(targetBody) ||
            targetBody.includes(carBody) ||
            (simpleTarget && (carBody.includes(simpleTarget) || simpleCar.includes(simpleTarget)))
          );
        });
        if (!bodyMatch) return false;
      }

      // 4. Base length filter (Multi-select)
      if (selectedBaseLengths.length > 0) {
        const carBase = (car.baseLength || '').toLowerCase().trim();
        const carTitle = (car.title || '').toLowerCase().trim();
        const baseMatch = selectedBaseLengths.some(bl => {
          const targetBase = bl.toLowerCase().trim();
          const cleanNumber = targetBase.replace(/[^0-9.]/g, '');
          return (
            (carBase && (carBase === targetBase || carBase.includes(targetBase) || targetBase.includes(carBase))) ||
            (cleanNumber && (carBase.includes(cleanNumber) || carTitle.includes(cleanNumber)))
          );
        });
        if (!baseMatch) return false;
      }

      // 5. Fuel Type filter (Multi-select)
      if (selectedFuelTypes.length > 0) {
        const carFuel = (car.fuelType || '').toLowerCase().trim();
        const fuelMatch = selectedFuelTypes.some(ft => {
          const targetFuel = ft.toLowerCase().trim();
          return carFuel === targetFuel || carFuel.includes(targetFuel);
        });
        if (!fuelMatch) return false;
      }

      // 6. Transmission filter (Multi-select)
      if (selectedTransmissions.length > 0) {
        const carTrans = (car.transmission || '').toLowerCase().trim();
        const transMatch = selectedTransmissions.some(tr => {
          const targetTrans = tr.toLowerCase().trim();
          return (
            carTrans === targetTrans || 
            carTrans.includes(targetTrans) || 
            (targetTrans === 'mexanika' && carTrans.includes('mexaniki')) ||
            (targetTrans === 'mexaniki' && carTrans.includes('mexanika'))
          );
        });
        if (!transMatch) return false;
      }

      // 7. Mileage range (min & max)
      const numericMileage = Number(car.mileage) || 0;
      if (filters.minMileage > 0 && numericMileage < filters.minMileage) {
        return false;
      }
      if (filters.maxMileage > 0 && numericMileage > filters.maxMileage) {
        return false;
      }

      // 8. Price range (min & max - ən sonda)
      const numericPrice = Number(car.price) || 0;
      if (filters.minPrice > 0 && numericPrice < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice > 0 && numericPrice > filters.maxPrice) {
        return false;
      }

      // 9. Search query (safe null checks on all text fields)
      if (hasSearchQuery) {
        const titleStr = (car.title || '').toLowerCase();
        const brandStr = (car.brand || car.make || '').toLowerCase();
        const modelStr = (car.model || '').toLowerCase();
        const engineStr = (car.engine || '').toLowerCase();
        const vinStr = (car.vinCode || '').toLowerCase();
        const idStr = (car.id || '').toLowerCase();
        const baseStr = (car.baseLength || '').toLowerCase();
        const bodyStr = (car.bodyType || '').toLowerCase();
        const colorStr = (car.color || '').toLowerCase();
        const cityStr = (car.city || car.location || '').toLowerCase();

        const matches = 
          titleStr.includes(q) ||
          brandStr.includes(q) ||
          modelStr.includes(q) ||
          engineStr.includes(q) ||
          vinStr.includes(q) ||
          idStr.includes(q) ||
          baseStr.includes(q) ||
          bodyStr.includes(q) ||
          colorStr.includes(q) ||
          cityStr.includes(q);

        if (!matches) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;
      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;
      const mileageA = Number(a.mileage) || 0;
      const mileageB = Number(b.mileage) || 0;

      if (filters.sortBy === 'featured') {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return 0;
      }
      if (filters.sortBy === 'price-asc') return priceA - priceB;
      if (filters.sortBy === 'price-desc') return priceB - priceA;
      if (filters.sortBy === 'year-desc') return yearB - yearA;
      if (filters.sortBy === 'mileage-asc') return mileageA - mileageB;
      return 0;
    });
  }, [transits, filters]);

  // Favorites toggle
  const handleToggleFavorite = useCallback((carId: string) => {
    setFavorites(prev => 
      prev.includes(carId) ? prev.filter(id => id !== carId) : [...prev, carId]
    );
  }, []);

  const favoriteCars = useMemo(() => {
    return transits.filter(c => favorites.includes(c.id) && c.status !== 'sold');
  }, [transits, favorites]);

  // Smooth scroll helper with header height offset calculation
  const scrollToSection = useCallback((sectionId: string) => {
    if (sectionId === 'hero' || sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      const isMobile = window.innerWidth < 640;
      const headerOffset = isMobile ? 80 : 90;
      const elementPosition = elem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
    }
  }, []);

  const handleOpenFavorites = useCallback(() => {
    setFavoritesOpen(true);
  }, []);

  const handleBrowseCatalog = useCallback(() => {
    scrollToSection('movcud-avtomobiller');
  }, [scrollToSection]);

  const handleCallHero = useCallback(() => {
    scrollToSection('elaqe');
  }, [scrollToSection]);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  if (is404) {
    return <NotFound onGoHome={handleGoHomeFrom404} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Header */}
      <Header
        favoritesCount={favoriteCars.length}
        onOpenFavorites={handleOpenFavorites}
        onNavigate={scrollToSection}
      />

      {/* Main Content */}
      <main className="flex-1">
        
        {/* Hero Section */}
        <Hero
          onBrowseCatalog={handleBrowseCatalog}
          onCall={handleCallHero}
        />

        {/* Filter & Catalog Section */}
        <section id="katalog" className="py-5 sm:py-7 lg:py-8 bg-[#F8FAFC] border-b border-slate-200 scroll-mt-20 sm:scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-3.5 sm:space-y-5">
            
            {/* Search Filter Bar */}
            <FilterBar
              cars={transits}
              filters={filters}
              onFilterChange={setFilters}
              onResetFilters={handleResetFilters}
              totalResultsCount={filteredTransits.length}
              isModalOpen={filterModalOpen}
              setIsModalOpen={setFilterModalOpen}
            />

            {/* Catalog Grid */}
            <div id="movcud-avtomobiller" className="scroll-mt-20 sm:scroll-mt-24">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 sm:mb-3.5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                    Elanlar
                  </h2>
                </div>

                <span className="text-xs font-bold text-[#0F172A] bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
                  {isLoading ? 'Yüklənir...' : `Ümumi: ${filteredTransits.length} model`}
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <TransitCardSkeleton key={index} />
                  ))}
                </div>
              ) : filteredTransits.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-xl mx-auto my-8 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto">
                    <FilterX className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A]">Axtarışınıza uyğun model tapılmadı</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Axtarış filtrlərini və ya qiymət aralığını dəyişərək yenidən cəhd edin və ya bütün avtomobillərə baxın.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-sm transition-colors"
                  >
                    Filtri sıfırla
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4">
                  {filteredTransits.map((car, idx) => (
                    <TransitCard
                      key={car.id}
                      car={car}
                      onViewDetails={handleOpenDetail}
                      isFavorite={favorites.includes(car.id)}
                      onToggleFavorite={handleToggleFavorite}
                      priority={idx < 5}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Haqqımızda (About Us) Section */}
        <AboutUs />

      </main>

      {/* Footer */}
      <ContactFooter />

      {/* Floating WhatsApp Quick Action Button (Hidden when Car Details Modal, drawers or Filter modal are open) */}
      {!selectedCar && !favoritesOpen && !adminOpen && !filterModalOpen && (
        <div className="fixed bottom-5 right-5 z-[40] flex items-center group animate-in fade-in duration-200">
          {/* Subtle Ping Indicator for Friendly Animation */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
          </span>

          {/* Hover Tooltip Label */}
          <div className="pointer-events-none absolute right-full mr-3 whitespace-nowrap bg-slate-900/95 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 flex items-center gap-2 backdrop-blur-md hidden sm:flex">
            <img 
              src={whatsappLogo} 
              alt="WhatsApp Logo" 
              className="w-4 h-4 object-contain"
              referrerPolicy="no-referrer"
            />
            <span>WhatsApp ilə əlaqə</span>
          </div>

          <a
            href={WHATSAPP_DIRECT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick()}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full sm:rounded-2xl shadow-2xl shadow-emerald-950/40 flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 border border-emerald-300/40 group-hover:shadow-emerald-500/30"
            title="WhatsApp ilə əlaqə"
          >
            <img 
              src={whatsappLogo} 
              alt="WhatsApp Logo" 
              className="w-5 h-5 sm:w-5 sm:h-5 object-contain transition-transform group-hover:rotate-12 duration-200"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-xs sm:text-sm whitespace-nowrap">Sualınız var?</span>
          </a>
        </div>
      )}

      {/* Detail Modal */}
      <TransitDetailModal
        car={selectedCar}
        onClose={handleCloseDetail}
        isFavorite={selectedCar ? favorites.includes(selectedCar.id) : false}
        onToggleFavorite={handleToggleFavorite}
        allCars={transits}
        onSelectCar={handleOpenDetail}
        favorites={favorites}
      />

      {/* Favorites Drawer */}
      <FavoritesDrawer
        isOpen={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        favorites={favoriteCars}
        onRemoveFavorite={handleToggleFavorite}
        onViewDetails={handleOpenDetail}
      />

      {/* Admin Panel Modal protected by Error Boundary and Suspense */}
      {adminOpen && (
        <AdminErrorBoundary onClose={handleCloseAdmin}>
          <React.Suspense
            fallback={
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-2xl">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-slate-200 text-sm font-semibold">Admin panel yüklənir...</span>
                </div>
              </div>
            }
          >
            <AdminModal
              isOpen={adminOpen}
              onClose={handleCloseAdmin}
              cars={transits}
              onCarsUpdated={(updated) => setTransits(updated)}
            />
          </React.Suspense>
        </AdminErrorBoundary>
      )}

    </div>
  );
}
