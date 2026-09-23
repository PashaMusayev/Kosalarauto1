import React, { useState, useRef, useEffect } from 'react';
import { 
  Images, 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Square, 
  Check, 
  Sparkles,
  Layers
} from 'lucide-react';
import { TransitCar } from '../../types';
import { getThumbnailUrl, isThumbnailFailed } from '../../utils/imageFallback';
import { uploadThumbnailForImage } from '../../services/imageStorageService';

interface ThumbnailBackfillModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: TransitCar[];
}

interface ImageTask {
  fullUrl: string;
  carTitle: string;
  carId: string;
}

export const ThumbnailBackfillModal: React.FC<ThumbnailBackfillModalProps> = ({
  isOpen,
  onClose,
  cars
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    message: '',
    currentCarTitle: '',
    currentThumbUrl: ''
  });
  const [stats, setStats] = useState({
    generated: 0,
    skipped: 0,
    errors: 0
  });

  const isCancelledRef = useRef(false);

  // Extract all unique candidate image URLs from cars
  const candidateTasks: ImageTask[] = React.useMemo(() => {
    if (!cars || cars.length === 0) return [];

    const seen = new Set<string>();
    const tasks: ImageTask[] = [];

    cars.forEach(car => {
      const allUrls = [car.primaryImage, ...(car.images || [])].filter(Boolean);
      const carTitle = car.title || `${car.brand || 'Ford'} ${car.model || 'Transit'} (${car.year || ''})`;

      allUrls.forEach(url => {
        if (!url || typeof url !== 'string') return;
        const clean = url.trim();

        // Skip non-storage or data/blob images
        if (
          clean.startsWith('data:') ||
          clean.startsWith('blob:') ||
          clean.endsWith('.svg') ||
          clean.includes('__thumb.')
        ) {
          return;
        }

        if (!seen.has(clean)) {
          seen.add(clean);
          tasks.push({
            fullUrl: clean,
            carTitle,
            carId: car.id
          });
        }
      });
    });

    return tasks;
  }, [cars]);

  useEffect(() => {
    if (!isOpen) {
      isCancelledRef.current = true;
      setIsRunning(false);
      setIsFinished(false);
      setProgress({
        current: 0,
        total: 0,
        percentage: 0,
        message: '',
        currentCarTitle: '',
        currentThumbUrl: ''
      });
      setStats({
        generated: 0,
        skipped: 0,
        errors: 0
      });
    }
  }, [isOpen]);

  const handleStartBackfill = async () => {
    if (candidateTasks.length === 0) return;

    isCancelledRef.current = false;
    setIsRunning(true);
    setIsFinished(false);

    let generatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const total = candidateTasks.length;

    for (let i = 0; i < total; i++) {
      if (isCancelledRef.current) break;

      const task = candidateTasks[i];
      const thumbUrl = getThumbnailUrl(task.fullUrl);

      setProgress({
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
        message: `Şəkil ${i + 1} / ${total} emal edilir...`,
        currentCarTitle: task.carTitle,
        currentThumbUrl: thumbUrl
      });

      // 1. Fast existence check via HEAD request
      let alreadyExists = false;
      try {
        const headRes = await fetch(thumbUrl, { method: 'HEAD', cache: 'no-cache' });
        if (headRes.ok) {
          alreadyExists = true;
        }
      } catch {
        // If HEAD is blocked or fails, proceed to attempt generation
      }

      if (alreadyExists) {
        skippedCount++;
        setStats({
          generated: generatedCount,
          skipped: skippedCount,
          errors: errorCount
        });
        continue;
      }

      // 2. Generate and upload thumbnail (~480px WebP, quality ~0.70)
      try {
        const uploadRes = await uploadThumbnailForImage(task.fullUrl, task.fullUrl);
        if (uploadRes.success) {
          generatedCount++;
        } else {
          errorCount++;
          console.warn(`Failed to backfill thumbnail for ${task.fullUrl}:`, uploadRes.error);
        }
      } catch (genErr) {
        errorCount++;
        console.warn(`Exception during thumbnail generation for ${task.fullUrl}:`, genErr);
      }

      setStats({
        generated: generatedCount,
        skipped: skippedCount,
        errors: errorCount
      });

      // Yield event loop slightly
      await new Promise(r => setTimeout(r, 50));
    }

    setIsRunning(false);
    setIsFinished(true);
  };

  const handleStop = () => {
    isCancelledRef.current = true;
    setIsRunning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Images className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base">
                Miniatür Şəkillərin Hazırlanması (Thumbnails)
              </h3>
              <p className="text-[11px] text-slate-400">
                Kataloq və siyahıların sürətli açılması üçün kiçik ölçülü şəkillər
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Info Card */}
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Avtomatik Miniatür Backfill</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Bu funksiya bütün avtomobillərin şəkillərini yoxlayır, miniatürü (<strong>__thumb.webp</strong>) çatışmayan şəkillər üçün avtomatik ~480px WebP formatında kiçik şəkil hazırlayaraq Supabase anbarına yükləyir.
            </p>
            <div className="flex items-center gap-4 pt-1 font-semibold text-[11px] text-slate-400">
              <span>Baza elanları: <strong className="text-white">{cars.length}</strong></span>
              <span>Yoxlanılacaq unikal şəkillər: <strong className="text-white">{candidateTasks.length}</strong></span>
            </div>
          </div>

          {/* Progress / Status Block */}
          {isRunning && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                  <span>{progress.message || 'Emal edilir...'}</span>
                </div>
                <span className="font-mono text-blue-400">{progress.percentage}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              {progress.currentCarTitle && (
                <div className="text-[11px] text-slate-400 truncate">
                  Avtomobil: <span className="text-slate-200 font-semibold">{progress.currentCarTitle}</span>
                </div>
              )}
            </div>
          )}

          {/* Statistics summary */}
          {(isRunning || isFinished) && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-2.5 text-center">
                <div className="text-base sm:text-lg font-black text-emerald-400">
                  {stats.generated}
                </div>
                <div className="text-[10px] text-emerald-300 font-medium">Yaradıldı</div>
              </div>
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-2.5 text-center">
                <div className="text-base sm:text-lg font-black text-blue-400">
                  {stats.skipped}
                </div>
                <div className="text-[10px] text-blue-300 font-medium">Artıq mövcud idi</div>
              </div>
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-2.5 text-center">
                <div className="text-base sm:text-lg font-black text-amber-400">
                  {stats.errors}
                </div>
                <div className="text-[10px] text-amber-300 font-medium">Xətalar</div>
              </div>
            </div>
          )}

          {/* Finished Message */}
          {isFinished && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-emerald-300">
                  Miniatürlərin hazırlanması tamamlandı!
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  Bütün şəkillər yoxlanıldı. Artıq kataloq və kartlarda miniatürlərdən istifadə olunur və səhifələr dərhal açılacaqdır.
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500">
              İstənilən vaxt təkrar icra edilə bilər (idempotent).
            </div>

            <div className="flex items-center gap-2">
              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Dayandır</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                  >
                    {isFinished ? 'Tamam' : 'Bağla'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartBackfill}
                    disabled={candidateTasks.length === 0}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isFinished ? 'Təkrar yoxla' : 'Başlat'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
