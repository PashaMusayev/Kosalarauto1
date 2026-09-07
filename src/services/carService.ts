/**
 * Car Read & Write Operations Module (Protected API / DB)
 */
import { TransitCar } from '../types';
import { getSupabaseClient } from './supabaseClientInit';
import { getAdminAuthHeaders } from './adminAuthService';
import { deleteImagesFromSupabaseStorage } from './imageStorageService';

function normalizeBrand(brandRaw?: string, title?: string): string {
  const raw = (brandRaw || '').trim();
  const lower = raw.toLowerCase();
  if (lower === 'ford') return 'Ford';
  if (lower === 'mercedes' || lower === 'mercedes-benz' || lower === 'mercedes benz') return 'Mercedes-Benz';
  if (lower === 'iveco') return 'Iveco';
  if (lower === 'volkswagen' || lower === 'vw') return 'Volkswagen';
  if (lower === 'renault') return 'Renault';
  if (lower === 'peugeot') return 'Peugeot';
  if (lower === 'fiat') return 'Fiat';
  if (lower === 'opel') return 'Opel';
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);

  if (title) {
    const tLower = title.toLowerCase();
    if (tLower.includes('mercedes')) return 'Mercedes-Benz';
    if (tLower.includes('iveco')) return 'Iveco';
    if (tLower.includes('volkswagen') || tLower.includes('crafter')) return 'Volkswagen';
    if (tLower.includes('renault') || tLower.includes('master')) return 'Renault';
    if (tLower.includes('peugeot') || tLower.includes('boxer')) return 'Peugeot';
    if (tLower.includes('fiat') || tLower.includes('ducato')) return 'Fiat';
  }
  return 'Ford';
}

function normalizeModel(modelRaw?: string, title?: string): string {
  const raw = (modelRaw || '').trim();
  const lower = raw.toLowerCase();
  if (lower === 'transit') return 'Transit';
  if (lower === 'sprinter') return 'Sprinter';
  if (lower === 'daily') return 'Daily';
  if (lower === 'crafter') return 'Crafter';
  if (lower === 'master') return 'Master';
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);

  if (title) {
    const tLower = title.toLowerCase();
    if (tLower.includes('sprinter')) return 'Sprinter';
    if (tLower.includes('daily')) return 'Daily';
    if (tLower.includes('crafter')) return 'Crafter';
    if (tLower.includes('master')) return 'Master';
  }
  return 'Transit';
}

/**
 * Maps Supabase DB row to TransitCar interface
 */
export function mapSupabaseRowToCar(row: Record<string, unknown>): TransitCar {
  const rawStatus = String(row.status || '').toLowerCase();
  const validStatus: 'active' | 'sold' = rawStatus === 'sold' ? 'sold' : 'active';
  const specs = (typeof row.specs === 'object' && row.specs !== null) ? (row.specs as Record<string, unknown>) : {};

  const brand = normalizeBrand(String(row.brand || row.make || specs.brand || specs.make || ''), String(row.title || ''));
  const model = normalizeModel(String(row.model || specs.model || ''), String(row.title || ''));
  const city = String(row.city || row.location || specs.city || specs.location || 'Bakı');
  const condition = String(row.condition || specs.condition || 'Vuruğu yoxdur, rənglənməyib');

  return {
    id: String(row.id),
    title: String(row.title || `${brand} ${model}`),
    brand: brand,
    make: brand,
    model: model,
    city: city,
    location: city,
    year: Number(row.year || specs.year) || 2011,
    bodyType: String(row.body_type || row.bodyType || specs.bodyType || specs.body_type || 'Yük furqonu'),
    engine: String(row.engine || specs.engine || '2.2 TDCi'),
    hp: Number(row.horse_power || row.hp || specs.hp || 125),
    transmission: String(row.transmission || specs.transmission || 'Mexaniki'),
    mileage: Number(row.mileage || specs.mileage) || 0,
    price: Number(row.price || specs.price) || 0,
    baseLength: String(row.base_length || row.baseLength || specs.baseLength || specs.base_length || '3.30 m'),
    roofHeight: String(row.roof_height || row.roofHeight || specs.roofHeight || specs.roof_height || 'Hündür dam'),
    wheelDrive: String(row.drive_type || row.wheelDrive || row.driveTrain || specs.wheelDrive || specs.drive_type || 'Ön çəkən (FWD)'),
    color: String(row.color || specs.color || 'Ağ'),
    fuelType: String(row.fuel_type || row.fuelType || specs.fuelType || 'Dizel'),
    condition: condition,
    vinCode: String(row.vin_code || row.vinCode || specs.vinCode || specs.vin_code || ''),
    statusBadges: Array.isArray(row.badges) ? (row.badges as string[]) : (Array.isArray(row.statusBadges) ? (row.statusBadges as string[]) : ['Vuruqsuz', 'Gömrük olunub', 'Zəmanətli']),
    images: Array.isArray(row.images) ? (row.images as string[]) : (row.primary_image ? [String(row.primary_image)] : []),
    primaryImage: String(row.primary_image || row.primaryImage || ''),
    description: String(row.description || specs.description || ''),
    features: Array.isArray(row.features) ? (row.features as string[]) : (Array.isArray(specs.features) ? (specs.features as string[]) : []),
    isFeatured: Boolean(row.is_featured ?? row.isFeatured ?? specs.isFeatured),
    status: validStatus,
    specs: specs
  };
}

/**
 * Maps TransitCar to Supabase DB record
 */
export function mapCarToSupabaseRow(car: TransitCar): Record<string, unknown> {
  const brand = car.brand || car.make || (car.title?.toLowerCase().includes('mercedes') ? 'Mercedes-Benz' : 'Ford');
  const model = car.model || (car.title?.toLowerCase().includes('sprinter') ? 'Sprinter' : 'Transit');
  const city = car.city || car.location || 'Bakı';
  const condition = car.condition || 'Vuruğu yoxdur, rənglənməyib';

  return {
    id: car.id,
    title: car.title,
    brand: brand,
    make: brand,
    model: model,
    city: city,
    location: city,
    year: Number(car.year) || 2011,
    price: Number(car.price) || 0,
    mileage: Number(car.mileage) || 0,
    engine: car.engine || '2.2 TDCi',
    horse_power: Number(car.hp) || 125,
    transmission: car.transmission || 'Mexaniki',
    drive_type: car.wheelDrive || 'Ön çəkən (FWD)',
    body_type: car.bodyType || 'Yük furqonu',
    base_length: car.baseLength || '3.30 m',
    roof_height: car.roofHeight || 'Hündür dam',
    color: car.color || 'Ağ',
    fuel_type: car.fuelType || 'Dizel',
    condition: condition,
    vin_code: car.vinCode || '',
    primary_image: car.primaryImage || (car.images && car.images[0]) || '',
    images: car.images || [],
    description: car.description || '',
    features: car.features || [],
    badges: car.statusBadges || ['Vuruqsuz', 'Gömrük olunub', 'Zəmanətli'],
    is_featured: Boolean(car.isFeatured),
    status: car.status === 'sold' ? 'sold' : 'active',
    specs: {
      brand: brand,
      make: brand,
      model: model,
      city: city,
      location: city,
      condition: condition,
      baseLength: car.baseLength,
      roofHeight: car.roofHeight,
      transmission: car.transmission,
      wheelDrive: car.wheelDrive,
      engine: car.engine,
      hp: car.hp,
      color: car.color,
      fuelType: car.fuelType,
      bodyType: car.bodyType,
      year: car.year,
      mileage: car.mileage,
      price: car.price,
      vinCode: car.vinCode,
      ...(car.specs || {})
    },
    updated_at: new Date().toISOString()
  };
}

/**
 * Fetch cars directly from Supabase Database with timeout protection and retry mechanism
 */
export async function fetchCarsFromSupabase(maxRetries = 2): Promise<{ success: boolean; data?: TransitCar[]; error?: string }> {
  const client = getSupabaseClient();
  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        timer = setTimeout(() => resolve({ data: null, error: { message: 'Supabase sorğu vaxtı bitdi (Timeout - 12s)' } }), 12000);
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

/**
 * Shared helper to fetch all cars from /api/cars endpoint.
 * Gracefully normalizes both { success: true, cars: [...] } and legacy raw array responses.
 */
export async function fetchAllCarsFromApi(): Promise<{ success: boolean; cars: TransitCar[]; source?: string; error?: string }> {
  try {
    const res = await fetch('/api/cars');
    if (!res.ok) {
      return { success: false, cars: [], error: `Server xətası (${res.status})` };
    }
    const data = await res.json();
    if (data && Array.isArray(data.cars)) {
      return { success: true, cars: data.cars, source: data.source };
    }
    if (Array.isArray(data)) {
      return { success: true, cars: data, source: 'array' };
    }
    return { success: false, cars: [], error: data?.error || 'Məlumat formatı uyğun deyil' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Serverlə əlaqə qurulmadı';
    console.error('fetchAllCarsFromApi exception:', err);
    return { success: false, cars: [], error: msg };
  }
}

/**
 * Insert or Update single car via protected server API
 * Returns { success: true } or { success: false, error: string }
 */
export async function upsertCarToSupabase(car: TransitCar): Promise<{ success: boolean; error?: string }> {
  try {
    let updatedCars: TransitCar[] = [];
    const apiResult = await fetchAllCarsFromApi();
    if (apiResult.success && Array.isArray(apiResult.cars)) {
      const found = apiResult.cars.some((c: TransitCar) => String(c.id) === String(car.id));
      if (found) {
        updatedCars = apiResult.cars.map((c: TransitCar) => String(c.id) === String(car.id) ? car : c);
      } else {
        updatedCars = [car, ...apiResult.cars];
      }
    }
    if (updatedCars.length === 0) {
      updatedCars = [car];
    }

    const res = await fetch('/api/cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify({ cars: updatedCars })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data?.error || 'Məlumat serverə yazıla bilmədi' };
    }
    return { success: true };
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
): Promise<{ success: boolean; storageDeleted?: number; error?: string }> {
  const carId = typeof carOrId === 'string' ? carOrId : carOrId.id;

  try {
    // 1. If extra image URLs provided, trigger deletion via protected server endpoint
    if (optionalImages && optionalImages.length > 0) {
      deleteImagesFromSupabaseStorage(optionalImages).catch(e => {
        console.warn('Optional storage cleanup notice:', e);
      });
    }

    // 2. Delete car and associated storage files via protected server endpoint
    const res = await fetch(`/api/cars/${carId}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data?.error || 'Avtomobil silinmədi' };
    }

    return { success: true, storageDeleted: 1 };
  } catch (err: unknown) {
    console.error('Car delete exception:', err);
    const msg = err instanceof Error ? err.message : 'Serverlə əlaqə xətası';
    return { success: false, error: msg };
  }
}

/**
 * Update single car status ('active' | 'sold') via protected server API
 */
export async function updateCarStatusInSupabase(
  carId: string, 
  status: 'active' | 'sold'
): Promise<{ success: boolean; error?: string }> {
  try {
    let carsToSend: TransitCar[] | null = null;
    const apiResult = await fetchAllCarsFromApi();
    if (apiResult.success && Array.isArray(apiResult.cars)) {
      carsToSend = apiResult.cars.map((c: TransitCar) => String(c.id) === String(carId) ? { ...c, status } : c);
    }
    if (carsToSend) {
      const res = await fetch('/api/cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders()
        },
        body: JSON.stringify({ cars: carsToSend })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data?.error || 'Status yenilənmədi' };
      }
      return { success: true };
    }
    return { success: false, error: 'Avtomobil tapılmadı' };
  } catch (err: unknown) {
    console.error('Status update exception:', err);
    const msg = err instanceof Error ? err.message : 'Serverlə əlaqə xətası';
    return { success: false, error: msg };
  }
}
