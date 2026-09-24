/**
 * Direct Supabase Read Fallback Module
 * Loaded dynamically only when GET /api/cars fails.
 */
import { TransitCar } from '../types';
import { getSupabaseClient } from './supabaseClientInit';
import { mapSupabaseRowToCar } from './carService';

/**
 * Fetch cars directly from Supabase Database with timeout protection and retry mechanism (fallback only)
 */
export async function fetchCarsFromSupabase(
  maxRetries = 1, 
  timeoutMs = 5000
): Promise<{ success: boolean; data?: TransitCar[]; error?: string }> {
  const client = getSupabaseClient();
  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        timer = setTimeout(() => resolve({ data: null, error: { message: `Supabase sorğu vaxtı bitdi (Timeout - ${Math.round(timeoutMs / 1000)}s)` } }), timeoutMs);
      });

      const queryPromise = client
        .from('cars')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as {
        data: Record<string, unknown>[] | null;
        error: { message: string } | null;
      };
      if (timer) clearTimeout(timer);

      if (error) {
        lastError = error.message;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        return { success: false, error: error.message };
      }

      if (Array.isArray(data)) {
        return { success: true, data: data.map(mapSupabaseRowToCar) };
      }
      return { success: true, data: [] };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Baza əlaqə xətası';
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
    }
  }

  return { success: false, error: lastError || 'Baza sorğusu uğursuz oldu' };
}
