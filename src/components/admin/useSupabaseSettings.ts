import { useState, useCallback } from 'react';
import { 
  testSupabaseConnection, 
  getActiveSupabaseConfig, 
  saveCustomSupabaseConfig, 
  resetCustomSupabaseConfig 
} from '../../services/supabase';
import { ConnectionStatusState } from './adminTypes';

export function useSupabaseSettings(showToast: (msg: string) => void) {
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [showSupabaseSettingsModal, setShowSupabaseSettingsModal] = useState(false);
  const [showRlsModal, setShowRlsModal] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState('');
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState('');
  const [showAnonKeyText, setShowAnonKeyText] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatusState>({
    tested: false,
    dbConnected: false,
    storageConnected: false
  });

  const runConnectionTest = useCallback(async () => {
    setIsTestingConn(true);
    try {
      const res = await testSupabaseConnection();
      setConnStatus({
        tested: true,
        dbConnected: res.dbConnected,
        storageConnected: res.storageConnected,
        dbError: res.dbError,
        storageError: res.storageError
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Xəta baş verdi';
      setConnStatus({
        tested: true,
        dbConnected: false,
        storageConnected: false,
        dbError: msg,
        storageError: msg
      });
    } finally {
      setIsTestingConn(false);
    }
  }, []);

  const handleSaveSupabaseConfig = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrlInput.trim()) {
      alert("Supabase Project URL daxil edilməlidir!");
      return;
    }
    if (!supabaseAnonKeyInput.trim()) {
      alert("Supabase Anon Key daxil edilməlidir!");
      return;
    }

    setIsSavingConfig(true);
    try {
      saveCustomSupabaseConfig(supabaseUrlInput.trim(), supabaseAnonKeyInput.trim());
      showToast("Supabase qoşulma məlumatları yadda saxlanıldı!");
      await runConnectionTest();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Yadda saxlanarkən xəta: " + msg);
    } finally {
      setIsSavingConfig(false);
    }
  }, [supabaseUrlInput, supabaseAnonKeyInput, showToast, runConnectionTest]);

  const handleResetSupabaseConfig = useCallback(async () => {
    if (window.confirm("Supabase ayarlarını standart defolt layihəyə qaytarmaq istəyirsiniz?")) {
      resetCustomSupabaseConfig();
      const cfg = getActiveSupabaseConfig();
      setSupabaseUrlInput(cfg.url || '');
      setSupabaseAnonKeyInput(cfg.anonKey || '');
      showToast("Defolt Supabase konfiqurasiyası bərpa edildi!");
      await runConnectionTest();
    }
  }, [showToast, runConnectionTest]);

  const handleCopyRls = useCallback(() => {
    navigator.clipboard.writeText(SUPABASE_RLS_SQL_IMPORT);
    setCopiedRls(true);
    setTimeout(() => setCopiedRls(false), 3000);
  }, []);

  return {
    isTestingConn,
    showSupabaseSettingsModal,
    setShowSupabaseSettingsModal,
    showRlsModal,
    setShowRlsModal,
    copiedRls,
    supabaseUrlInput,
    setSupabaseUrlInput,
    supabaseAnonKeyInput,
    setSupabaseAnonKeyInput,
    showAnonKeyText,
    setShowAnonKeyText,
    isSavingConfig,
    showSettingsDropdown,
    setShowSettingsDropdown,
    connStatus,
    runConnectionTest,
    handleSaveSupabaseConfig,
    handleResetSupabaseConfig,
    handleCopyRls
  };
}

import { SUPABASE_RLS_SQL as SUPABASE_RLS_SQL_IMPORT } from '../../services/supabase';
