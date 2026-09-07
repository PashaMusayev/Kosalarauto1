import React from 'react';
import { Truck, DollarSign, CheckCircle2, RefreshCw } from 'lucide-react';
import whatsappLogo from '../../pics/whatsapp logo.png';
import { TransitCar } from '../../types';

interface DashboardKpiCardsProps {
  carsList: TransitCar[];
  whatsappClicks: number;
  isFetchingClicks: boolean;
  onRefreshAnalytics: () => void;
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  carsList,
  whatsappClicks,
  isFetchingClicks,
  onRefreshAnalytics
}) => {
  const safeCars = Array.isArray(carsList) ? carsList : [];
  const activeCars = safeCars.filter(c => c && c.status !== 'sold');
  const soldCars = safeCars.filter(c => c && c.status === 'sold');
  const activeCount = activeCars.length;
  const soldCount = soldCars.length;
  const inventoryValue = activeCars.reduce((sum, c) => sum + (Number(c?.price) || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      {/* KPI 1: Aktiv Transitlər */}
      <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-950 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-400">Aktiv Transitlər</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-white">{activeCount}</span>
          <span className="text-xs text-slate-400">avtomobil</span>
        </div>
        <div className="mt-1 text-[10px] sm:text-[11px] text-emerald-300/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Əsas saytda canlı satışda</span>
        </div>
      </div>

      {/* KPI 2: Anbarın Dəyəri */}
      <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 to-slate-950 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-blue-400">Anbarın dəyəri</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 flex items-baseline">
          <span className="text-lg sm:text-2xl font-black text-white">{inventoryValue.toLocaleString()} AZN</span>
        </div>
        <div className="mt-1 text-[10px] sm:text-[11px] text-blue-300/80">
          <span>Yalnız aktiv maşınların cəmi</span>
        </div>
      </div>

      {/* KPI 3: Bu Ay Satılanlar */}
      <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-950 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-400">Bu ay satılanlar</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-white">{soldCount}</span>
          <span className="text-xs text-slate-400">avtomobil</span>
        </div>
        <div className="mt-1 text-[10px] sm:text-[11px] text-amber-300/80">
          <span>Uğurla satılmış elanlar</span>
        </div>
      </div>

      {/* KPI 4: WhatsApp Müraciətləri */}
      <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#25D366]/40 bg-gradient-to-br from-emerald-950/30 to-slate-950 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#25D366]">WhatsApp müraciətləri</span>
            <button 
              type="button"
              onClick={onRefreshAnalytics}
              disabled={isFetchingClicks}
              title="Klik statistikasını Supabase-dən yenilə"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingClicks ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 flex items-center justify-center">
            <img 
              src={whatsappLogo} 
              alt="WhatsApp" 
              className="w-4 h-4 object-contain" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-white">{whatsappClicks}</span>
          <span className="text-xs text-slate-400">klik</span>
        </div>
        <div className="mt-1 text-[10px] sm:text-[11px] text-emerald-300/80 flex items-center justify-between">
          <span>Saytdan birbaşa müraciət</span>
          <span className="text-[10px] text-slate-400">id: 1</span>
        </div>
      </div>
    </div>
  );
};
