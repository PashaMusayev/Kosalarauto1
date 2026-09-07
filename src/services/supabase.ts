/**
 * Central Supabase Service Entry Point
 * 
 * Re-exports all domain services for clean separation of concerns and
 * 100% backwards compatibility with existing consumers.
 */

// 1. Client Initialization & Settings
export {
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  STORAGE_BUCKET_NAME,
  ALT_STORAGE_BUCKET_NAME,
  STORAGE_BUCKETS,
  getActiveSupabaseConfig,
  saveCustomSupabaseConfig,
  resetCustomSupabaseConfig,
  getSupabaseClient,
  safeCreateSupabaseClient,
  supabase,
  isSupabaseConfigured,
  testSupabaseConnection
} from './supabaseClientInit';

// 2. Car Read & Write Operations (Protected API / DB)
export {
  mapSupabaseRowToCar,
  mapCarToSupabaseRow,
  fetchCarsFromSupabase,
  fetchAllCarsFromApi,
  upsertCarToSupabase,
  deleteCarFromSupabase,
  updateCarStatusInSupabase
} from './carService';

// 3. Image Storage & Asset Management
export {
  isSupabaseStorageUrl,
  downloadExternalImageAsBlob,
  uploadImageToSupabaseStorage,
  extractStoragePathFromUrl,
  deleteImagesFromSupabaseStorage
} from './imageStorageService';

// 4. Admin Authentication & Session Security
export {
  sha256Hex,
  SUPABASE_RLS_SQL,
  getAdminSessionToken,
  getAdminAuthHeaders,
  checkAdminServerSession,
  verifyAdminCredentials,
  signOutAdmin
} from './adminAuthService';

// 5. Analytics & WhatsApp Telemetry
export {
  fetchAnalyticsFromSupabase,
  trackWhatsAppClick
} from './analyticsService';
