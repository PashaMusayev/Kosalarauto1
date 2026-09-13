import React from 'react';
import { Phone } from 'lucide-react';
import { PHONE_NUMBER } from '../../data/transits';
import whatsappLogo from '../../pics/whatsapp logo.png';
import { trackWhatsAppClick } from '../../services/analyticsService';

interface DetailMobileBottomBarProps {
  whatsappUrl: string;
}

export const DetailMobileBottomBar: React.FC<DetailMobileBottomBarProps> = ({ whatsappUrl }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 px-3.5 sm:px-4 pb-3.5 pt-2 flex md:hidden items-center gap-2.5 pointer-events-none">
      <a
        href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}
        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-700/30 active:scale-95 pointer-events-auto"
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
  );
};
