/**
 * Admin Authentication & Session Management Module
 */
import { getSupabaseClient } from './supabaseClientInit';

/**
 * SHA-256 Hash helper (for secure cryptographic zero-exposure validation)
 */
export async function sha256Hex(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

/**
 * Supabase Row Level Security (RLS) SQL Script Template
 */
export const SUPABASE_RLS_SQL = `-- ========================================================
-- KOSALAR AUTO - SUPABASE RLS (ROW LEVEL SECURITY) QAYDALARI
-- Bu SQL skriptini Supabase SQL Redaktorunda (SQL Editor) icra edin.
-- ========================================================

-- 1. 'cars' CƏDVƏLİNDƏ RLS AKTİVLƏŞDİRİLMƏSİ
ALTER TABLE IF EXISTS cars ENABLE ROW LEVEL SECURITY;

-- 2. Hər kəs üçün maşınları oxumaq (SELECT) icazəsi
DROP POLICY IF EXISTS "Public Read Cars" ON cars;
CREATE POLICY "Public Read Cars" ON cars
  FOR SELECT
  USING (true);

-- 3. Yalnız daxil olmuş Admin (Authenticated) üçün Maşın Əlavə Etmək (INSERT)
DROP POLICY IF EXISTS "Admin Insert Cars" ON cars;
CREATE POLICY "Admin Insert Cars" ON cars
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Yalnız daxil olmuş Admin üçün Maşın Dəyişdirmək (UPDATE)
DROP POLICY IF EXISTS "Admin Update Cars" ON cars;
CREATE POLICY "Admin Update Cars" ON cars
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Yalnız daxil olmuş Admin üçün Maşın Silmək (DELETE)
DROP POLICY IF EXISTS "Admin Delete Cars" ON cars;
CREATE POLICY "Admin Delete Cars" ON cars
  FOR DELETE
  TO authenticated
  USING (true);

-- 6. 'analytics' CƏDVƏLİ ÜÇÜN RLS QAYDALARI
ALTER TABLE IF EXISTS analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Analytics" ON analytics;
CREATE POLICY "Public Read Analytics" ON analytics
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public Update WhatsApp Clicks" ON analytics;
CREATE POLICY "Public Update WhatsApp Clicks" ON analytics
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public Insert Analytics" ON analytics;
CREATE POLICY "Public Insert Analytics" ON analytics
  FOR INSERT
  WITH CHECK (true);

-- 7. SUPABASE STORAGE ('car-images', 'CAR-IMAGES' və 'cars' Anbarları) İCAZƏLƏRİ
-- Şəkillərin hər kəs tərəfindən oxunmasına (SELECT) icazə verilir
DROP POLICY IF EXISTS "Public Read Car Images" ON storage.objects;
CREATE POLICY "Public Read Car Images" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('car-images', 'CAR-IMAGES', 'cars'));

-- Yalnız təsdiqlənmiş Admin (Authenticated) və ya Server Service Role üçün Yükləmə (INSERT)
DROP POLICY IF EXISTS "Public Upload Car Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Car Images" ON storage.objects;
CREATE POLICY "Authenticated Upload Car Images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('car-images', 'CAR-IMAGES', 'cars'));

-- Yalnız təsdiqlənmiş Admin (Authenticated) və ya Server Service Role üçün Silmə (DELETE)
DROP POLICY IF EXISTS "Public Delete Car Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Car Images" ON storage.objects;
CREATE POLICY "Authenticated Delete Car Images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('car-images', 'CAR-IMAGES', 'cars'));
`;

/**
 * Gets the current active admin session token from storage
 */
export function getAdminSessionToken(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const token = sessionStorage.getItem('kosalar_admin_session_token');
      if (token) return token;
    }
  } catch {}
  return null;
}

/**
 * Returns Authorization headers containing the Bearer admin session token
 */
export function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminSessionToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`
    };
  }
  return {};
}

/**
 * Validates the admin session against the server
 */
export async function checkAdminServerSession(): Promise<boolean> {
  const token = getAdminSessionToken();
  if (!token) return false;

  try {
    const res = await fetch('/api/admin/check-session', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.authenticated);
    }
    return false;
  } catch {
    // Fail-closed on network error or offline state
    return false;
  }
}

/**
 * Verify Admin Credentials securely:
 * 1. Supabase Auth (Direct enterprise email/password login)
 * 2. Server-side API (/api/admin/verify) - NO secrets or hashes stored in client code!
 */
export async function verifyAdminCredentials(params: {
  password: string;
  email?: string;
}): Promise<{ 
  success: boolean; 
  token?: string; 
  user?: any; 
  authType?: 'server_env' | 'supabase_auth';
  error?: string 
}> {
  const { password, email } = params;
  if (!password || !password.trim()) {
    return { success: false, error: 'Şifrə daxil edilməyib' };
  }

  const cleanPass = password.trim();

  // Call backend secure endpoint /api/admin/verify
  // The server securely verifies credentials (ADMIN_PASSWORD or validated admin Supabase user)
  // and issues a cryptographically signed HMAC admin session token.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cleanPass, email: email?.trim() }),
      signal: controller.signal
    });
    clearTimeout(timer);
    
    if (resp.ok) {
      const json = await resp.json();
      if (json.success) {
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('kosalar_admin_session_token', json.token || 'verified_token');
            sessionStorage.setItem('kosalar_admin_logged', 'true');
          }
        } catch (e) {}
        return { 
          success: true, 
          token: json.token, 
          user: json.user,
          authType: json.authType || 'server_env' 
        };
      }
    } else {
      const json = await resp.json().catch(() => ({}));
      return { success: false, error: json.error || 'Şifrə yanlışdır! Zəhmət olmasa təkrar yoxlayın.' };
    }
  } catch (err: any) {
    return { 
      success: false, 
      error: 'Serverlə əlaqə qurulmadı. Zəhmət olmasa internet bağlantınızı və ya server statusunu yoxlayın.' 
    };
  }

  return { success: false, error: 'Daxil edilən şifrə yanlışdır! Zəhmət olmasa təkrar yoxlayın.' };
}

/**
 * Sign out admin safely
 */
export async function signOutAdmin(): Promise<void> {
  try {
    const client = getSupabaseClient();
    await client.auth.signOut();
  } catch (e) {}

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('kosalar_admin_session_token');
      sessionStorage.removeItem('kosalar_admin_logged');
    }
  } catch (e) {}
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('kosalar_admin_logged');
      localStorage.removeItem('kosalar_admin_session_token');
    }
  } catch (e) {}
}
