import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, Menu, X, Shield, Heart, Truck, Clock, MapPin } from 'lucide-react';
import { PHONE_NUMBER, WHATSAPP_NUMBER, WHATSAPP_DIRECT_LINK } from '../data/transits';
import fordLogo from '../pics/ford logo.png';
import whatsappLogo from '../pics/whatsapp logo.png';
import { trackWhatsAppClick } from '../services/analyticsService';

interface HeaderProps {
  favoritesCount: number;
  onOpenFavorites: () => void;
  onNavigate: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  favoritesCount,
  onOpenFavorites,
  onNavigate
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (id: string) => {
    setMobileMenuOpen(false);
    // Request animation frame allows mobile menu to close smoothly before scroll offset is calculated
    requestAnimationFrame(() => {
      onNavigate(id);
    });
  };

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md text-slate-900 shadow-md py-3 border-b border-slate-200' 
        : 'bg-white text-slate-900 py-3.5 border-b border-slate-200'
    }`}>
      {/* Top micro bar for quick trust info */}
      <div className="hidden lg:block bg-[#F8FAFC] text-slate-600 text-xs py-1.5 border-b border-slate-200 mb-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#1D4ED8]" />
              İş saatları: B.e - B. 09:00 - 19:00
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#1D4ED8]" />
              Bakı, Yeni Günəşli qəsəbəsi, Fatimeyi-Zəhra məscidin yanı
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => handleLinkClick('hero')} 
          className="flex items-center gap-3 group text-left"
        >
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#0F172A] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform border border-slate-200">
            <img 
              src={fordLogo} 
              alt="Kosalar Auto Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Truck className="w-6 h-6 text-[#1D4ED8] hidden group-has-[img:not([style*='display: none'])]:hidden" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-tight text-[#0F172A] group-hover:text-[#1D4ED8] transition-colors">
                Kosalar Auto
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Ford Transit mərkəzi</p>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => handleLinkClick('hero')} 
            className="text-sm font-bold text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
          >
            Ana səhifə
          </button>
          <button 
            onClick={() => handleLinkClick('movcud-avtomobiller')} 
            className="text-sm font-bold text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
          >
            Avtomobillər
          </button>
          <button 
            onClick={() => handleLinkClick('haqqimizda')} 
            className="text-sm font-bold text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
          >
            Haqqımızda
          </button>
          <button 
            onClick={() => handleLinkClick('elaqe')} 
            className="text-sm font-bold text-[#0F172A] hover:text-[#1D4ED8] transition-colors"
          >
            Əlaqə
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Favorites Button */}
          <button 
            onClick={onOpenFavorites}
            className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 shadow-xs"
            title="Seçilmişlər"
          >
            <Heart className="w-5 h-5 text-rose-600" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center animate-bounce shadow-md">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Quick Phone Call Button (Icon only, on the left) */}
          <a
            href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}
            className="w-10 h-10 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white flex items-center justify-center shadow-sm transition-all hover:scale-105"
            title={`Zəng et: ${PHONE_NUMBER}`}
            aria-label={`Zəng et: ${PHONE_NUMBER}`}
          >
            <Phone className="w-4 h-4 text-white" />
          </a>

          {/* WhatsApp Direct Chat (On the right) */}
          <a
            href={WHATSAPP_DIRECT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick()}
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-sm transition-all hover:scale-105"
            title="WhatsApp"
          >
            <img 
              src={whatsappLogo} 
              alt="WhatsApp" 
              className="w-4 h-4 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="inline whitespace-nowrap">WhatsApp</span>
          </a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <button 
            onClick={onOpenFavorites}
            className="relative p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
          >
            <Heart className="w-5 h-5 text-rose-600" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
            aria-label="Menyu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 mt-3 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-2">
            <button 
              onClick={() => handleLinkClick('hero')} 
              className="text-left px-3 py-2 rounded-lg text-[#0F172A] hover:bg-slate-100 font-bold text-sm"
            >
              Ana səhifə
            </button>
            <button 
              onClick={() => handleLinkClick('movcud-avtomobiller')} 
              className="text-left px-3 py-2 rounded-lg text-[#0F172A] hover:bg-slate-100 font-bold text-sm"
            >
              Avtomobillər (kataloq)
            </button>
            <button 
              onClick={() => handleLinkClick('haqqimizda')} 
              className="text-left px-3 py-2 rounded-lg text-[#0F172A] hover:bg-slate-100 font-bold text-sm"
            >
              Haqqımızda
            </button>
            <button 
              onClick={() => handleLinkClick('elaqe')} 
              className="text-left px-3 py-2 rounded-lg text-[#0F172A] hover:bg-slate-100 font-bold text-sm"
            >
              Əlaqə
            </button>
          </nav>

          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2.5">
            <a
              href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}
              className="h-11 flex items-center justify-center gap-2 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold rounded-xl text-sm shadow-sm transition-all"
              title={`Zəng et: ${PHONE_NUMBER}`}
              aria-label={`Zəng et: ${PHONE_NUMBER}`}
            >
              <Phone className="w-4 h-4 text-white" />
              <span>Zəng et</span>
            </a>
            <a
              href={WHATSAPP_DIRECT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick()}
              className="h-11 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-sm shadow-sm transition-all"
            >
              <img 
                src={whatsappLogo} 
                alt="WhatsApp" 
                className="w-4 h-4 object-contain"
                referrerPolicy="no-referrer"
              />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
