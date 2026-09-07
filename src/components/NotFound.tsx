import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  onGoHome: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 selection:bg-[#1D4ED8] selection:text-white">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          404 - Səhifə tapılmadı
        </h1>
        <p className="text-sm text-slate-500">
          Axtardığınız səhifə mövcud deyil və ya ünvan yanlışdır.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Əsas səhifəyə qayıt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
