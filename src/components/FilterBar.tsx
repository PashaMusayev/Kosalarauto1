import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, ArrowLeft, ArrowUpDown, ChevronDown, Check, X } from 'lucide-react';
import { FilterState, TransitCar } from '../types';
import { countFilteredTransits } from '../utils/filterUtils';

interface FilterBarProps {
  cars?: TransitCar[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  totalResultsCount: number;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
}

interface DropdownOption {
  value: string;
  label: string;
}

const YEARS_LIST = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020',
  '2019', '2018', '2017', '2016', '2015',
  '2014', '2013', '2012', '2011', '2010',
  '2009', '2008', '2007', '2006', '2005',
  '2004', '2003', '2002', '2001', '2000'
];

const BRAND_OPTIONS: DropdownOption[] = [
  { value: 'Ford', label: 'Ford' },
  { value: 'Mercedes', label: 'Mercedes' }
];

const BODY_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'Yük furqonu', label: 'Yük furqonu' },
  { value: 'Sərnişin', label: 'Sərnişin' },
  { value: 'Mikroavtobus', label: 'Mikroavtobus' },
  { value: 'Bortlu / Tentli', label: 'Bortlu / Tentli' },
  { value: 'Soyuducu (Ref)', label: 'Soyuducu (Ref)' },
  { value: 'Pikap', label: 'Pikap' },
  { value: 'Şassi', label: 'Şassi' },
  { value: 'Digər', label: 'Digər' }
];

const BASE_LENGTH_OPTIONS: DropdownOption[] = [
  { value: '2.4 m', label: '2.4 m' },
  { value: '2.8 m', label: '2.8 m' },
  { value: '3.30 m', label: '3.30 m' },
  { value: '4 m', label: '4.0 m' }
];

const FUEL_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'Dizel', label: 'Dizel' },
  { value: 'Benzin', label: 'Benzin' }
];

const TRANSMISSION_OPTIONS: DropdownOption[] = [
  { value: 'Mexanika', label: 'Mexanika' },
  { value: 'Avtomat', label: 'Avtomat' }
];

const parseMulti = (val: string | string[] | undefined): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(v => v && v !== 'all' && v !== 'Hamısı');
  if (typeof val === 'string' && val !== 'all' && val !== 'Hamısı') {
    return val.split(',').map(s => s.trim()).filter(s => s && s !== 'all' && s !== 'Hamısı');
  }
  return [];
};

// ----------------------------------------------------------------------
// 1. TURBO.AZ CUSTOM MULTI-SELECT POPOVER COMPONENT
// ----------------------------------------------------------------------
interface TurboMultiSelectProps {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  value: string | string[] | undefined;
  onChange: (selected: string[]) => void;
  id?: string;
}

const TurboMultiSelect = React.memo<TurboMultiSelectProps>(({
  label,
  placeholder,
  options,
  value,
  onChange,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse currently selected values
  const selectedValues: string[] = React.useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(v => v && v !== 'all' && v !== 'Hamısı');
    if (typeof value === 'string' && value !== 'all' && value !== 'Hamısı') {
      return value.split(',').map(s => s.trim()).filter(s => s && s !== 'all' && s !== 'Hamısı');
    }
    return [];
  }, [value]);

  // Handle outside click to close popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (val: string) => {
    if (val === 'all') {
      onChange([]);
      return;
    }
    if (selectedValues.includes(val)) {
      const next = selectedValues.filter(v => v !== val);
      onChange(next);
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleResetAndClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Label display logic
  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return { text: placeholder, isPlaceholder: true };
    }
    if (selectedValues.length === 1) {
      const opt = options.find(o => o.value === selectedValues[0]);
      return { text: opt ? opt.label : selectedValues[0], isPlaceholder: false };
    }
    if (selectedValues.length === 2) {
      return { text: selectedValues.join(', '), isPlaceholder: false };
    }
    return { text: `${selectedValues.slice(0, 2).join(', ')} (+${selectedValues.length - 2})`, isPlaceholder: false };
  };

  const display = getDisplayText();

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      <label className="block text-xs font-black text-slate-500 tracking-wider mb-1.5 select-none">
        {label}
      </label>

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 bg-slate-50 hover:bg-slate-100/90 border rounded-xl px-3.5 flex items-center justify-between transition-all cursor-pointer select-none shadow-2xs ${
          isOpen
            ? 'border-[#1D4ED8] ring-2 ring-blue-500/20 bg-white'
            : selectedValues.length > 0
            ? 'border-slate-300 bg-white'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <span
            className={`truncate text-sm ${
              display.isPlaceholder
                ? 'text-slate-400 font-normal'
                : 'text-[#0F172A] font-bold'
            }`}
          >
            {display.text}
          </span>
          {selectedValues.length > 1 && (
            <span className="shrink-0 bg-blue-100 text-[#1D4ED8] text-[10px] font-black px-1.5 py-0.5 rounded-md">
              {selectedValues.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Təmizlə"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#1D4ED8]' : ''
            }`}
          />
        </div>
      </div>

      {/* Popover Menu - Compact Width & Smooth Downward Origin Animation */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 w-full max-w-[280px] bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 origin-top duration-200 ease-out flex flex-col transition-all">
          
          {/* Top Bar with ONLY red "✕ Sıfırla" button on the LEFT */}
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-start">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer select-none"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sıfırla</span>
            </button>
          </div>

          {/* Options list with custom checkboxes (Compact & Scrollable max-h-[280px]) */}
          <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-[260px] sm:max-h-[280px] overscroll-contain">
            {options.map((opt) => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => handleToggle(opt.value)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                    isChecked
                      ? 'bg-blue-50/80 text-[#1D4ED8] font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <div
                    className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-colors shrink-0 ml-2 ${
                      isChecked
                        ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Confirmation button */}
          <div className="p-2 border-t border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-black rounded-lg transition-colors cursor-pointer"
            >
              Təsdiqlə
            </button>
          </div>

        </div>
      )}
    </div>
  );
});

// ----------------------------------------------------------------------
// 2. TURBO.AZ CUSTOM YEAR SELECT POPOVER COMPONENT
// ----------------------------------------------------------------------
interface TurboYearSelectProps {
  placeholder: string;
  value: string | number | undefined;
  years: string[];
  onChange: (val: string | number) => void;
  id?: string;
}

const TurboYearSelect = React.memo<TurboYearSelectProps>(({
  placeholder,
  value,
  years,
  onChange,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasValue = Boolean(value && value !== 'all' && value !== '');

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectYear = (y: string) => {
    onChange(y === 'all' ? 'all' : Number(y));
    setIsOpen(false);
  };

  const handleResetAndClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('all');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('all');
  };

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 bg-slate-50 hover:bg-slate-100/90 border rounded-xl px-3 flex items-center justify-between transition-all cursor-pointer select-none shadow-2xs ${
          isOpen
            ? 'border-[#1D4ED8] ring-2 ring-blue-500/20 bg-white'
            : hasValue
            ? 'border-slate-300 bg-white'
            : 'border-slate-200'
        }`}
      >
        <span
          className={`truncate text-sm ${
            hasValue ? 'text-[#0F172A] font-bold' : 'text-slate-400 font-normal'
          }`}
        >
          {hasValue ? String(value) : placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Təmizlə"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#1D4ED8]' : ''
            }`}
          />
        </div>
      </div>

      {/* Custom Year Popover - Opens upwards on mobile (bottom-full mb-1.5 origin-bottom), downwards on sm+ (sm:top-full sm:bottom-auto sm:mt-1.5 sm:origin-top) */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 bottom-full mb-1.5 origin-bottom sm:top-full sm:bottom-auto sm:mt-1.5 sm:origin-top w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 ease-out flex flex-col transition-all">
          
          {/* Top Bar with ONLY red "✕ Sıfırla" button on the LEFT */}
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-start">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer select-none"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sıfırla</span>
            </button>
          </div>

          {/* Year Vertical Scroll List (max-h-[220px] sm:max-h-[240px]) */}
          <div className="p-1 max-h-[220px] sm:max-h-[240px] overflow-y-auto overscroll-contain space-y-0.5">
            {years.map((y) => {
              const isSelected = String(value) === String(y);
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => handleSelectYear(y)}
                  className={`w-full py-2.5 px-3 text-xs font-bold rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1D4ED8] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span>{y}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
});

// ----------------------------------------------------------------------
// 3. SHARED FILTER FIELDS CONTENT COMPONENT
// ----------------------------------------------------------------------
interface FilterFieldsContentProps {
  localFilters: FilterState;
  onLocalChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

const FilterFieldsContent: React.FC<FilterFieldsContentProps> = ({
  localFilters,
  onLocalChange
}) => {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Grid 1: Marka və Ban növü (Multi-Select Popovers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* 1. Marka (Brand) */}
        <TurboMultiSelect
          label="Marka"
          placeholder="Bütün markalar"
          options={BRAND_OPTIONS}
          value={localFilters.brand}
          onChange={(selected) => onLocalChange('brand', selected)}
        />

        {/* 2. Ban növü (Body Type) */}
        <TurboMultiSelect
          label="Ban növü"
          placeholder="Bütün ban növləri"
          options={BODY_TYPE_OPTIONS}
          value={localFilters.bodyType}
          onChange={(selected) => onLocalChange('bodyType', selected)}
        />
      </div>

      {/* Grid 2: Baza ölçüsü və Yanacaq növü */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* 3. Baza ölçüsü (Base Length) */}
        <TurboMultiSelect
          label="Baza ölçüsü"
          placeholder="Bütün baza ölçüləri"
          options={BASE_LENGTH_OPTIONS}
          value={localFilters.baseLength}
          onChange={(selected) => onLocalChange('baseLength', selected)}
        />

        {/* 4. Yanacaq növü (Fuel Type) */}
        <TurboMultiSelect
          label="Yanacaq növü"
          placeholder="Bütün yanacaq növləri"
          options={FUEL_TYPE_OPTIONS}
          value={localFilters.fuelType}
          onChange={(selected) => onLocalChange('fuelType', selected)}
        />
      </div>

      {/* Grid 3: Sürətlər qutusu və İstehsal ili */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* 5. Sürətlər qutusu (Transmission) */}
        <TurboMultiSelect
          label="Sürətlər qutusu"
          placeholder="Bütün sürətlər qutuları"
          options={TRANSMISSION_OPTIONS}
          value={localFilters.transmission}
          onChange={(selected) => onLocalChange('transmission', selected)}
        />

        {/* 6. İstehsal ili (Min və Max - Custom Grid Popovers) */}
        <div>
          <label className="block text-xs font-black text-slate-500 tracking-wider mb-1.5 select-none">
            İstehsal ili
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <TurboYearSelect
              placeholder="il, min."
              value={localFilters.minYear}
              years={YEARS_LIST}
              onChange={(val) => onLocalChange('minYear', val)}
            />

            <TurboYearSelect
              placeholder="il, maks."
              value={localFilters.maxYear}
              years={YEARS_LIST}
              onChange={(val) => onLocalChange('maxYear', val)}
            />
          </div>
        </div>
      </div>

      {/* Grid 4: Yürüş və Qiymət */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* 7. Yürüş, km */}
        <div>
          <label className="block text-xs font-black text-slate-500 tracking-wider mb-1.5 select-none">
            Yürüş, km
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative flex items-center">
              <input
                type="number"
                min={0}
                step={5000}
                placeholder="min."
                value={localFilters.minMileage > 0 ? localFilters.minMileage : ''}
                onChange={(e) => onLocalChange('minMileage', e.target.value ? Number(e.target.value) : 0)}
                className="w-full h-12 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 focus:border-[#1D4ED8] focus:bg-white text-[#0F172A] text-sm font-bold rounded-xl px-3.5 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
              />
              {localFilters.minMileage > 0 && (
                <button
                  type="button"
                  onClick={() => onLocalChange('minMileage', 0)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-red-500 rounded-full cursor-pointer"
                  title="Təmizlə"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                type="number"
                min={0}
                step={5000}
                placeholder="maks."
                value={localFilters.maxMileage > 0 ? localFilters.maxMileage : ''}
                onChange={(e) => onLocalChange('maxMileage', e.target.value ? Number(e.target.value) : 0)}
                className="w-full h-12 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 focus:border-[#1D4ED8] focus:bg-white text-[#0F172A] text-sm font-bold rounded-xl px-3.5 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
              />
              {localFilters.maxMileage > 0 && (
                <button
                  type="button"
                  onClick={() => onLocalChange('maxMileage', 0)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-red-500 rounded-full cursor-pointer"
                  title="Təmizlə"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 8. QİYMƏT, AZN */}
        <div>
          <label className="block text-xs font-black text-slate-500 tracking-wider mb-1.5 select-none">
            Qiymət, AZN
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative flex items-center">
              <input
                type="number"
                min={0}
                step={500}
                placeholder="min."
                value={localFilters.minPrice > 0 ? localFilters.minPrice : ''}
                onChange={(e) => onLocalChange('minPrice', e.target.value ? Number(e.target.value) : 0)}
                className="w-full h-12 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 focus:border-[#1D4ED8] focus:bg-white text-[#0F172A] text-sm font-bold rounded-xl px-3.5 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
              />
              {localFilters.minPrice > 0 && (
                <button
                  type="button"
                  onClick={() => onLocalChange('minPrice', 0)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-red-500 rounded-full cursor-pointer"
                  title="Təmizlə"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                type="number"
                min={0}
                step={500}
                placeholder="maks."
                value={localFilters.maxPrice > 0 ? localFilters.maxPrice : ''}
                onChange={(e) => onLocalChange('maxPrice', e.target.value ? Number(e.target.value) : 0)}
                className="w-full h-12 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 focus:border-[#1D4ED8] focus:bg-white text-[#0F172A] text-sm font-bold rounded-xl px-3.5 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
              />
              {localFilters.maxPrice > 0 && (
                <button
                  type="button"
                  onClick={() => onLocalChange('maxPrice', 0)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-red-500 rounded-full cursor-pointer"
                  title="Təmizlə"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. MAIN FILTER BAR COMPONENT
// ----------------------------------------------------------------------
export const FilterBar: React.FC<FilterBarProps> = ({
  cars = [],
  filters,
  onFilterChange,
  onResetFilters,
  totalResultsCount,
  isModalOpen,
  setIsModalOpen
}) => {
  // Local state for modal to allow fast editing and live preview count
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const desktopPanelRef = useRef<HTMLDivElement>(null);

  // Sync local filters when prop filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Compute live preview count inside the modal/dropdown without affecting the catalog grid
  const previewCount = useMemo(() => {
    if (!cars || cars.length === 0) return 0;
    return countFilteredTransits(cars, localFilters);
  }, [cars, localFilters]);

  // Lock body scroll ONLY on mobile (< 768px) when modal is open
  useEffect(() => {
    if (isModalOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Keyboard accessibility: Escape key closes the filter panel and focus is trapped inside desktop dropdown
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        return;
      }

      if (e.key === 'Tab' && desktopPanelRef.current && window.innerWidth >= 768) {
        const focusable = Array.from(
          desktopPanelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null);

        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, setIsModalOpen]);

  // Click outside listener for desktop dropdown
  useEffect(() => {
    if (!isModalOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (window.innerWidth >= 768 && desktopPanelRef.current && !desktopPanelRef.current.contains(e.target as Node)) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isModalOpen, setIsModalOpen]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => [
    parseMulti(filters.brand).length > 0,
    Boolean(filters.minYear && filters.minYear !== 'all' && filters.minYear !== ''),
    Boolean(filters.maxYear && filters.maxYear !== 'all' && filters.maxYear !== ''),
    parseMulti(filters.bodyType).length > 0,
    parseMulti(filters.baseLength).length > 0,
    parseMulti(filters.fuelType).length > 0,
    parseMulti(filters.transmission).length > 0,
    Boolean(filters.minMileage && filters.minMileage > 0),
    Boolean(filters.maxMileage && filters.maxMileage > 0),
    Boolean(filters.minPrice && filters.minPrice > 0),
    Boolean(filters.maxPrice && filters.maxPrice > 0)
  ].filter(Boolean).length, [filters]);

  const isFiltered = activeFilterCount > 0;

  const handleOpenModal = useCallback(() => {
    setLocalFilters(filters);
    setIsModalOpen(true);
  }, [filters, setIsModalOpen]);

  const handleToggleModal = useCallback(() => {
    if (isModalOpen) {
      setIsModalOpen(false);
    } else {
      setLocalFilters(filters);
      setIsModalOpen(true);
    }
  }, [isModalOpen, filters, setIsModalOpen]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, [setIsModalOpen]);

  const handleLocalChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const updated = {
      ...localFilters,
      [key]: value
    };
    setLocalFilters(updated);
    // Note: onFilterChange is intentionally NOT called here to prevent premature catalog re-renders before clicking Apply
  };

  const handleReset = useCallback(() => {
    const emptyFilters: FilterState = {
      brand: [],
      minYear: 'all',
      maxYear: 'all',
      year: 'all',
      bodyType: [],
      baseLength: [],
      fuelType: [],
      transmission: [],
      minPrice: 0,
      maxPrice: 0,
      minMileage: 0,
      maxMileage: 0,
      searchQuery: '',
      sortBy: 'featured'
    };
    setLocalFilters(emptyFilters);
  }, []);

  const handleResetAllAndApply = useCallback(() => {
    const emptyFilters: FilterState = {
      brand: [],
      minYear: 'all',
      maxYear: 'all',
      year: 'all',
      bodyType: [],
      baseLength: [],
      fuelType: [],
      transmission: [],
      minPrice: 0,
      maxPrice: 0,
      minMileage: 0,
      maxMileage: 0,
      searchQuery: '',
      sortBy: 'featured'
    };
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
    onResetFilters();
  }, [onFilterChange, onResetFilters]);

  const handleApply = useCallback(() => {
    onFilterChange(localFilters);
    setIsModalOpen(false);
    const catalogElem = document.getElementById('movcud-avtomobiller');
    if (catalogElem) {
      catalogElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [localFilters, onFilterChange, setIsModalOpen]);

  const formatList = (val: string | string[] | undefined) => {
    const arr = parseMulti(val);
    return arr.join(', ');
  };

  return (
    <div id="katalog-filter" className={`w-full relative ${isModalOpen ? 'z-50' : 'z-10'}`}>
      
      {/* ========================================================
          1. MAIN PAGE COMPACT TRIGGER (Only "Filtrlər" button & Sort)
         ======================================================== */}
      <div className="flex items-center justify-between gap-3">
        
        {/* Main "Filtrlər" Trigger Button + Desktop Dropdown Popover */}
        <div className="relative" ref={desktopPanelRef}>
          <button
            type="button"
            onClick={handleToggleModal}
            aria-expanded={isModalOpen}
            aria-haspopup="dialog"
            className={`flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer select-none ${
              isFiltered
                ? 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF] ring-2 ring-blue-500/30'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
            title="Filtrlər"
          >
            <SlidersHorizontal className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span>Filtrlər</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-[#1D4ED8] text-xs font-black px-2 py-0.5 rounded-full shadow-xs">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Desktop Anchored Dropdown Popover (md: and above) */}
          {isModalOpen && (
            <>
              {/* Semi-transparent Dimmed Backdrop on Desktop */}
              <div
                className="hidden md:block fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-[1px] transition-opacity"
                onClick={handleCloseModal}
                aria-hidden="true"
              />

              {/* Anchored Dropdown Panel positioned directly below the button */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Filtrlər paneli"
                className="hidden md:flex flex-col absolute top-full left-0 mt-2 z-50 w-[460px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 origin-top-left"
              >
                {/* Header with Title, Active Filter Badge, Sıfırla and Close X */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#1D4ED8]" />
                    <span className="text-sm font-black text-[#0F172A]">Filtrlər</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-[#1D4ED8] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-2xs">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs font-bold text-[#1D4ED8] hover:text-[#1E40AF] active:text-[#1e3a8a] hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Bütün filtrləri sıfırla"
                    >
                      Sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                      title="Bağla"
                      aria-label="Filtrləri bağla"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Internal Scrollable Filter Fields Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[min(520px,calc(100vh-200px))] overscroll-contain">
                  <FilterFieldsContent
                    localFilters={localFilters}
                    onLocalChange={handleLocalChange}
                  />
                </div>

                {/* Footer Action: "Nəticələri göstər (X elan)" & "Sıfırla" */}
                <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1e3a8a] text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Nəticələri göstər ({previewCount} elan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                    title="Bütün filtrləri sıfırla"
                  >
                    Sıfırla
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Sort dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
              className="bg-white border border-slate-200 hover:border-slate-300 text-[#0F172A] text-xs sm:text-sm rounded-xl py-2.5 sm:py-3 pl-3.5 pr-8 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1D4ED8] cursor-pointer appearance-none shadow-2xs transition-colors"
            >
              <option value="featured">Seçilmişlər öndə</option>
              <option value="price-asc">Qiymət: ucuzdan bahaya</option>
              <option value="price-desc">Qiymət: bahadan ucuza</option>
              <option value="year-desc">Buraxılış ili: ən yeni</option>
              <option value="mileage-asc">Yürüş: ən az</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* Active Filter Chips */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 px-1">
          <span className="text-[11px] font-bold text-slate-400">Aktiv:</span>

          {parseMulti(filters.brand).length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Marka: {formatList(filters.brand)}
              <button onClick={() => onFilterChange({ ...filters, brand: [] })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}
          
          {Boolean(filters.minYear && filters.minYear !== 'all') && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              İl min: {filters.minYear}
              <button onClick={() => onFilterChange({ ...filters, minYear: 'all' })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {Boolean(filters.maxYear && filters.maxYear !== 'all') && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              İl maks: {filters.maxYear}
              <button onClick={() => onFilterChange({ ...filters, maxYear: 'all' })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {parseMulti(filters.bodyType).length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Ban: {formatList(filters.bodyType)}
              <button onClick={() => onFilterChange({ ...filters, bodyType: [] })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {parseMulti(filters.baseLength).length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Baza: {formatList(filters.baseLength)}
              <button onClick={() => onFilterChange({ ...filters, baseLength: [] })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {parseMulti(filters.fuelType).length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Yanacaq: {formatList(filters.fuelType)}
              <button onClick={() => onFilterChange({ ...filters, fuelType: [] })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {parseMulti(filters.transmission).length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Sürətlər qutusu: {formatList(filters.transmission)}
              <button onClick={() => onFilterChange({ ...filters, transmission: [] })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {Boolean(filters.minMileage && filters.minMileage > 0) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Yürüş &gt;= {filters.minMileage.toLocaleString()} km
              <button onClick={() => onFilterChange({ ...filters, minMileage: 0 })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {Boolean(filters.maxMileage && filters.maxMileage > 0) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Yürüş &lt;= {filters.maxMileage.toLocaleString()} km
              <button onClick={() => onFilterChange({ ...filters, maxMileage: 0 })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {Boolean(filters.minPrice && filters.minPrice > 0) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Qiymət &gt;= {filters.minPrice.toLocaleString()} ₼
              <button onClick={() => onFilterChange({ ...filters, minPrice: 0 })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          {Boolean(filters.maxPrice && filters.maxPrice > 0) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
              Qiymət &lt;= {filters.maxPrice.toLocaleString()} ₼
              <button onClick={() => onFilterChange({ ...filters, maxPrice: 0 })} className="hover:text-red-500 font-bold ml-0.5 cursor-pointer">×</button>
            </span>
          )}

          <button
            onClick={handleResetAllAndApply}
            className="text-[11px] font-bold text-red-600 hover:underline ml-1 cursor-pointer"
          >
            Hamısını sıfırla
          </button>
        </div>
      )}

      {/* ========================================================
          2. FULL-SCREEN TURBO.AZ STYLE FILTER VIEW (Mobile only: below md)
         ======================================================== */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] flex flex-col bg-white text-slate-900 animate-in fade-in duration-150 md:hidden">
          
          {/* ----------------------------------------------------
              HEADER HİSSƏSİ (Turbo.az Style 3-Column Layout):
              1. Yuxarı Sol: Geri düyməsi (< ikonu)
              2. Yuxarı Mərkəz: "Filtrlər"
              3. Yuxarı Sağ: "Sıfırla"
             ---------------------------------------------------- */}
          <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.05)] shrink-0">
            
            {/* Yuxarı Sol: Geri düyməsi */}
            <div className="w-20 flex justify-start items-center">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-10 h-10 -ml-1 text-slate-800 hover:text-black hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors flex items-center justify-center cursor-pointer"
                title="Geri"
                aria-label="Pəncərəni bağla"
              >
                <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
              </button>
            </div>

            {/* Yuxarı Mərkəz: "Filtrlər" */}
            <h1 className="flex-1 text-center text-base sm:text-lg font-black text-[#0F172A] tracking-tight select-none">
              Filtrlər
            </h1>

            {/* Yuxarı Sağ: "Sıfırla" düyməsi */}
            <div className="w-20 flex justify-end items-center">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs sm:text-sm font-extrabold text-[#1D4ED8] hover:text-[#1E40AF] active:text-[#1e3a8a] hover:bg-blue-50/80 active:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Bütün filtrləri sıfırla"
              >
                Sıfırla
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------
              SCROLLABLE FILTER SECTIONS WITH TURBO.AZ CUSTOM POPOVERS
             ---------------------------------------------------- */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 max-w-3xl mx-auto w-full overscroll-contain">
            <FilterFieldsContent
              localFilters={localFilters}
              onLocalChange={handleLocalChange}
            />
          </div>

          {/* ----------------------------------------------------
              STICKY BOTTOM ACTION: "Axtar (X elan)"
             ---------------------------------------------------- */}
          <div className="sticky bottom-0 z-30 bg-white border-t border-slate-200 p-4 shadow-lg">
            <div className="max-w-3xl mx-auto w-full">
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-4 px-6 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1e3a8a] text-white font-black text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Axtar ({previewCount} elan)</span>
              </button>
            </div>
          </div>

        </div>,
        document.body
      )}

    </div>
  );
};

