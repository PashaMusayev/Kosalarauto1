import React from 'react';
import { MapPin, Clock, Map, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { SHOWROOM_ADDRESS, SHOWROOM_MAP_URL, WORKING_HOURS } from '../../data/transits';

interface DetailFeaturesAndShowroomProps {
  description?: string;
  activeFeaturesList: string[];
}

export const DetailFeaturesAndShowroom: React.FC<DetailFeaturesAndShowroomProps> = ({
  description,
  activeFeaturesList,
}) => {
  return (
    <>
      {/* 3. QEYD VƏ TƏSVİR (TURBO.AZ SADƏ PARAQRAF FORMATI - ƏVVƏL GƏLİR) */}
      <div className="border-b border-slate-200 pb-6 text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
        {description || 'Almaniyadan yeni gətirilib. Azərbaycanda sürülməyib. 100% gömrük olunub. Vuruğu, dəyişən detalı, pası və ya çürüyü qətiyyən yoxdur. Orijinal probeq. Mühərrik, sürət qutusu və asqı sistemi ideal vəziyyətdədir. Bütün sənədləri qaydasındadır, dərhal ada keçirilir. Real alıcı ilə maşının yanında razılaşmaq olar.'}
      </div>

      {/* 4. TƏCHİZAT (TURBO.AZ SƏTİR DÜZÜLÜŞÜ - TƏSVİRDƏN SONRA GƏLİR) */}
      {activeFeaturesList && activeFeaturesList.length > 0 && (
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {activeFeaturesList.map((feature, idx) => (
              <span 
                key={idx}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-100 text-slate-800 text-xs sm:text-sm font-medium border border-slate-200"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Avtosalon Məlumatı */}
      <div className="bg-[#f8fafc] rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
    </>
  );
};
