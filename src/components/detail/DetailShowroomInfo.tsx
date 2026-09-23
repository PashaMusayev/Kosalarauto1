import React from 'react';
import { MapPin, Clock, Map, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { SHOWROOM_ADDRESS, SHOWROOM_MAP_URL, WORKING_HOURS } from '../../data/transits';

export interface DetailShowroomInfoProps {
  variant?: 'banner' | 'card';
  className?: string;
}

export const DetailShowroomInfo: React.FC<DetailShowroomInfoProps> = ({
  variant = 'banner',
  className = '',
}) => {
  if (variant === 'card') {
    return (
      <div className={`space-y-2.5 ${className}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-bold text-slate-900 truncate">Kosalar Auto</span>
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
        </div>

        <div className="space-y-1.5 text-xs">
          <a
            href={SHOWROOM_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-1.5 text-slate-700 hover:text-blue-600 transition-colors"
            title="Xəritədə baxın"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <span className="leading-snug underline decoration-slate-300 group-hover:decoration-blue-500 underline-offset-2">
              {SHOWROOM_ADDRESS}
            </span>
          </a>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{WORKING_HOURS}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#f8fafc] rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">Kosalar Auto</span>
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{SHOWROOM_ADDRESS}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{WORKING_HOURS}</span>
        </div>
      </div>

      <a 
        href={SHOWROOM_MAP_URL}
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-colors shrink-0"
      >
        <Map className="w-3.5 h-3.5" />
        <span>Xəritədə bax</span>
        <ArrowUpRight className="w-3 h-3" />
      </a>
    </div>
  );
};
