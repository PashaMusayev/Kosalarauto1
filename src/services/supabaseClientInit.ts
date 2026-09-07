import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Real Supabase Credentials & Settings
export const DEFAULT_SUPABASE_URL = 'https://ysqnaelzrugbocpwztyc.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5hZWx6cnVnYm9jcHd6dHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDA2ODksImV4cCI6MjEwMjc3NjY4OX0.MTckhAad7LOjaVqhJHyMvGnSvtk7jav_XHvdxPt28GA';
export const STORAGE_BUCKET_NAME = 'car-images';
export const ALT_STORAGE_BUCKET_NAME = 'CAR-IMAGES';
export const STORAGE_BUCKETS = ['car-images', 'CAR-IMAGES'] as const;

// Get URL and Key (from env or custom override, with auto-healing for stale local keys)
export function getActiveSupabaseConfig(): { url: string; anonKey: string; bucket: string; table: string } {
  let envUrl = '';
  let envKey = '';
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
    envUrl = metaEnv?.VITE_SUPABASE_URL || metaEnv?.SUPABASE_URL || '';
    envKey = metaEnv?.VITE_SUPABASE_ANON_KEY || metaEnv?.SUPABASE_ANON_KEY || '';
  } catch (e) {}

  let savedKey: string | null = null;
  let savedUrl: string | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      savedKey = localStorage.getItem('supabase_custom_anon_key');
      savedUrl = localStorage.getItem('supabase_custom_url');
    }
  } catch (e) {}

  // Auto-healing: If localStorage contains an old/stale anon key that is not the active valid key, sync to active key
  if (savedKey && savedKey !== DEFAULT_SUPABASE_ANON_KEY) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('supabase_custom_anon_key', DEFAULT_SUPABASE_ANON_KEY);
      }
      savedKey = DEFAULT_SUPABASE_ANON_KEY;
    } catch (e) {}
  }

  // Validate URL with safe fallback
  let resolvedUrl = (savedUrl || envUrl || DEFAULT_SUPABASE_URL || '').trim();
  if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
    resolvedUrl = DEFAULT_SUPABASE_URL;
  }

  // Validate anon key with safe fallback
  let resolvedKey = (savedKey || envKey || DEFAULT_SUPABASE_ANON_KEY || '').trim();
  if (!resolvedKey || resolvedKey.length < 10) {
    resolvedKey = DEFAULT_SUPABASE_ANON_KEY;
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

export function getSupabaseClient(forceNew = false): SupabaseClient {
  const config = getActiveSupabaseConfig();
  if (supabaseInstance && !forceNew && currentKeyUsed === config.anonKey && currentUrlUsed === config.url) {
    return supabaseInstance;
  }
  
  const targetUrl = (config.url && (config.url.startsWith('http://') || config.url.startsWith('https://'))) 
    ? config.url 
    : DEFAULT_SUPABASE_URL;
  const targetKey = (config.anonKey && config.anonKey.length > 10) 
    ? config.anonKey 
    : DEFAULT_SUPABASE_ANON_KEY;

  try {
    supabaseInstance = createClient(targetUrl, targetKey, {
      auth: {
        persistSession: false
      }
    });
    currentKeyUsed = targetKey;
    currentUrlUsed = targetUrl;
    return supabaseInstance;
  } catch (err) {
    console.warn('Initial Supabase client creation failed, falling back to default:', err);
    try {
      supabaseInstance = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      });
      currentKeyUsed = DEFAULT_SUPABASE_ANON_KEY;
      currentUrlUsed = DEFAULT_SUPABASE_URL;
      return supabaseInstance;
    } catch (criticalErr) {
      console.error('Critical Supabase client creation failed, activating safe fallback:', criticalErr);
      supabaseInstance = createSafeFallbackClient();
      return supabaseInstance;
    }
  }
}

/**
 * Safe Supabase helper that never throws
 */
export function safeCreateSupabaseClient(url?: string, anonKey?: string): SupabaseClient {
  const validUrl = (url && (url.startsWith('http://') || url.startsWith('https://'))) ? url : DEFAULT_SUPABASE_URL;
  const validKey = (anonKey && anonKey.length > 10) ? anonKey : DEFAULT_SUPABASE_ANON_KEY;
  try {
    return createClient(validUrl, validKey, { auth: { persistSession: false } });
  } catch (e) {
    return getSupabaseClient();
  }
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
