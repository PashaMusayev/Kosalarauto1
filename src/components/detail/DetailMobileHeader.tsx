import React from 'react';
import { ArrowLeft, Share2, Check, Heart } from 'lucide-react';

interface DetailMobileHeaderProps {
  onClose: () => void;
  onShare: () => void;
  copied: boolean;
  isFavorite: boolean;
  onToggleFavorite?: () => void;
}

export const DetailMobileHeader: React.FC<DetailMobileHeaderProps> = ({
  onClose,
  onShare,
  copied,
  isFavorite,
  onToggleFavorite
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-7 sm:pt-3.5 pb-3 sm:pb-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0 relative">
      {/* 1. Sol: Geri Düyməsi (Yalnız İkon, iri və aydın toxunma sahəsi ilə) */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center transition-all shadow-xs"
          title="Geri"
          aria-label="Geri"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" />
        </button>
      </div>

      {/* 2. Tam Ortada: KOSALAR AUTO (İri, Göy şriftlə) */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 h-10 flex items-center justify-center pointer-events-none">
        <span className="text-base sm:text-xl font-black text-[#1D4ED8] tracking-wider select-none">
          Kosalar Auto
        </span>
      </div>

      {/* 3. Sağ: Paylaş və Seçilmişlər (Ürək) Düymələri */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={onShare}
          className="h-10 px-3 sm:px-3.5 rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm font-bold shadow-xs"
          title="Paylaş"
          aria-label="Paylaş"
        >
          {copied ? <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600" /> : <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700" />}
          <span className="hidden sm:inline">{copied ? 'Kopyalandı' : 'Paylaş'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleFavorite}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl transition-all flex items-center justify-center active:scale-95 shadow-xs ${
            isFavorite 
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' 
              : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
          }`}
          title={isFavorite ? "Seçilmişlərdən çıxart" : "Seçilmişlərə əlavə et"}
          aria-label="Seçilmişlər"
        >
          <Heart className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${
            isFavorite ? 'fill-rose-600 text-rose-600' : 'text-slate-700'
          }`} />
        </button>
      </div>
    </div>
  );
};
