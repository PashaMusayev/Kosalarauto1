import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Storage Configuration & Buckets
export const STORAGE_BUCKET_NAME = 'car-images';
export const ALT_STORAGE_BUCKET_NAME = 'CAR-IMAGES';
export const STORAGE_BUCKETS = ['car-images', 'CAR-IMAGES'] as const;

/**
 * Normalizes Supabase project URL by removing trailing slashes and /rest/v1 paths
 */
export function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  return cleaned.trim().replace(/\/+$/, '');
}

// In-memory cache for server-fetched Supabase config
let serverConfigCache: { url: string; anonKey: string } | null = null;
let serverConfigPromise: Promise<{ url: string; anonKey: string } | null> | null = null;

/**
 * Fetches the Supabase project credentials directly from the Express server endpoint.
 * This guarantees client-side access in AI Studio even if build-time env vars weren't statically baked.
 */
export async function fetchServerSupabaseConfig(force = false): Promise<{ url: string; anonKey: string } | null> {
  if (!force && serverConfigCache && serverConfigCache.url && serverConfigCache.anonKey) {
    return serverConfigCache;
  }
  if (serverConfigPromise && !force) {
    return serverConfigPromise;
  }

  serverConfigPromise = (async () => {
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/supabase-config', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.supabaseUrl && data.supabaseAnonKey) {
            serverConfigCache = {
              url: normalizeSupabaseUrl(data.supabaseUrl),
              anonKey: String(data.supabaseAnonKey).trim()
            };
            // If the active instance is currently using fallback or empty, reinitialize it!
            if (supabaseInstance && (!currentKeyUsed || !currentUrlUsed)) {
              getSupabaseClient(true);
            }
            return serverConfigCache;
          }
        }
      }
    } catch (e) {
      // ignore network errors
    } finally {
      serverConfigPromise = null;
    }
    return serverConfigCache;
  })();

  return serverConfigPromise;
}

// Automatically initiate config fetch in browser environment on module load
if (typeof window !== 'undefined') {
  fetchServerSupabaseConfig().catch(() => {});
}

// Get URL and Key (from environment variables, server API cache, or user custom override)
export function getActiveSupabaseConfig(): { url: string; anonKey: string; bucket: string; table: string } {
  let envUrl = '';
  let envKey = '';

  // 1. Direct Vite environment variable access
  try {
    envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  } catch (e) {}

  // 2. Server config cache (if fetched from /api/supabase-config)
  if ((!envUrl || !envKey) && serverConfigCache) {
    if (!envUrl && serverConfigCache.url) envUrl = serverConfigCache.url;
    if (!envKey && serverConfigCache.anonKey) envKey = serverConfigCache.anonKey;
  }

  // 3. Global window injection fallback
  try {
    if (typeof window !== 'undefined') {
      const winAny = window as unknown as { __SUPABASE_CONFIG__?: { supabaseUrl?: string; supabaseAnonKey?: string } };
      if (!envUrl && winAny.__SUPABASE_CONFIG__?.supabaseUrl) envUrl = winAny.__SUPABASE_CONFIG__.supabaseUrl;
      if (!envKey && winAny.__SUPABASE_CONFIG__?.supabaseAnonKey) envKey = winAny.__SUPABASE_CONFIG__.supabaseAnonKey;
    }
  } catch (e) {}

  // 4. Check localStorage for custom overrides (from Admin settings)
  let savedKey: string | null = null;
  let savedUrl: string | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      savedKey = localStorage.getItem('supabase_custom_anon_key');
      savedUrl = localStorage.getItem('supabase_custom_url');
    }
  } catch (e) {}

  // Only consider saved overrides if they have valid format
  const validSavedUrl = (savedUrl && (savedUrl.startsWith('http://') || savedUrl.startsWith('https://'))) ? savedUrl : '';
  const validSavedKey = (savedKey && savedKey.trim().length > 10) ? savedKey.trim() : '';

  // Validate and normalize URL (custom override, or environment variable, or server cache)
  let resolvedUrl = normalizeSupabaseUrl(validSavedUrl || envUrl || '');
  if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
    resolvedUrl = '';
  }

  // Validate anon key (custom override, or environment variable, or server cache)
  let resolvedKey = (validSavedKey || envKey || '').trim();
  if (resolvedKey.length < 10) {
    resolvedKey = '';
  }

  return {
    url: resolvedUrl,
    anonKey: resolvedKey,
    bucket: STORAGE_BUCKET_NAME,
    table: 'cars'
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentKeyUsed: string = '';
let currentUrlUsed: string = '';

export function saveCustomSupabaseConfig(url: string, anonKey: string) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem('supabase_custom_url', url.trim());
      } else {
        localStorage.removeItem('supabase_custom_url');
      }
      if (anonKey && anonKey.trim()) {
        localStorage.setItem('supabase_custom_anon_key', anonKey.trim());
      } else {
        localStorage.removeItem('supabase_custom_anon_key');
      }
    }
  } catch (e) {}
  supabaseInstance = null;
  currentKeyUsed = '';
  currentUrlUsed = '';
  getSupabaseClient(true);
}

export function resetCustomSupabaseConfig() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('supabase_custom_url');
      localStorage.removeItem('supabase_custom_anon_key');
    }
  } catch (e) {}
  supabaseInstance = null;
  currentKeyUsed = '';
  currentUrlUsed = '';
  getSupabaseClient(true);
}

/**
 * Creates a safe fallback mock client so missing/invalid Supabase config
 * NEVER causes a fatal runtime crash or white screen.
 */
function createSafeFallbackClient(): SupabaseClient {
  // TODO: dummyChain mimics the recursive PostgREST builder interface for fallback purposes without pulling deep internal Supabase generic builder types
  const dummyChain: Record<string, unknown> = {
    select: () => dummyChain,
    order: () => dummyChain,
    eq: () => dummyChain,
    neq: () => dummyChain,
    limit: () => dummyChain,
    range: () => dummyChain,
    single: () => Promise.resolve({ data: null, error: { message: 'Supabase əlaqəsi aktiv deyil' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase əlaqəsi aktiv deyil' } }),
    upsert: () => Promise.resolve({ data: null, error: { message: 'Supabase əlaqəsi aktiv deyil' } }),
    insert: () => Promise.resolve({ data: null, error: { message: 'Supabase əlaqəsi aktiv deyil' } }),
    update: () => Promise.resolve({ data: null, error: { message: 'Supabase əlaqəsi aktiv deyil' } }),
    delete: () => Promise.resolve({ data: null, error: { message: 'Supabase əlaqəsi aktiv deyil' } }),
    then: (resolve: (val: unknown) => void) => Promise.resolve({ data: null, error: { message: 'Supabase əlaqəsi aktiv deyil' } }).then(resolve)
  };

  return {
    from: () => dummyChain,
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: 'Storage əlaqəsi aktiv deyil' } }),
        remove: () => Promise.resolve({ data: null, error: { message: 'Storage əlaqəsi aktiv deyil' } }),
        list: () => Promise.resolve({ data: [], error: { message: 'Storage əlaqəsi aktiv deyil' } }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } })
      })
    },
    auth: {
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Auth əlaqəsi aktiv deyil' } }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null })
    }
  } as unknown as SupabaseClient;
}

let hasWarnedMissingConfig = false;

export function getSupabaseClient(forceNew = false): SupabaseClient {
  const config = getActiveSupabaseConfig();
  if (supabaseInstance && !forceNew && currentKeyUsed === config.anonKey && currentUrlUsed === config.url) {
    return supabaseInstance;
  }
  
  const isValidUrl = Boolean(config.url && (config.url.startsWith('http://') || config.url.startsWith('https://')));
  const isValidKey = Boolean(config.anonKey && config.anonKey.length > 10);

  if (!isValidUrl || !isValidKey) {
    if (!hasWarnedMissingConfig) {
      const missing: string[] = [];
      if (!isValidUrl) missing.push('VITE_SUPABASE_URL / SUPABASE_URL');
      if (!isValidKey) missing.push('VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY');
      console.warn(
        `⚠️ [SUPABASE CONFIG] Konfiqurasiya dəyişənləri təyin edilməyib (${missing.join(', ')}). Müştəri təhlükəsiz degraded (fallback) rejimində işləyir.`
      );
      hasWarnedMissingConfig = true;
    }
    supabaseInstance = createSafeFallbackClient();
    currentKeyUsed = '';
    currentUrlUsed = '';
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false
      }
    });
    currentKeyUsed = config.anonKey;
    currentUrlUsed = config.url;
    return supabaseInstance;
  } catch (err) {
    console.warn('Supabase client creation failed, activating safe fallback:', err);
    supabaseInstance = createSafeFallbackClient();
    return supabaseInstance;
  }
}

/**
 * Safe Supabase helper that never throws
 */
export function safeCreateSupabaseClient(url?: string, anonKey?: string): SupabaseClient {
  const normUrl = normalizeSupabaseUrl(url || '');
  const validUrl = (normUrl && (normUrl.startsWith('http://') || normUrl.startsWith('https://'))) ? normUrl : '';
  const validKey = (anonKey && anonKey.trim().length > 10) ? anonKey.trim() : '';

  if (validUrl && validKey) {
    try {
      return createClient(validUrl, validKey, { auth: { persistSession: false } });
    } catch (e) {
      return getSupabaseClient();
    }
  }
  return getSupabaseClient();
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    try {
      const client = getSupabaseClient();
      const val = (client as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(client) : val;
    } catch (e) {
      console.warn(`Supabase proxy property access warning for "${String(prop)}":`, e);
      return () => Promise.resolve({ data: null, error: { message: 'Supabase client unavailable' } });
    }
  }
});

export function isSupabaseConfigured(): boolean {
  const config = getActiveSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

/**
 * Test Connection directly to Supabase DB and Storage with retry mechanism & extended timeout
 */
export async function testSupabaseConnection(maxRetries = 2): Promise<{
  dbConnected: boolean;
  storageConnected: boolean;
  dbError?: string;
  storageError?: string;
  carsCount?: number;
  activeBucket?: string;
}> {
  // Ensure we have active credentials (fetch from server if not already present)
  let activeCfg = getActiveSupabaseConfig();
  if (!activeCfg.url || !activeCfg.anonKey) {
    await fetchServerSupabaseConfig(true);
    activeCfg = getActiveSupabaseConfig();
    if (activeCfg.url && activeCfg.anonKey) {
      getSupabaseClient(true);
    }
  }

  const client = getSupabaseClient();
  let dbConnected = false;
  let storageConnected = false;
  let dbError: string | undefined;
  let storageError: string | undefined;
  let carsCount = 0;
  let activeBucket = STORAGE_BUCKET_NAME;

  // 1. Database Connection Check (with retry and 12s timeout)
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let dbTimer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<{ data: null; error: { message: string; code?: string } }>((resolve) => {
        dbTimer = setTimeout(() => resolve({ data: null, error: { message: 'Sorğu vaxtı bitdi (Timeout - 12s)' } }), 12000);
      });
      const dbPromise = client.from('cars').select('id', { count: 'exact' });

      const { data, error } = (await Promise.race([dbPromise, timeoutPromise])) as {
        data: Record<string, unknown>[] | null;
        error: { message: string; code?: string } | null;
      };
      if (dbTimer) clearTimeout(dbTimer);

      if (error) {
        dbError = `${error.message} (${error.code || 'xəta'})`;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
      } else {
        dbConnected = true;
        carsCount = data ? data.length : 0;
        dbError = undefined;
        break;
      }
    } catch (err: unknown) {
      dbError = err instanceof Error ? err.message : 'Baza sorğusu uğursuz oldu';
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
    }
  }

  // 2. Storage Connection Check (with retry, 15s timeout, and testing both 'car-images' and 'CAR-IMAGES')
  const candidateBuckets = [STORAGE_BUCKET_NAME, ALT_STORAGE_BUCKET_NAME];

  for (let attempt = 1; attempt <= maxRetries && !storageConnected; attempt++) {
    for (const bName of candidateBuckets) {
      try {
        let storageTimer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<{ data: null; error: { message: string; statusCode?: string | number } }>((resolve) => {
          storageTimer = setTimeout(() => resolve({ data: null, error: { message: `Storage vaxtı bitdi (Timeout 15s - ${bName})` } }), 15000);
        });
        const storagePromise = client.storage.from(bName).list('', { limit: 5 });

        const { data, error } = (await Promise.race([storagePromise, timeoutPromise])) as {
          data: unknown[] | null;
          error: { message: string; statusCode?: string | number } | null;
        };
        if (storageTimer) clearTimeout(storageTimer);

        if (error) {
          storageError = `${error.message} (${error.statusCode || 'xəta'})`;
        } else if (Array.isArray(data)) {
          storageConnected = true;
          storageError = undefined;
          activeBucket = bName;
          break; // Storage is verified working
        }
      } catch (err: unknown) {
        storageError = err instanceof Error ? err.message : `Storage '${bName}' sorğusu uğursuz oldu`;
      }
    }

    if (!storageConnected && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  return {
    dbConnected,
    storageConnected,
    dbError,
    storageError,
    carsCount,
    activeBucket
  };
}
