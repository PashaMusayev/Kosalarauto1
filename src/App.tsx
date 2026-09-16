import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { FilterBar } from './components/FilterBar';
import { TransitCard } from './components/TransitCard';
import { TransitCardSkeleton } from './components/TransitCardSkeleton';
import { TransitDetailModal } from './components/TransitDetailModal';
import { Pagination } from './components/Pagination';
import { AboutUs } from './components/AboutUs';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { ContactFooter } from './components/ContactFooter';
import { Footer } from './components/Footer';
import { AdminErrorBoundary } from './components/AdminErrorBoundary';
import { NotFound } from './components/NotFound';
import { INITIAL_TRANSITS, WHATSAPP_NUMBER, WHATSAPP_DIRECT_LINK } from './data/transits';
import { TransitCar, FilterState } from './types';
import { MessageCircle, Truck, Sparkles, FilterX } from 'lucide-react';
import whatsappLogo from './pics/whatsapp logo.png';
import { fetchCarsFromSupabase, fetchAllCarsFromApi } from './services/carService';
import { getSupabaseClient } from './services/supabaseClientInit';
import { trackWhatsAppClick } from './services/analyticsService';
import { filterAndSortTransits, parseMultiFilter } from './utils/filterUtils';

const AdminModal = React.lazy(() => import('./components/AdminModal'));

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

const CARS_PER_PAGE = 12;

const normalizePath = (p: string) => {
  try {
    let clean = p.toLowerCase().trim();
    if (!clean || clean === '' || clean === '/index.html') return '/';
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
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
  const [currentPage, setCurrentPage] = useState<number>(1);
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
      return p === '/admin444';
    }
    return false;
  });
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // References to keep latest path and cars available in event listeners without re-binding
  const currentPathRef = useRef(currentPath);
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  const transitsRef = useRef(transits);
  useEffect(() => {
    transitsRef.current = transits;
  }, [transits]);

  // Determine if the current route is 404 (Not Found)
  // Valid routes: '/' (home/catalog), '/admin444', '/haqqimizda', '/elaqe'
  const isHomeRoute = currentPath === '/' || currentPath === '' || currentPath === '/index.html';
  const isAdminRoute = currentPath === '/admin444';
  const isAboutRoute = currentPath === '/haqqimizda';
  const isContactRoute = currentPath === '/elaqe';
  const is404 = !isHomeRoute && !isAdminRoute && !isAboutRoute && !isContactRoute;

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
    } else if (isAboutRoute) {
      document.title = "Haqqımızda | Kosalar Auto";
    } else if (isContactRoute) {
      document.title = "Əlaqə | Kosalar Auto";
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
  }, [adminOpen, isAdminRoute, isAboutRoute, isContactRoute, is404]);

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
      if (p === '/admin444') {
        setAdminOpen(true);
      }
    } catch (e) {}

    const handlePopState = () => {
      const p = normalizePath(window.location.pathname);
      const pathChanged = p !== currentPathRef.current;
      setCurrentPath(p);
      currentPathRef.current = p;
      if (p === '/admin444') {
        setAdminOpen(true);
      } else {
        setAdminOpen(false);
      }

      // Read the car query param from the URL on every popstate event
      try {
        const params = new URLSearchParams(window.location.search);
        const carId = params.get('car');
        if (carId) {
          const list = transitsRef.current.length > 0 ? transitsRef.current : transits;
          const matchedCar = list.find(c => c.id.toLowerCase() === carId.toLowerCase());
          setSelectedCar(matchedCar || null);
        } else {
          setSelectedCar(null);
          detailOpenedFromCatalogRef.current = false;
        }
      } catch (e) {
        setSelectedCar(null);
        detailOpenedFromCatalogRef.current = false;
      }

      if (pathChanged) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const handleHashChange = () => {
      const p = normalizePath(window.location.pathname);
      setCurrentPath(p);
      if (p === '/admin444') {
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

  const detailOpenedFromCatalogRef = useRef<boolean>(false);

  // Sync modal state with URL - opening from catalog or favorites drawer
  const handleOpenDetail = useCallback((car: TransitCar) => {
    detailOpenedFromCatalogRef.current = true;
    setSelectedCar(car);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('car', car.id);
      url.searchParams.delete('overlay');
      url.searchParams.delete('photo');
      window.history.pushState({ carModal: true }, '', url.toString());
    } catch (e) {}
  }, []);

  // Switch to a similar car from within the open Detail Modal (REPLACES history state to prevent stack pollution)
  const handleSelectSimilarCar = useCallback((car: TransitCar) => {
    setSelectedCar(car);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('car', car.id);
      url.searchParams.delete('overlay');
      url.searchParams.delete('photo');
      // Use replaceState so that navigating through similar cars does NOT push new entries into the browser history stack
      window.history.replaceState({ carModal: detailOpenedFromCatalogRef.current }, '', url.toString());
    } catch (e) {}
  }, []);

  const handleCloseDetail = useCallback(() => {
    try {
      // Pop the history entry pushed when detail was opened, which dispatches popstate
      if (detailOpenedFromCatalogRef.current || window.history.state?.carModal || window.history.length > 1) {
        detailOpenedFromCatalogRef.current = false;
        window.history.back();
      } else {
        // Fallback for direct link in a fresh tab with no prior history
        detailOpenedFromCatalogRef.current = false;
        setSelectedCar(null);
        const url = new URL(window.location.href);
        url.searchParams.delete('car');
        url.searchParams.delete('overlay');
        url.searchParams.delete('photo');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      detailOpenedFromCatalogRef.current = false;
      window.history.back();
    }
  }, []);

  // Filter & Sort Logic (Only active cars displayed on the public visitor catalog)
  const filteredTransits = useMemo(() => {
    return filterAndSortTransits(transits, filters);
  }, [transits, filters]);

  // Reset pagination to page 1 whenever filters or sort criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Pagination calculations for the public catalog grid
  const totalPages = Math.ceil(filteredTransits.length / CARS_PER_PAGE);

  // If current page is beyond totalPages (e.g. after a filter or car deletion), clamp to last valid page
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const safeCurrentPage = totalPages > 0 ? Math.min(Math.max(1, currentPage), totalPages) : 1;

  // Paginated slice of cars to display on the current page
  const paginatedTransits = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * CARS_PER_PAGE;
    return filteredTransits.slice(startIndex, startIndex + CARS_PER_PAGE);
  }, [filteredTransits, safeCurrentPage]);

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

  // Handle site navigation between routes and catalog sections
  const handleNavigate = useCallback((target: string) => {
    if (target === '/haqqimizda' || target === 'haqqimizda') {
      try {
        window.history.pushState({}, '', '/haqqimizda');
      } catch (e) {}
      setCurrentPath('/haqqimizda');
      setAdminOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === '/elaqe' || target === 'elaqe') {
      try {
        window.history.pushState({}, '', '/elaqe');
      } catch (e) {}
      setCurrentPath('/elaqe');
      setAdminOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === '/' || target === 'hero' || target === 'home') {
      try {
        window.history.pushState({}, '', '/');
      } catch (e) {}
      setCurrentPath('/');
      setAdminOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === 'movcud-avtomobiller' || target === 'katalog') {
      if (currentPath !== '/') {
        try {
          window.history.pushState({}, '', '/');
        } catch (e) {}
        setCurrentPath('/');
        setAdminOpen(false);
        setTimeout(() => {
          scrollToSection('movcud-avtomobiller');
        }, 50);
      } else {
        scrollToSection('movcud-avtomobiller');
      }
    } else {
      scrollToSection(target);
    }
  }, [currentPath, scrollToSection]);

  // Handle page change and smoothly scroll back to top of catalog listings
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    scrollToSection('movcud-avtomobiller');
  }, [scrollToSection]);

  const handleOpenFavorites = useCallback(() => {
    setFavoritesOpen(true);
  }, []);

  const handleCallHero = useCallback(() => {
    handleNavigate('/elaqe');
  }, [handleNavigate]);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  if (is404) {
    return <NotFound onGoHome={handleGoHomeFrom404} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Header */}
      <Header
        favoritesCount={favoriteCars.length}
        onOpenFavorites={handleOpenFavorites}
        onNavigate={handleNavigate}
        currentPath={currentPath}
      />

      {/* Main Content */}
      <main className="flex-1">
        {isAboutRoute ? (
          /* Haqqımızda (About Us) Standalone Page View */
          <div>
            <div className="bg-white border-b border-slate-200/80 py-3.5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <button 
                  onClick={() => handleNavigate('/')} 
                  className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  Ana səhifə
                </button>
                <span className="text-slate-300">/</span>
                <span className="text-[#0F172A] font-bold">Haqqımızda</span>
              </div>
            </div>
            <AboutUs />
          </div>
        ) : isContactRoute ? (
          /* Əlaqə (Contact) Standalone Page View */
          <div>
            <div className="bg-white border-b border-slate-200/80 py-3.5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <button 
                  onClick={() => handleNavigate('/')} 
                  className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  Ana səhifə
                </button>
                <span className="text-slate-300">/</span>
                <span className="text-[#0F172A] font-bold">Əlaqə</span>
              </div>
            </div>
            <ContactFooter />
          </div>
        ) : (
          /* Homepage: dedicated purely to the car catalog */
          <>
            {/* Hero Section */}
            <Hero
              onCall={handleCallHero}
            />

            {/* Filter & Catalog Section */}
            <section id="katalog" className="py-4 sm:py-6 lg:py-7 bg-[#F8FAFC] scroll-mt-20 sm:scroll-mt-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-3 sm:space-y-4">
                
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

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs font-bold text-[#0F172A] bg-white px-3.5 py-1.5 rounded-xl border border-slate-200/50 shadow-xs">
                        {isLoading ? 'Yüklənir...' : `Ümumi: ${filteredTransits.length} model`}
                      </span>
                      {!isLoading && totalPages > 1 && (
                        <span className="text-xs font-bold text-[#1D4ED8] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/60 shadow-xs">
                          Səhifə {safeCurrentPage} / {totalPages}
                        </span>
                      )}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <TransitCardSkeleton key={index} />
                      ))}
                    </div>
                  ) : filteredTransits.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/60 shadow-sm max-w-xl mx-auto my-8 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto">
                        <FilterX className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-[#0F172A]">Axtarışınıza uyğun model tapılmadı</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Axtarış filtrlərini və ya qiymət aralığını dəyişərək yenidən cəhd edin və ya bütün avtomobillərə baxın.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-sm transition-colors cursor-pointer"
                      >
                        Filtri sıfırla
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-4">
                        {paginatedTransits.map((car, idx) => (
                          <TransitCard
                            key={car.id}
                            car={car}
                            onViewDetails={handleOpenDetail}
                            isFavorite={favorites.includes(car.id)}
                            onToggleFavorite={handleToggleFavorite}
                            priority={idx < 4}
                          />
                        ))}
                      </div>

                      {/* Turbo.az Style Pagination Controls */}
                      <Pagination
                        currentPage={safeCurrentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                      />
                    </>
                  )}
                </div>

              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      {!isContactRoute && <Footer onNavigate={handleNavigate} />}

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
        onSelectCar={handleSelectSimilarCar}
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
