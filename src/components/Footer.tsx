import React from 'react';
import { Phone, MessageCircle, MapPin, Clock } from 'lucide-react';
import { PHONE_NUMBER, WHATSAPP_NUMBER, SHOWROOM_ADDRESS, WORKING_HOURS, SHOWROOM_MAP_URL, WHATSAPP_DIRECT_LINK } from '../data/transits';
import fordLogo from '../pics/ford logo.png';
import whatsappLogo from '../pics/whatsapp logo.png';
import { trackWhatsAppClick } from '../services/analyticsService';

interface FooterProps {
  onNavigate: (target: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleLink = (target: string) => {
    if (target === '/haqqimizda') {
      try {
        window.history.pushState({}, '', '/haqqimizda');
      } catch (e) {}
      onNavigate('/haqqimizda');
    } else if (target === '/elaqe') {
      try {
        window.history.pushState({}, '', '/elaqe');
      } catch (e) {}
      onNavigate('/elaqe');
    } else if (target === '/') {
      try {
        window.history.pushState({}, '', '/');
      } catch (e) {}
      onNavigate('/');
    } else {
      onNavigate(target);
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400 pt-12 pb-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-slate-900">
          
          {/* Brand Info (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center text-white border border-blue-400/40 shadow-lg shadow-blue-900/40">
                <img 
                  src={fordLogo}
                  alt="Kosalar Auto" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="font-black text-xl text-white tracking-tight">Kosalar Auto</span>
                <p className="text-[11px] text-slate-400 font-medium">Ford Transit satış mərkəzi</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Ford Transit avtomobillərinin satışı üzrə ixtisaslaşmışıq. Şəffaf yürüş, dürüst texniki vəziyyət və keyfiyyətli xidmət təqdim edirik.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <a
                href={WHATSAPP_DIRECT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick()}
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all"
                title="WhatsApp ilə əlaqə"
              >
                <img 
                  src={whatsappLogo} 
                  alt="WhatsApp" 
                  className="w-3.5 h-3.5 object-contain"
                  referrerPolicy="no-referrer"
                />
                <span>WhatsApp</span>
              </a>

              <a
                href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-800 transition-all"
                title={`Zəng: ${PHONE_NUMBER}`}
              >
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>{PHONE_NUMBER}</span>
              </a>
            </div>
          </div>

          {/* Quick Navigation Links (3 cols on lg) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Naviqasiya
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <button
                  onClick={() => handleLink('/')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Ana səhifə
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('movcud-avtomobiller')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Avtomobillər (Kataloq)
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/haqqimizda')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Haqqımızda
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/elaqe')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Əlaqə və ünvan
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Address (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Ünvan və saatlar
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <a
                href={SHOWROOM_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-slate-400 hover:text-white transition-colors group"
                title="Google Maps-də bax"
              >
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 group-hover:text-blue-300 transition-colors" />
                <span className="group-hover:underline underline-offset-2">{SHOWROOM_ADDRESS}</span>
              </a>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{WORKING_HOURS}</span>
              </div>
              <div className="pt-1">
                <a
                  href={SHOWROOM_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 underline underline-offset-2"
                >
                  Google Maps-də bax →
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright Strip */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} Kosalar Auto. Bütün hüquqlar qorunur.</p>
          <p className="text-[11px]">Keyfiyyətli və zəmanətli Ford Transit satışı</p>
        </div>

      </div>
    </footer>
  );
};
