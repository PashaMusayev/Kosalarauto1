import React, { useState } from 'react';
import { Lock, ShieldCheck, Key, Eye, EyeOff, AlertCircle, RefreshCw, Unlock } from 'lucide-react';
import { verifyAdminCredentials } from '../../services/adminAuthService';

interface AdminLoginFormProps {
  onLoginSuccess: () => void;
  showToast: (msg: string) => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({
  onLoginSuccess,
  showToast
}) => {
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [authTab, setAuthTab] = useState<'pin' | 'supabase'>('pin');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setAuthError('Zəhmət olmasa şifrəni daxil edin');
      return;
    }

    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await verifyAdminCredentials({
        password: password.trim(),
        email: authTab === 'supabase' ? adminEmail.trim() : undefined
      });

      if (res.success) {
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('kosalar_admin_logged', 'true');
          }
        } catch (e) {
          console.debug('Audio play note:', e);
        }
        setPassword('');
        setAuthError('');
        showToast('Admin panelə uğurla daxil oldunuz!');
        onLoginSuccess();
      } else {
        setAuthError(res.error || 'Şifrə yanlışdır! Zəhmət olmasa təkrar yoxlayın.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Serverə qoşulmaq mümkün olmadı';
      setAuthError('Təsdiqləmə zamanı xəta baş verdi: ' + msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-12 bg-slate-950 p-5 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl text-center space-y-4 sm:space-y-5">
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
        <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
      <div>
        <h3 className="text-lg sm:text-xl font-black text-white">Giriş</h3>
      </div>

      {/* Login Method Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => { setAuthTab('pin'); setAuthError(''); }}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            authTab === 'pin' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin şifrəsi</span>
        </button>
        <button
          type="button"
          onClick={() => { setAuthTab('supabase'); setAuthError(''); }}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            authTab === 'supabase' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Supabase Auth</span>
        </button>
      </div>

      <form onSubmit={handleLogin} autoComplete="off" className="space-y-4 text-left">
        {authTab === 'supabase' && (
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Admin e-poçt ünvanı:</label>
            <input 
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder=""
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5">
            {authTab === 'supabase' ? 'Supabase şifrəsi:' : 'Admin şifrəsi:'}
          </label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 pr-10"
              autoFocus={authTab === 'pin'}
              autoComplete="new-password"
              name="admin_pwd_entry"
              id="admin-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {authError && (
            <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {authError}
            </p>
          )}
        </div>

        <button 
          type="submit"
          disabled={isLoggingIn}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
        >
          {isLoggingIn ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Yoxlanılır...</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              <span>Paneli aç</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
