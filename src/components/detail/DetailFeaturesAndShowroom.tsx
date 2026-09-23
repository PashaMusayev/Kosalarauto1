import React from 'react';
import { DetailShowroomInfo } from './DetailShowroomInfo';

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

      {/* Avtosalon Məlumatı (YALNIZ MOBİLDƏ GÖSTƏRİLİR - Desktopda sağ yapışqan kartın daxilindədir) */}
      <div className="md:hidden">
        <DetailShowroomInfo variant="banner" />
      </div>
    </>
  );
};
