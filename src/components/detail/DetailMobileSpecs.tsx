import React from 'react';

interface DetailMobileSpecsProps {
  safeLocation: string;
  safeMake: string;
  safeModel: string;
  safeYear: string;
  safeBodyType: string;
  safeSeatCount: string;
  safeColor: string;
  safeEngine: string;
  safeHp: string;
  safeFuelType: string;
  safeMileage: string;
  safeTransmission: string;
  safeWheelDrive: string;
  safeBaseLength: string;
  safeCondition: string;
}

export const DetailMobileSpecs: React.FC<DetailMobileSpecsProps> = ({
  safeLocation,
  safeMake,
  safeModel,
  safeYear,
  safeBodyType,
  safeSeatCount,
  safeColor,
  safeEngine,
  safeHp,
  safeFuelType,
  safeMileage,
  safeTransmission,
  safeWheelDrive,
  safeBaseLength,
  safeCondition,
}) => {
  return (
    <div className="border-b border-slate-200 pb-3 md:hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm">
        {/* Sol Sütun */}
        <div className="space-y-2">
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Şəhər</span>
            <span className="font-semibold text-slate-900">{safeLocation}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Marka</span>
            <span className="font-semibold text-slate-900">{safeMake}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Model</span>
            <span className="font-semibold text-slate-900">{safeModel}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Buraxılış ili</span>
            <span className="font-semibold text-slate-900">{safeYear || '-'}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Ban növü</span>
            <span className="font-semibold text-slate-900">{safeBodyType}</span>
          </div>
          {safeSeatCount ? (
            <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
              <span className="text-slate-500 font-normal">Yerlərin sayı</span>
              <span className="font-semibold text-slate-900">{safeSeatCount}</span>
            </div>
          ) : null}
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Rəng</span>
            <span className="font-semibold text-slate-900">{safeColor}</span>
          </div>
        </div>

        {/* Sağ Sütun */}
        <div className="space-y-2">
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Mühərrik</span>
            <span className="font-semibold text-slate-900">{safeEngine} L{safeHp ? ` / ${safeHp}` : ''} / {safeFuelType}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Yürüş</span>
            <span className="font-semibold text-slate-900">{safeMileage} km</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Sürətlər qutusu</span>
            <span className="font-semibold text-slate-900">{safeTransmission}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Ötürücü</span>
            <span className="font-semibold text-slate-900">{safeWheelDrive}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Baza uzunluğu</span>
            <span className="font-semibold text-slate-900">{safeBaseLength}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <span className="text-slate-500 font-normal">Vəziyyəti</span>
            <span className="font-semibold text-emerald-700">{safeCondition}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
