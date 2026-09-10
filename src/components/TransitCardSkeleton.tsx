import React from 'react';

export const TransitCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200/50 shadow-sm flex flex-col overflow-hidden select-none pointer-events-none">
      {/* Top Image Skeleton with Gray Shimmer */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200/80 to-slate-100 animate-shimmer" />
        
        {/* Subtle Heart icon placeholder */}
        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-200/60" />

        {/* Base length badge placeholder */}
        <div className="absolute bottom-1.5 left-1.5 h-3.5 w-11 bg-slate-200/70 rounded" />
      </div>

      {/* Card Body Skeleton (Turbo.az Style) */}
      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1.5 min-w-0">
          {/* Price placeholder */}
          <div className="h-4 sm:h-4.5 w-24 bg-slate-200 rounded animate-pulse" />

          {/* Title placeholder */}
          <div className="h-3 sm:h-3.5 w-32 sm:w-36 bg-slate-200/90 rounded animate-pulse" />

          {/* Specifications placeholder (Year, engine, km) */}
          <div className="h-2.5 sm:h-3 w-28 bg-slate-100 rounded animate-pulse" />
        </div>

        {/* Bottom City / Date placeholder */}
        <div className="pt-1 flex items-center justify-between">
          <div className="h-2.5 w-14 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
};
