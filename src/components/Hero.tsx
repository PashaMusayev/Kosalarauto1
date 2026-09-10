import React from 'react';

interface HeroProps {
  onBrowseCatalog?: () => void;
  onCall?: () => void;
}

export const Hero: React.FC<HeroProps> = () => {
  return (
    <section 
      id="hero" 
      className="relative bg-gradient-to-b from-white via-slate-50 to-[#F8FAFC] text-[#0F172A] border-b border-slate-200 scroll-mt-20 sm:scroll-mt-24"
    >
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3.5 text-center flex items-center justify-center">
        {/* Compact Single-Line-Height Title (H1) */}
        <h1 className="text-xs sm:text-sm md:text-base font-bold sm:font-extrabold tracking-tight text-[#0F172A] leading-tight">
          Azərbaycanda sürülməmiş{' '}
          <span className="text-[#1D4ED8]">
            Ford Transit
          </span>{' '}
          modelləri
        </h1>
      </div>
    </section>
  );
};


