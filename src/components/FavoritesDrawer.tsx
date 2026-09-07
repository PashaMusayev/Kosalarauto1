import React from 'react';
import { X, Heart, Trash2, MessageCircle, Eye, Truck } from 'lucide-react';
import { TransitCar } from '../types';
import { WHATSAPP_NUMBER } from '../data/transits';
import { DEFAULT_VEHICLE_PLACEHOLDER, getValidImageUrl } from '../utils/imageFallback';
import { trackWhatsAppClick } from '../services/analyticsService';
import { useBodyScrollLock } from '../utils/scrollLock';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: TransitCar[];
  onRemoveFavorite: (carId: string) => void;
  onViewDetails: (car: TransitCar) => void;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onViewDetails
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overscroll-contain touch-pan-y" onClick={onClose}>
      
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden relative overscroll-contain" onClick={(e) => e.stopPropagation()}>
        
        {/* Drawer Header */}
        <div className="bg-[#0F172A] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-rose-500 fill-current" />
            <h3 className="font-extrabold text-lg text-white">
              Seçilmiş avtomobillər ({favorites.length})
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer List Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {favorites.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-[#0F172A]">Hələ ki, seçilmiş avtomobil yoxdur.</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Kataloqda bəyəndiyiniz Ford Transit modellərindəki ürək ikonasını sıxaraq bura əlavə edə bilərsiniz.
              </p>
            </div>
          ) : (
            favorites.filter(Boolean).map((car) => {
              const carLink = typeof window !== 'undefined' && car?.id
                ? `${window.location.origin}/?car=${encodeURIComponent(car.id)}`
                : `https://kosalarauto.az/?car=${car?.id || ''}`;

              const whatsappMsg = encodeURIComponent(
                `Salam! Kosalar Auto, seçilmişlərimdə olan bu avtomobil haqqında məlumat almaq istəyirəm:\n\n🚗 ${car?.title || 'Avtomobil'}${car?.year ? ` (${car.year}-ci il)` : ''} - ${(car?.price || 0).toLocaleString()} AZN\n\n🔗 Elanın linki:\n${carLink}`
              );

              return (
                <div
                  key={car?.id}
                  className="bg-[#F8FAFC] rounded-2xl p-3.5 border border-slate-200 flex items-center gap-3 relative group"
                >
                  <img
                    src={getValidImageUrl(car?.primaryImage)}
                    alt={car?.title || 'Ford Transit'}
                    referrerPolicy="no-referrer"
                    className="w-20 h-16 object-cover rounded-xl bg-slate-200 shrink-0"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.onerror = null;
                      img.src = DEFAULT_VEHICLE_PLACEHOLDER;
                    }}
                  />

                  <div 
                    onClick={() => {
                      onClose();
                      onViewDetails(car);
                    }}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-[#1D4ED8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {car?.year || ''}-ci il
                    </span>
                    <h4 className="font-bold text-xs text-[#0F172A] truncate mt-1 hover:text-[#1D4ED8] transition-colors">{car?.title || 'Ford Transit'}</h4>
                    <p className="text-sm font-extrabold text-[#1D4ED8] mt-0.5">
                      {(car?.price || 0).toLocaleString()} AZN
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        onClose();
                        onViewDetails(car);
                      }}
                      className="p-1.5 rounded-lg bg-blue-50 text-[#1D4ED8] hover:bg-blue-100 transition-colors border border-blue-200"
                      title="Bax"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsAppClick()}
                      className="p-1.5 rounded-lg bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-xs"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => car?.id && onRemoveFavorite(car.id)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors border border-rose-200"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        {favorites.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-sm"
            >
              Kataloqa qayıt
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
