/**
 * Admin Car Mutation Operations (Protected Server API)
 * Kept isolated from public catalog bundle.
 */
import { TransitCar } from '../types';
import { getAdminAuthHeaders } from './adminAuthService';
import { deleteImagesFromSupabaseStorage } from './imageStorageService';

/**
 * Insert or Update single car via protected server API
 * Performs an atomic single-row upsert, avoiding full-table read-modify-replace race conditions.
 * Returns { success: true, cars?: TransitCar[] } or { success: false, error: string }
 */
export async function upsertCarToSupabase(car: TransitCar): Promise<{ success: boolean; cars?: TransitCar[]; error?: string }> {
  try {
    const res = await fetch('/api/cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify({ car })
    });
    let data: Record<string, unknown> | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok || !data || !data.success) {
      return { success: false, error: (typeof data?.error === 'string' ? data.error : null) || `Məlumat serverə yazıla bilmədi (${res.status})` };
    }
    return { success: true, cars: data.cars as TransitCar[] | undefined };
  } catch (err: unknown) {
    console.error('Car upsert exception:', err);
    const msg = err instanceof Error ? err.message : 'Məlumat yadda saxlanılmadı';
    return { success: false, error: `Server xətası: ${msg}` };
  }
}

/**
 * Delete car from database and completely purge all its images via protected server API
 */
export async function deleteCarFromSupabase(
  carOrId: string | TransitCar,
  optionalImages?: string[]
): Promise<{ success: boolean; storageDeleted?: number; cars?: TransitCar[]; error?: string }> {
  const carId = typeof carOrId === 'string' ? carOrId : carOrId.id;

  try {
    // 1. If extra image URLs provided, trigger deletion via protected server endpoint
    if (optionalImages && optionalImages.length > 0) {
      deleteImagesFromSupabaseStorage(optionalImages).catch(e => {
        console.warn('Optional storage cleanup notice:', e);
      });
    }

    // 2. Delete car and associated storage files via protected server endpoint
    const res = await fetch(`/api/cars/${encodeURIComponent(carId)}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });
    let data: Record<string, unknown> | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok || !data || !data.success) {
      return { success: false, error: (typeof data?.error === 'string' ? data.error : null) || `Avtomobil silinmədi (${res.status})` };
    }

    return { success: true, storageDeleted: 1, cars: data.cars as TransitCar[] | undefined };
  } catch (err: unknown) {
    console.error('Car delete exception:', err);
    const msg = err instanceof Error ? err.message : 'Serverlə əlaqə xətası';
    return { success: false, error: msg };
  }
}

/**
 * Update single car status ('active' | 'sold') via atomic protected server endpoint
 */
export async function updateCarStatusInSupabase(
  carId: string, 
  status: 'active' | 'sold'
): Promise<{ success: boolean; cars?: TransitCar[]; error?: string }> {
  try {
    const res = await fetch(`/api/cars/${encodeURIComponent(carId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify({ status })
    });
    let data: Record<string, unknown> | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok || !data || !data.success) {
      return { success: false, error: (typeof data?.error === 'string' ? data.error : null) || `Status yenilənmədi (${res.status})` };
    }
    return { success: true, cars: data.cars as TransitCar[] | undefined };
  } catch (err: unknown) {
    console.error('Status update exception:', err);
    const msg = err instanceof Error ? err.message : 'Serverlə əlaqə xətası';
    return { success: false, error: msg };
  }
}
