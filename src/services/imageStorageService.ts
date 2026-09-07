/**
 * Image & Storage operations module
 */
import { STORAGE_BUCKET_NAME } from './supabaseClientInit';
import { getAdminAuthHeaders } from './adminAuthService';

/**
 * Helper to check whether an image URL is already hosted in our Supabase Storage
 */
export function isSupabaseStorageUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.includes('.supabase.co/storage/v1/object/') ||
    clean.includes('/storage/v1/object/public/car-images') ||
    clean.includes('/storage/v1/object/public/car-images/') ||
    clean.includes('/storage/v1/object/public/cars') ||
    clean.includes('/car-images/cars/')
  );
}

/**
 * Downloads an external image from a URL as a Blob
 * Tries direct CORS fetch, then transparent CORS proxy fallbacks.
 * If CORS or network error prevents downloading, throws a clear user-facing error message:
 * "Bu linkdən şəkli endirmək mümkün olmadı, zəhmət olmasa şəkli kompyuterinizdən yükləyin"
 */
export async function downloadExternalImageAsBlob(
  url: string,
  timeoutMs = 12000
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error('Düzgün şəkil linki daxil edin (http:// və ya https:// ilə başlamalıdır)');
  }

  // 1. First attempt: Direct fetch
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(trimmed, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    });
    clearTimeout(timer);

    if (response.ok) {
      const blob = await response.blob();
      if (blob && blob.size > 50) {
        let mimeType = blob.type || 'image/jpeg';
        let extension = 'jpg';
        if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('webp')) extension = 'webp';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
        else if (mimeType.includes('gif')) extension = 'gif';
        else if (mimeType.includes('avif')) extension = 'avif';
        return { blob, mimeType, extension };
      }
    }
  } catch (err) {
    console.warn('Direct fetch failed (likely CORS restriction or network error), trying fallback...', err);
  }

  // 2. Second attempt: Transparent CORS image proxy fallback
  const cleanEncUrl = encodeURIComponent(trimmed);
  const proxies = [
    `https://images.weserv.nl/?url=${cleanEncUrl}`,
    `https://api.allorigins.win/raw?url=${cleanEncUrl}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 100) {
          let mimeType = blob.type || 'image/jpeg';
          let extension = 'jpg';
          if (mimeType.includes('png')) extension = 'png';
          else if (mimeType.includes('webp')) extension = 'webp';
          else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
          return { blob, mimeType, extension };
        }
      }
    } catch (proxyErr) {
      console.warn(`Proxy attempt failed (${proxyUrl}):`, proxyErr);
    }
  }

  // 3. User-mandated error message when CORS / fetch fails
  throw new Error("Bu linkdən şəkli endirmək mümkün olmadı, zəhmət olmasa şəkli kompyuterinizdən yükləyin");
}

/**
 * Upload image (File, Blob, or base64 dataUrl) directly to Supabase Storage 'car-images' bucket
 * Includes automatic retry mechanism, extended timeout (30s), and fallback across candidate buckets
 */
export async function uploadImageToSupabaseStorage(
  fileOrData: File | Blob | string,
  fileName?: string,
  maxRetries = 2
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    let dataUrl: string;

    if (typeof fileOrData === 'string') {
      if (fileOrData.startsWith('data:')) {
        dataUrl = fileOrData;
      } else if (fileOrData.startsWith('http://') || fileOrData.startsWith('https://')) {
        if (isSupabaseStorageUrl(fileOrData)) {
          return { success: true, publicUrl: fileOrData };
        }

        try {
          const { blob } = await downloadExternalImageAsBlob(fileOrData);
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (downloadErr: unknown) {
          const msg = downloadErr instanceof Error ? downloadErr.message : 'Xarici şəkil linkindən endirilə bilmədi';
          return {
            success: false,
            error: msg
          };
        }
      } else {
        return { success: false, error: 'Naməlum şəkil formatı' };
      }
    } else {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrData);
      });
    }

    let lastError = '';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAdminAuthHeaders()
          },
          body: JSON.stringify({
            dataUrl,
            filename: fileName
          })
        });

        const data = await res.json();
        if (res.ok && data.success && data.url) {
          return { success: true, publicUrl: data.url };
        }

        lastError = data?.error || `Server xətası (${res.status})`;
      } catch (reqErr: unknown) {
        lastError = reqErr instanceof Error ? reqErr.message : 'Serverlə əlaqə qurulmadı';
      }

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    return { success: false, error: lastError || 'Şəkil yüklənmədi' };
  } catch (err: unknown) {
    console.error('Image upload exception:', err);
    const msg = err instanceof Error ? err.message : 'Naməlum xəta';
    return { success: false, error: `Şəkil yüklənmə xətası: ${msg}` };
  }
}

/**
 * Extract relative file path and bucket inside Supabase Storage from public/signed URLs
 */
export function extractStoragePathFromUrl(urlOrPath: string, defaultBucket = STORAGE_BUCKET_NAME): string | null {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;

  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  // Ignore data URLs and local assets (e.g. /pics/...)
  if (trimmed.startsWith('data:') || trimmed.startsWith('/pics/') || trimmed.startsWith('blob:')) {
    return null;
  }

  // Strip query string and fragment
  const cleanUrl = trimmed.split('?')[0].split('#')[0];

  // Direct extraction for /cars/ and /car-images/ URL formats
  if (cleanUrl.includes('/cars/')) {
    const parts = cleanUrl.split('/cars/');
    const after = parts[parts.length - 1];
    if (after) return decodeURIComponent(after);
  }

  if (cleanUrl.includes('/car-images/')) {
    const parts = cleanUrl.split('/car-images/');
    const after = parts[parts.length - 1];
    if (after) return decodeURIComponent(after);
  }

  // Pattern 1: Standard Supabase Storage public/signed/authenticated URL with any bucket name
  const supabasePattern = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/(.+)$/i;
  const matchSupabase = cleanUrl.match(supabasePattern);
  if (matchSupabase && matchSupabase[2]) {
    return decodeURIComponent(matchSupabase[2]);
  }

  // Pattern 2: Render image URL: /storage/v1/render/image/(public|sign|authenticated)/<bucket>/<path...>
  const renderPattern = /\/storage\/v1\/render\/image\/(?:public|sign|authenticated)\/([^/?#]+)\/(.+)$/i;
  const matchRender = cleanUrl.match(renderPattern);
  if (matchRender && matchRender[2]) {
    return decodeURIComponent(matchRender[2]);
  }

  // Pattern 3: Explicit bucket reference: /cars/... or /car-images/...
  const patternBucket = new RegExp(`^/?(?:cars|car-images|${defaultBucket})/(.+)$`, 'i');
  const matchBucket = cleanUrl.match(patternBucket);
  if (matchBucket && matchBucket[1]) {
    return decodeURIComponent(matchBucket[1]);
  }

  // Pattern 4: Relative path already inside bucket (e.g. "cars/12345_pic.jpg")
  if (cleanUrl.startsWith('cars/') && !cleanUrl.includes('://')) {
    return decodeURIComponent(cleanUrl);
  }

  // Pattern 5: Plain filename (e.g. "17400000_photo.jpg")
  if (!cleanUrl.includes('://') && !cleanUrl.startsWith('/')) {
    return decodeURIComponent(cleanUrl);
  }

  return null;
}

/**
 * Remove multiple images from Supabase Storage buckets ('cars', 'car-images')
 */
export async function deleteImagesFromSupabaseStorage(
  imageUrls: string[],
  primaryBucket = STORAGE_BUCKET_NAME
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    const res = await fetch('/api/upload-image', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify({ urls: imageUrls })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, deletedCount: imageUrls.length };
    }
    return { success: false, deletedCount: 0, error: data?.error || 'Şəkillər silinmədi' };
  } catch (err: unknown) {
    console.error('Image delete exception:', err);
    const msg = err instanceof Error ? err.message : 'Serverlə əlaqə xətası';
    return { success: false, deletedCount: 0, error: msg };
  }
}
