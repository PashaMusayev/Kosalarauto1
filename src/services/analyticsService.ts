/**
 * Analytics Operations Module
 */
import { getSupabaseClient } from './supabaseClientInit';

/**
 * Fetch analytics data from Supabase 'analytics' table (row where id = 1)
 */
export async function fetchAnalyticsFromSupabase(): Promise<{ 
  success: boolean; 
  whatsappClicks: number; 
  error?: string;
}> {
  const client = getSupabaseClient();
  const cachedVal = typeof localStorage !== 'undefined' 
    ? Number(localStorage.getItem('kosalar_whatsapp_clicks') || '0') 
    : 0;

  try {
    const queryPromise = client
      .from('analytics')
      .select('whatsapp_clicks')
      .eq('id', 1)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Sorğu vaxtı bitdi' } }), 4000)
    );

    const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as {
      data: { whatsapp_clicks: number } | null;
      error: { message: string } | null;
    };

    if (error) {
      console.warn('Supabase analytics fetch notice:', error.message);
      return { success: false, whatsappClicks: cachedVal, error: error.message };
    }

    if (data && typeof data.whatsapp_clicks === 'number') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('kosalar_whatsapp_clicks', String(data.whatsapp_clicks));
      }
      return { success: true, whatsappClicks: data.whatsapp_clicks };
    }

    // If table exists but row id: 1 doesn't, try initializing it
    try {
      await client.from('analytics').upsert({ id: 1, whatsapp_clicks: cachedVal }, { onConflict: 'id' });
    } catch {
      // Ignored non-fatal table initialization error
    }

    return { success: true, whatsappClicks: cachedVal };
  } catch (err: unknown) {
    console.warn('Analytics fetch exception:', err);
    const msg = err instanceof Error ? err.message : 'Xəta';
    return { success: false, whatsappClicks: cachedVal, error: msg };
  }
}

/**
 * Increment WhatsApp click counter in Supabase 'analytics' table (id = 1)
 * Guaranteed not to block the user or throw unhandled exceptions
 */
export async function trackWhatsAppClick(): Promise<number> {
  const client = getSupabaseClient();
  
  // Read current cached count
  let localCount = 0;
  if (typeof localStorage !== 'undefined') {
    localCount = Number(localStorage.getItem('kosalar_whatsapp_clicks') || '0');
  }
  const nextCount = localCount + 1;

  // Immediate optimistic update in localStorage & UI broadcast
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('kosalar_whatsapp_clicks', String(nextCount));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('whatsappClickRecorded', { detail: { count: nextCount } }));
  }

  // Asynchronously sync to Supabase analytics table
  (async () => {
    try {
      // 1. Check current server count in Supabase
      const { data } = await client
        .from('analytics')
        .select('whatsapp_clicks')
        .eq('id', 1)
        .maybeSingle();

      const serverVal = (data && typeof data.whatsapp_clicks === 'number') 
        ? data.whatsapp_clicks 
        : localCount;
      const finalCount = Math.max(serverVal + 1, nextCount);

      // 2. Upsert to analytics table
      const { error } = await client
        .from('analytics')
        .upsert({
          id: 1,
          whatsapp_clicks: finalCount,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (!error && typeof localStorage !== 'undefined') {
        localStorage.setItem('kosalar_whatsapp_clicks', String(finalCount));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('whatsappClickRecorded', { detail: { count: finalCount } }));
        }
      }
    } catch (e) {
      console.warn('Background Supabase WhatsApp click sync note:', e);
    }
  })();

  return nextCount;
}
