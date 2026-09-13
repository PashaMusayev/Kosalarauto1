import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DetailMobileTitleBlockProps {
  safePrice: string;
  vehicleMainTitle: string;
  safeMileage: string;
}

export const DetailMobileTitleBlock: React.FC<DetailMobileTitleBlockProps> = ({
  safePrice,
  vehicleMainTitle,
  safeMileage,
}) => {
  return (
    <div className="border-b border-slate-200 pb-4 block w-full md:hidden">
      {/* Qiymət */}
      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
        {safePrice} <span className="text-xl sm:text-2xl font-extrabold text-slate-900">₼</span>
      </div>

      {/* Avtomobilin Tam Adı */}
      <h1 className="text-lg sm:text-xl font-bold text-black mt-2 leading-snug">
        <div className="text-lg sm:text-xl font-bold text-black">
          {vehicleMainTitle}
        </div>
        <div className="text-base sm:text-lg font-bold text-black mt-0.5">
          {safeMileage} km
        </div>
      </h1>

      {/* Status teqləri */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Gömrük olunub
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Azərbaycanda sürülməyib
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          Vuruqsuz və rəngsiz
        </span>
      </div>
    </div>
  );
};
