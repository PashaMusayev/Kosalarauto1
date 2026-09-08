import React from 'react';
import { 
  Database, 
  X, 
  ExternalLink, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Save, 
  ShieldCheck, 
  Copy, 
  Check 
} from 'lucide-react';
import { SUPABASE_RLS_SQL } from '../../services/adminAuthService';
import { STORAGE_BUCKET_NAME } from '../../services/supabaseClientInit';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supabaseUrlInput: string;
  setSupabaseUrlInput: (val: string) => void;
  supabaseAnonKeyInput: string;
  setSupabaseAnonKeyInput: (val: string) => void;
  showAnonKeyText: boolean;
  setShowAnonKeyText: (val: boolean) => void;
  isSavingConfig: boolean;
  onSaveConfig: (e: React.FormEvent) => void;
  onResetConfig: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  supabaseUrlInput,
  setSupabaseUrlInput,
  supabaseAnonKeyInput,
  setSupabaseAnonKeyInput,
  showAnonKeyText,
  setShowAnonKeyText,
  isSavingConfig,
  onSaveConfig,
  onResetConfig
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-slate-200">
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-white text-base">Supabase Layihə Qoşulma Ayarları</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSaveConfig} className="p-5 space-y-4">
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3.5 text-xs text-blue-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <Database className="w-4 h-4" />
              <span>Öz Supabase Layihənizi Qoşun</span>
            </div>
            <p>
              Supabase Dashboard-dan (<strong>Project Settings → API</strong>) Project URL və anon (public) key-i bura daxil edin. Bu məlumatlar brauzerinizdə yerli olaraq saxlanacaq.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-bold"
              >
                <span>Supabase Dashboard-a keç</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Supabase Project URL:
              </label>
              <input
                type="url"
                value={supabaseUrlInput}
                onChange={(e) => setSupabaseUrlInput(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">Nümunə: https://xyzcompany.supabase.co</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-300">
                  Supabase Anon (Public) Key:
                </label>
                <button
                  type="button"
                  onClick={() => setShowAnonKeyText(!showAnonKeyText)}
                  className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                >
                  {showAnonKeyText ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showAnonKeyText ? 'Gizlət' : 'Göstər'}</span>
                </button>
              </div>
              <input
                type={showAnonKeyText ? "text" : "password"}
                value={supabaseAnonKeyInput}
                onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">Anon public API açarını qeyd edin.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onResetConfig}
              className="text-xs text-slate-400 hover:text-rose-400 font-bold underline transition-colors"
            >
              Defolt ayarlara qaytar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Bağla
              </button>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                {isSavingConfig ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Yadda saxlanılır...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Yadda saxla & Test et</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  copiedRls: boolean;
  onCopyRls: () => void;
}

export const RlsModal: React.FC<RlsModalProps> = ({
  isOpen,
  onClose,
  copiedRls,
  onCopyRls
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden text-slate-200">
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-white text-base">Supabase RLS Təhlükəsizlik Siyasəti (SQL)</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 text-amber-200 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Niyə bu SQL vacibdir?</span>
            </p>
            <p>
              Əgər Supabase panelində maşınları silərkən və ya əlavə edərkən <code>new row violates row-level security policy</code> və ya icazə xətası alırsınızsa, aşağıdakı SQL kodunu Supabase-in <strong>SQL Editor</strong> bölməsində icra edin.
            </p>
          </div>

          <div className="relative">
            <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60 scrollbar-thin">
              {SUPABASE_RLS_SQL}
            </pre>
            <button
              type="button"
              onClick={onCopyRls}
              className="absolute top-2.5 right-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              {copiedRls ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kodu kopyala</span>
                </>
              )}
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
            >
              Bağla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
