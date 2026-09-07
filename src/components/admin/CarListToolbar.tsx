import React, { useState } from 'react';
import { LayoutGrid, Car, Search, Plus } from 'lucide-react';

interface CarListToolbarProps {
  carsCount: number;
  activeCount: number;
  soldCount: number;
  activeFilterTab: 'all' | 'active' | 'sold';
  setActiveFilterTab: (tab: 'all' | 'active' | 'sold') => void;
  adminViewMode: 'table' | 'cards';
  setAdminViewMode: (mode: 'table' | 'cards') => void;
  adminSearchQuery: string;
  setAdminSearchQuery: (query: string) => void;
  onOpenAddCar: () => void;
}

export const CarListToolbar: React.FC<CarListToolbarProps> = ({
  carsCount,
  activeCount,
  soldCount,
  activeFilterTab,
  setActiveFilterTab,
  adminViewMode,
  setAdminViewMode,
  adminSearchQuery,
  setAdminSearchQuery,
  onOpenAddCar
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setActiveFilterTab('all')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeFilterTab === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Bütün elanlar ({carsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilterTab('active')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeFilterTab === 'active'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'bg-slate-900 text-emerald-400/80 hover:text-emerald-300 border border-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400"></span>
          <span>Satışda ({activeCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilterTab('sold')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeFilterTab === 'sold'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'bg-slate-900 text-amber-400/80 hover:text-amber-300 border border-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400"></span>
          <span>Satılanlar ({soldCount})</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
        {/* View switcher: Cədvəl / Kartlar */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAdminViewMode('table')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              adminViewMode === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Cədvəl rejimini göstər"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cədvəl</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminViewMode('cards')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              adminViewMode === 'cards'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Kart rejimini göstər"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Kartlar</span>
          </button>
        </div>

        <div className="relative flex-1 sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={adminSearchQuery}
            onChange={(e) => setAdminSearchQuery(e.target.value)}
            placeholder="Model, il, mühərrik axtar..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button 
          onClick={onOpenAddCar}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni avtomobil</span>
        </button>
      </div>
    </div>
  );
};
