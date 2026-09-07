import React from 'react';
import { ArrowDown, Check } from 'lucide-react';

interface HeroProps {
  onBrowseCatalog: () => void;
  onCall?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onBrowseCatalog }) => {
  return (
    <section 
      id="hero" 
      className="relative bg-gradient-to-b from-white via-slate-50 to-[#F8FAFC] text-[#0F172A] overflow-hidden border-b border-slate-200 scroll-mt-20 sm:scroll-mt-24"
    >
      {/* Background Ambience Subtle Light Effects */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-sky-100/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10 text-center flex flex-col items-center space-y-3 sm:space-y-4">
        
        {/* Main Title (H1) */}
        <h1 className="text-[20px] sm:text-2xl md:text-3xl lg:text-[34px] font-black tracking-tight text-[#0F172A] leading-tight max-w-4xl">
          Azərbaycanda sürülməmiş{' '}
          <span className="text-[#1D4ED8]">
            Ford Transit
          </span>{' '}
          modelləri
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 text-xs sm:text-sm md:text-base max-w-2xl font-normal leading-normal text-balance">
          Avropadan xüsusi seçilib gətirilmiş, təmiz tarixçəli və ideal texniki vəziyyətdə kommersiya avtomobilləri.
        </p>

        {/* Advantages Checklist */}
        <div className="w-full max-w-3xl pt-1 pb-1">
          <ul className="flex flex-row flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm text-[#0F172A]">
            <li className="flex items-center gap-1 sm:gap-1.5 bg-white px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-200">
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
              </div>
              <span className="font-bold text-[10px] sm:text-xs md:text-sm text-[#0F172A] whitespace-nowrap">
                Avropa idxalı
              </span>
            </li>

            <li className="flex items-center gap-1 sm:gap-1.5 bg-white px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-200">
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
              </div>
              <span className="font-bold text-[10px] sm:text-xs md:text-sm text-[#0F172A] whitespace-nowrap">
                Orijinal yürüş
              </span>
            </li>

            <li className="flex items-center gap-1 sm:gap-1.5 bg-white px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-200">
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
              </div>
              <span className="font-bold text-[10px] sm:text-xs md:text-sm text-[#0F172A] whitespace-nowrap">
                Hazır sənədlər
              </span>
            </li>
          </ul>
        </div>

        {/* Call to Action (CTA) Button */}
        <div className="flex items-center justify-center pt-2 sm:pt-3 w-full">
          {/* Primary Solid Ford Blue (#1D4ED8) Button */}
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="group flex items-center justify-center gap-2 sm:gap-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-black text-xs sm:text-sm px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-md shadow-blue-700/20 hover:shadow-blue-700/35 transition-all duration-200 active:scale-95 cursor-pointer min-h-[40px] sm:min-h-[44px] whitespace-nowrap"
          >
            <span>Elanlara bax</span>
            <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-y-0.5" />
          </button>
        </div>

      </div>
    </section>
  );
};


