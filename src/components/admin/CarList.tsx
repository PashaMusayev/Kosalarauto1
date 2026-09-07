import React from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  RefreshCw, 
  Edit3, 
  Trash2 
} from 'lucide-react';
import { TransitCar } from '../../types';
import { DEFAULT_VEHICLE_PLACEHOLDER, getValidImageUrl } from '../../utils/imageFallback';

interface CarListProps {
  carsList: TransitCar[];
  activeFilterTab: 'all' | 'active' | 'sold';
  adminSearchQuery: string;
  adminViewMode: 'table' | 'cards';
  updatingStatusCarId: string | null;
  deletingCarId: string | null;
  onToggleStatus: (car: TransitCar) => void;
  onEditCar: (car: TransitCar) => void;
  onDeleteCar: (carId: string | number, imageUrls?: string[]) => void;
}

export const CarList: React.FC<CarListProps> = ({
  carsList,
  activeFilterTab,
  adminSearchQuery,
  adminViewMode,
  updatingStatusCarId,
  deletingCarId,
  onToggleStatus,
  onEditCar,
  onDeleteCar
}) => {
  const filteredCars = (carsList || []).filter(car => {
    if (!car) return false;
    if (activeFilterTab === 'active' && car.status === 'sold') return false;
    if (activeFilterTab === 'sold' && car.status !== 'sold') return false;
    if (adminSearchQuery.trim()) {
      const q = adminSearchQuery.toLowerCase();
      const matchTitle = (car.title || '').toLowerCase().includes(q);
      const matchEngine = (car.engine || '').toLowerCase().includes(q);
      const matchYear = (car.year || '').toString().includes(q);
      if (!matchTitle && !matchEngine && !matchYear) return false;
    }
    return true;
  });

  return (
    <>
      {/* Cars List: MOBILE CARD VIEW (Active when viewMode is 'cards') */}
      {adminViewMode === 'cards' && (
        <div className="space-y-3">
          {filteredCars.map(car => {
            const feats = Array.isArray(car.features) ? car.features : [];
            const isSold = car.status === 'sold';
            const isUpdating = updatingStatusCarId === car.id;

            return (
              <div 
                key={`mobile-car-${car.id}`} 
                className={`bg-slate-950 p-3.5 rounded-xl border border-slate-800 shadow-md space-y-3 ${
                  isSold ? 'opacity-85 border-amber-500/20 bg-slate-950/70' : ''
                }`}
              >
                {/* Top: Image & Essential Info */}
                <div className="flex items-start gap-3">
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shrink-0 relative">
                    <img 
                      src={getValidImageUrl(car.primaryImage)} 
                      alt={car.title} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { 
                        const img = e.target as HTMLImageElement;
                        img.onerror = null;
                        img.src = DEFAULT_VEHICLE_PLACEHOLDER; 
                      }}
                    />
                    {isSold && (
                      <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center">
                        <span className="text-[9px] font-black text-amber-400 tracking-tighter">Satıldı</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-extrabold text-white text-sm leading-tight truncate">
                        {car.title}
                      </h4>
                      {car.isFeatured && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30 shrink-0">
                          Vitrin
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {car.year} il • {car.engine}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-300 border border-slate-800">
                        {car.baseLength} • {car.roofHeight}
                      </span>
                      <span className="font-bold text-xs text-slate-300">
                        {Number(car.mileage).toLocaleString()} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price & Features Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Qiymət:</span>
                    <span className="font-black text-emerald-400 text-sm sm:text-base">
                      {Number(car.price).toLocaleString()} AZN
                    </span>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => onEditCar(car)}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-950/40 hover:bg-blue-900/40 px-2.5 py-1 rounded-lg border border-blue-800/30"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>{feats.length} təchizat</span>
                  </button>
                </div>

                {/* Actions & Status Row */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  {/* Sadə Status Badge */}
                  <div>
                    {isSold ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>Satıldı</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Satışda</span>
                      </span>
                    )}
                  </div>

                  {/* Əməliyyatlar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(car)}
                      disabled={isUpdating}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all inline-flex items-center gap-1.5 ${
                        isSold
                          ? 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/40'
                          : 'bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-500/40'
                      }`}
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isSold ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Satışa çıxar</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Satıldı et</span>
                        </>
                      )}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => onEditCar(car)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold inline-flex items-center gap-1"
                      title="Redaktə et"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Redaktə</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => onDeleteCar(car.id, car.images)}
                      disabled={deletingCarId === car.id}
                      className={`p-1.5 rounded-lg text-rose-400 border transition-all ${
                        deletingCarId === car.id
                          ? 'bg-rose-950/80 border-rose-700 opacity-60 cursor-not-allowed'
                          : 'bg-rose-600/15 hover:bg-rose-600/30 border-rose-500/20 active:scale-95'
                      }`}
                      title="Sil"
                    >
                      {deletingCarId === car.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-300" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cars Table: RESPONSIVE TABLE VIEW WITH HORIZONTAL SCROLL (Default on mobile & desktop) */}
      {adminViewMode === 'table' && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
          {/* Mobile Horizontal Scroll Helper Banner */}
          <div className="md:hidden px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <span>👉</span>
              <span>Cədvəli tam görmək üçün sağa sürüşdürün</span>
            </span>
            <span className="text-[10px] bg-blue-500/15 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
              Üfüqi skroll
            </span>
          </div>

          <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-700">
            <table className="w-full text-left text-xs text-slate-300 min-w-[800px]">
              <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Şəkil</th>
                  <th className="py-3 px-4 whitespace-nowrap">Model və il</th>
                  <th className="py-3 px-4 whitespace-nowrap">Baza / dam</th>
                  <th className="py-3 px-4 whitespace-nowrap">Yürüş</th>
                  <th className="py-3 px-4 whitespace-nowrap">Təchizat</th>
                  <th className="py-3 px-4 whitespace-nowrap">Qiymət</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCars.map(car => {
                  const feats = Array.isArray(car.features) ? car.features : [];
                  const isSold = car.status === 'sold';
                  const isUpdating = updatingStatusCarId === car.id;

                  return (
                    <tr key={car.id} className={`hover:bg-slate-900/50 transition-colors ${isSold ? 'opacity-75 bg-slate-950/60' : ''}`}>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shrink-0 relative">
                          <img 
                            src={getValidImageUrl(car.primaryImage)} 
                            alt={car.title} 
                            className="w-full h-full object-cover" 
                            onError={(e) => { 
                              const img = e.target as HTMLImageElement;
                              img.onerror = null;
                              img.src = DEFAULT_VEHICLE_PLACEHOLDER; 
                            }}
                          />
                          {isSold && (
                            <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                              <span className="text-[9px] font-black text-amber-400 tracking-tighter">Satıldı</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          <span>{car.title}</span>
                          {car.isFeatured && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">Vitrin</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{car.year} il • {car.engine}</div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                          {car.baseLength} • {car.roofHeight}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-200 whitespace-nowrap">
                        {Number(car.mileage).toLocaleString()} km
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <button 
                          onClick={() => onEditCar(car)}
                          className="text-left group flex flex-col gap-0.5 p-1 rounded-lg hover:bg-slate-800 transition-all"
                          title="Təchizatı dəyişmək üçün klikləyin"
                        >
                          <div className="flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:text-blue-300">
                            <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                            <span>{feats.length} aktiv təchizat</span>
                          </div>
                          <span className="text-[10px] text-slate-400 line-clamp-1 max-w-[170px]">
                            {feats.slice(0, 3).join(', ')}{feats.length > 3 ? ` (+${feats.length - 3})` : ''}
                          </span>
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-emerald-400 whitespace-nowrap">
                        {Number(car.price).toLocaleString()} AZN
                      </td>
                      
                      {/* Status Sütunu (Sadə Badge) */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {isSold ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Satıldı</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Satışda</span>
                          </span>
                        )}
                      </td>

                      {/* Əməliyyatlar Sütunu (Status Dəyişmə + Redaktə + Sil) */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Status Dəyişmə Düyməsi */}
                          <button
                            type="button"
                            onClick={() => onToggleStatus(car)}
                            disabled={isUpdating}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all inline-flex items-center gap-1.5 ${
                              isSold
                                ? 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/40 shadow-sm'
                                : 'bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-500/40 shadow-sm'
                            }`}
                            title={isSold ? "Saytda yenidən satışa çıxar" : "Satıldı kimi qeyd et və saytdan gizlət"}
                          >
                            {isUpdating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isSold ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Satışa çıxar</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Satıldı et</span>
                              </>
                            )}
                          </button>

                          {/* Redaktə Düyməsi */}
                          <button 
                            type="button"
                            onClick={() => onEditCar(car)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                            title="Avtomobili redaktə et"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Redaktə</span>
                          </button>

                          {/* Sil Düyməsi */}
                          <button 
                            type="button"
                            onClick={() => onDeleteCar(car.id, car.images)}
                            disabled={deletingCarId === car.id}
                            className={`p-1.5 rounded-lg border transition-all ${
                              deletingCarId === car.id
                                ? 'bg-rose-950/80 border-rose-700 text-rose-300 opacity-60 cursor-not-allowed'
                                : 'bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 border-rose-500/20 active:scale-95'
                            }`}
                            title="Sil"
                          >
                            {deletingCarId === car.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-300" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};
