import React from 'react';

interface HeroProps {
  onBrowseCatalog?: () => void;
  onCall?: () => void;
}

export const Hero: React.FC<HeroProps> = () => {
  return (
    <section 
      id="hero" 
      className="relative bg-[#F8FAFC] text-[#0F172A] scroll-mt-20 sm:scroll-mt-24"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-1 text-center sm:text-left flex items-center justify-between">
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


