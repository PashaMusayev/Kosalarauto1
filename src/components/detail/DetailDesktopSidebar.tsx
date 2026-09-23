import React from 'react';
import { Phone } from 'lucide-react';
import { PHONE_NUMBER } from '../../data/transits';
import whatsappLogo from '../../pics/whatsapp logo.png';
import { trackWhatsAppClick } from '../../services/analyticsService';

export interface DetailDesktopSidebarProps {
  safePrice: string;
  vehicleMainTitle: string;
  safeMileage: string;
  whatsappUrl: string;
}

export const DetailDesktopSidebar: React.FC<DetailDesktopSidebarProps> = ({
  safePrice,
  vehicleMainTitle,
  safeMileage,
  whatsappUrl,
}) => {
  return (
    <div className="hidden md:flex md:w-[42%] lg:w-[40%] flex-col p-6 lg:p-7 bg-white border-l border-slate-200 md:sticky md:top-0 md:self-start z-10">
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
          {safeMileage && safeMileage !== '0' ? (
            <div className="text-sm font-semibold text-slate-600 mt-1">
              {safeMileage} km
            </div>
          ) : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Gömrük olunub
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Azərbaycanda sürülməyib
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Vuruqsuz və rəngsiz
            </span>
          </div>
        </div>
      </div>

      {/* Ən aşağıda bir-birinin altında iri və diqqətçəkən "Zəng et" və "WhatsApp ilə yaz" düymələri */}
      <div className="pt-5 border-t border-slate-200 space-y-2.5 mt-5">
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
  );
};
