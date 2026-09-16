import React, { useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getValidImageUrl, handleImageLoadError } from '../../utils/imageFallback';

interface DetailPhotoGridProps {
  isOpen: boolean;
  onClose: () => void;
  imagesList: string[];
  title: string;
  onSelectPhoto: (index: number) => void;
  disabledEscape?: boolean;
}

export const DetailPhotoGrid: React.FC<DetailPhotoGridProps> = ({
  isOpen,
  onClose,
  imagesList,
  title,
  onSelectPhoto,
  disabledEscape = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`fixed inset-0 z-[65] flex flex-col bg-slate-100 select-none overflow-hidden ${
            disabledEscape ? 'pointer-events-none' : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} - Bütün şəkillər`}
        >
          {/* Turbo.az Mobil Şəkil Qalereyası Başlığı */}
          <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            {/* Geri Düyməsi */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              className="w-10 h-10 rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              title="Geri"
              aria-label="Geri"
            >
              <ArrowLeft className="w-5 h-5 text-slate-800" />
            </button>

            {/* Avtomobil Başlığı və Şəkil Sayı */}
            <div className="flex-1 min-w-0 px-3 text-center">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {title}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Bütün şəkillər ({imagesList.length})
              </p>
            </div>

            {/* Bağla Düyməsi */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              title="Bağla (Esc)"
              aria-label="Bağla"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2 Sütunlu Şəkil Qridi (Turbo.az Mobil Tərzi) */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-4xl mx-auto">
              {imagesList.map((img, idx) => (
                <button
                  key={`photo-grid-item-${idx}`}
                  type="button"
                  onClick={() => onSelectPhoto(idx)}
                  className="group relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-200 shadow-xs active:scale-[0.98] transition-transform cursor-pointer border border-slate-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                  title={`${idx + 1}-ci şəkil`}
                  aria-label={`${title} - ${idx + 1}-ci şəkil`}
                >
                  <img
                    src={getValidImageUrl(img)}
                    alt={`${title} - ${idx + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleImageLoadError(e.currentTarget)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Künc İndeks Sayğacı */}
                  <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[11px] font-semibold pointer-events-none">
                    {idx + 1}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
