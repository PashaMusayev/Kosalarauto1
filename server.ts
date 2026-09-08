import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getDirname = () => {
  if (typeof __dirname !== 'undefined') return __dirname;
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};

// =============================================================
// Security Infrastructure: HMAC Admin Session Tokens & Rate Limiting
// =============================================================
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AdminSessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
  nonce: string;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 * Token cannot be forged or tampered with by the client.
 */
function createAdminSessionToken(): string {
  const payload: AdminSessionPayload = {
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + ADMIN_SESSION_EXPIRY_MS,
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Validates the HMAC-SHA256 signature and expiration timestamp.
 */
function verifyAdminSessionToken(token?: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;
  try {
    const expectedSignature = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(encodedPayload).digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expSigBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
      return false;
    }
    const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8')) as AdminSessionPayload;
    if (decoded.role !== 'admin') return false;
    if (Date.now() > decoded.exp) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 */
function safeComparePasswords(input: string, target: string): boolean {
  try {
    const a = Buffer.from(input);
    const b = Buffer.from(target);
    if (a.length !== b.length) {
      crypto.timingSafeEqual(a, a); // burn constant time
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// In-memory rate limiting against brute-force login attacks
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (now > record.resetAt) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, waitSeconds };
  }
  return { allowed: true };
}

function recordFailedLogin(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOCKOUT_PERIOD_MS });
  } else {
    record.count += 1;
  }
}

function resetLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

/**
 * File buffer magic byte inspection for image uploads.
 * Rejects disguised or malicious file payloads.
 */
function isValidImageBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return true;
  }
  return false;
}

/**
 * Schema validation and data sanitization for car records.
 */
function validateAndSanitizeCars(cars: unknown[]): { valid: boolean; error?: string; sanitized?: Record<string, unknown>[] } {
  if (!Array.isArray(cars)) {
    return { valid: false, error: 'Avtomobillər massiv formatında olmalıdır' };
  }
  if (cars.length > 500) {
    return { valid: false, error: 'Həddindən artıq elan sayı (maksimum 500)' };
  }

  const sanitized: Record<string, unknown>[] = [];
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i] as Record<string, unknown> | null;
    if (!c || typeof c !== 'object') {
      return { valid: false, error: `Elan #${i + 1} düzgün formatda deyil` };
    }
    const rawPrice = Number(c.price);
    if (isNaN(rawPrice) || rawPrice < 0 || rawPrice > 50000000) {
      return { valid: false, error: `Elan #${i + 1}: Qiymət düzgün deyil` };
    }
    const rawYear = Number(c.year);
    if (isNaN(rawYear) || rawYear < 1970 || rawYear > 2035) {
      return { valid: false, error: `Elan #${i + 1}: İl 1970-2035 aralığında olmalıdır` };
    }

    const id = String(c.id || `car-${Date.now()}-${i}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    const title = String(c.title || 'Avtomobil').slice(0, 200);
    const brand = String(c.brand || c.make || 'Ford').slice(0, 100);
    const model = String(c.model || 'Transit').slice(0, 100);
    const images = Array.isArray(c.images)
      ? (c.images as unknown[]).filter((img: unknown): img is string => typeof img === 'string' && img.length < 2000).slice(0, 50)
      : [];
    const primaryImage = typeof c.primaryImage === 'string' ? c.primaryImage.slice(0, 2000) : (images[0] || '');

    sanitized.push({
      ...c,
      id,
      title,
      brand,
      make: brand,
      model,
      price: rawPrice,
      year: rawYear,
      mileage: Math.max(0, Number(c.mileage) || 0),
      primaryImage,
      images,
      status: c.status === 'sold' ? 'sold' : 'active'
    });
  }

  return { valid: true, sanitized };
}

// Normalize Supabase URL helper
function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  return cleaned.trim().replace(/\/+$/, '');
}

// Initialize Supabase Server Client lazily
let serverSupabase: SupabaseClient | null = null;
const STORAGE_BUCKET_NAME = 'car-images';

function getServerSupabase(): SupabaseClient | null {
  if (serverSupabase) return serverSupabase;
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const sUrl = normalizeSupabaseUrl(rawUrl);
  const sKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (sUrl && sKey && (sUrl.startsWith('http://') || sUrl.startsWith('https://')) && sKey.length > 10) {
    try {
      serverSupabase = createClient(sUrl, sKey);
      return serverSupabase;
    } catch (e) {
      console.warn('Server Supabase client init failed:', e);
    }
  }
  return null;
}

const DEFAULT_SERVER_CARS = [
  {
    id: 'ft-2011-01',
    title: 'Ford Transit 2.2 3.30',
    year: 2011,
    bodyType: 'Yük furqonu',
    engine: '2.2 TDCi Euro 5',
    hp: 125,
    transmission: '6-Pilləli Mexanika',
    mileage: 223195,
    price: 18800,
    baseLength: '3.30 m',
    roofHeight: 'Hündür dam',
    wheelDrive: 'Ön çəkən (FWD)',
    color: 'Gümüşü metallik',
    fuelType: 'Dizel',
    vinCode: 'WF0XXXTTFXCY12984',
    location: 'Bakı, Yeni Günəşli',
    statusBadges: ['Əla vuruqsuz', 'Texniki baxışdan keçib', 'Gömrük olunub', 'Zəmanətli'],
    primaryImage: '/images/ford_transit_hero.jpg',
    images: [
      '/images/ford_transit_hero.jpg'
    ],
    description: 'Təmiz, vuruqsuz və rəng dəyməmiş Ford Transit 3.30 m baza. Almaniyadan yeni gətirilib, bütün texniki baxışları orijinal ehtiyat hissələri ilə olunub. Mühərrik və sürət qutusu saat kimi işləyir.',
    features: [
      'Kondisioner',
      'Avtopilot (Cruise Control)',
      'ABS / ESP təhlükəsizlik',
      'Elektrikli şüşəqaldıranlar',
      'Mərkəzi qapanma',
      'Duman əleyhinə işıqlar',
      'Bort kompyuter',
      'Yan sürüşən qapı'
    ],
    isFeatured: true
  },
  {
    id: 'mb-sprinter-2008-02',
    title: 'Mercedes Sprinter 2.2 3.30',
    year: 2008,
    bodyType: 'Yük furqonu',
    engine: '2.2 CDI',
    hp: 150,
    transmission: '6-Pilləli Mexanika',
    mileage: 236400,
    price: 29000,
    baseLength: '3.30 m',
    roofHeight: 'Hündür dam',
    wheelDrive: 'Arxa çəkən (RWD)',
    color: 'Sarı',
    fuelType: 'Dizel',
    vinCode: 'WDB9066331S194827',
    location: 'Bakı, Yeni Günəşli',
    statusBadges: ['Vuruqsuz Rəngsiz', 'Kondisionerli', 'Gömrük olunub', 'Zəmanətli'],
    primaryImage: '/pics/mercedes sprinter/msponyan.jpeg',
    images: [
      '/pics/mercedes sprinter/msponyan.jpeg',
      '/pics/mercedes sprinter/mspsagyan.jpeg',
      '/pics/mercedes sprinter/msparxayan.jpeg',
      '/pics/mercedes sprinter/msparxasag.jpeg',
      '/pics/mercedes sprinter/msparxa.jpeg',
      '/pics/mercedes sprinter/msparxaacig.jpeg',
      '/pics/mercedes sprinter/mspyukyan.jpeg',
      '/pics/mercedes sprinter/msprol.jpeg',
      '/pics/mercedes sprinter/mspkm.jpeg',
      '/pics/mercedes sprinter/mspkans.jpeg',
      '/pics/mercedes sprinter/mspmatorxana.jpeg',
      '/pics/mercedes sprinter/mspmatorxana2.jpeg'
    ],
    description: 'Mercedes Sprinter 2.2 CDI 3.30 m orta-uzun baza yük yeri. Almaniyadan yeni gətirilib, Azərbaycanda sürülməyib. 100% gömrük olunub. Vuruğu, pası və ya dəyişən detalı qətiyyən yoxdur. Orijinal probeq. Mühərrik, sürət qutusu və most ideal vəziyyətdədir. Kondisioner buz kimi vurur. Bütün sənədləri qaydasındadır.',
    features: [
      'Kondisioner',
      'ABS / ESP',
      'Elektrikli şüşəqaldıranlar',
      'Mərkəzi qapanma',
      'Bort kompyuter',
      'Hidravlik sükan',
      'Yan sürüşən qapı',
      'Duman əleyhinə işıqlar'
    ],
    isFeatured: true
  }
];

// In-memory / file persistence helper
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'cars.json');

function getCarsFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read cars from disk:', err);
  }
  return DEFAULT_SERVER_CARS;
}

function saveCarsToDisk(cars: unknown[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(cars, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save cars to disk:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for accurate client IP behind reverse proxy / Cloud Run
  app.set('trust proxy', 1);

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://ai.studio https://*.google.com;");
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static route for vehicle pictures with safe fallback
  app.use('/pics', express.static(path.join(process.cwd(), 'public/pics')));
  app.get('/pics/*', (req, res) => {
    const heroPath = path.join(process.cwd(), 'public/images/ford_transit_hero.jpg');
    if (fs.existsSync(heroPath)) {
      res.sendFile(heroPath);
    } else {
      res.type('image/svg+xml').send("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='#0f172a'/><text x='200' y='150' fill='#38bdf8' font-family='sans-serif' font-weight='bold' font-size='16' text-anchor='middle'>KOSALAR AUTO</text></svg>");
    }
  });

  // Supabase Config info endpoint
  app.get('/api/supabase-config', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const sUrl = normalizeSupabaseUrl(rawUrl);
    const sKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    res.json({
      supabaseUrl: sUrl,
      supabaseAnonKey: sKey,
      isConfigured: Boolean(sUrl && sKey && (sUrl.startsWith('http://') || sUrl.startsWith('https://')) && sKey.length > 10),
      bucket: STORAGE_BUCKET_NAME,
      table: 'cars'
    });
  });

  // Cars Catalog APIs (Supabase Database + Persistent Fallback)
  app.get('/api/cars', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('cars')
          .select('*')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          // Normalize rows
          const formattedCars = (data as Record<string, unknown>[]).map(row => {
            const rawBrand = (row.brand as string) || ((row.title as string)?.toLowerCase().includes('mercedes') ? 'Mercedes-Benz' : 'Ford');
            const rawModel = (row.model as string) || ((row.title as string)?.toLowerCase().includes('sprinter') ? 'Sprinter' : 'Transit');
            const city = row.city || row.location || 'Bakı';
            return {
              id: String(row.id),
              title: row.title || `${rawBrand} ${rawModel}`,
              brand: rawBrand,
              make: rawBrand,
              model: rawModel,
              city: city,
              location: city,
              year: Number(row.year) || 2011,
              price: Number(row.price) || 0,
              mileage: Number(row.mileage) || 0,
              engine: row.engine || '2.2 TDCi',
              hp: Number(row.horse_power || row.horsePower || row.hp) || 125,
              transmission: row.transmission || 'Mexaniki',
              wheelDrive: row.drive_type || row.driveType || row.wheelDrive || 'Ön çəkən (FWD)',
              bodyType: row.body_type || row.bodyType || 'Yük furqonu',
              baseLength: row.base_length || row.baseLength || '3.30 m',
              roofHeight: row.roof_height || row.roofHeight || 'Hündür dam',
              color: row.color || 'Ağ',
              fuelType: row.fuel_type || row.fuelType || 'Dizel',
              condition: row.condition || 'Vuruğu yoxdur, rənglənməyib',
              vinCode: row.vin_code || row.vinCode || '',
              primaryImage: row.primary_image || row.primaryImage || '',
              images: Array.isArray(row.images) ? row.images : (row.primary_image ? [row.primary_image] : []),
              description: row.description || '',
              features: Array.isArray(row.features) ? row.features : [],
              statusBadges: Array.isArray(row.badges) ? row.badges : (Array.isArray(row.statusBadges) ? row.statusBadges : ['Vuruqsuz', 'Gömrük olunub', 'Zəmanətli']),
              isFeatured: Boolean(row.is_featured ?? row.isFeatured),
              status: row.status === 'sold' ? 'sold' : 'active'
            };
          });
          saveCarsToDisk(formattedCars);
          res.json({ success: true, cars: formattedCars, source: 'supabase' });
          return;
        }
      } catch (sbErr) {
        console.warn('Supabase fetch failed in /api/cars, using local store:', sbErr);
      }
    }

    const cars = getCarsFromDisk();
    res.json({ success: true, cars, source: 'local' });
  });

  // Admin authorization middleware
  const requireAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'İcazəsiz əməliyyat: Admin autentifikasiyası tələb olunur' });
      return;
    }

    const token = authHeader.substring(7).trim();

    // 1. Verify server-issued HMAC signed admin session token
    if (verifyAdminSessionToken(token)) {
      return next();
    }

    // 2. Explicit security check: If a normal Supabase authenticated user attempts to access admin endpoints,
    // explicitly reject with 403 Forbidden. A normal Supabase user must NEVER be treated as an administrator.
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          res.status(403).json({
            success: false,
            error: 'Giriş qadağandır: Supabase istifadəçisi admin hüquqlarına malik deyil. Yalnız etibarlı admin sessiyası qəbul edilir.'
          });
          return;
        }
      } catch {
        // ignore
      }
    }

    res.status(401).json({ success: false, error: 'Sessiyanızın vaxtı bitib və ya icazəniz yoxdur. Zəhmət olmasa yenidən daxil olun.' });
  };

  // Protected: Save / Update Cars Catalog
  app.post('/api/cars', requireAdminAuth, async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const { cars } = req.body;
    const validation = validateAndSanitizeCars(cars);
    if (!validation.valid || !validation.sanitized) {
      res.status(400).json({ error: validation.error || 'Daxil edilən elan məlumatları düzgün formatda deyil' });
      return;
    }

    const sanitizedCars = validation.sanitized;

    // Always update local disk
    saveCarsToDisk(sanitizedCars);

    // Sync to Supabase if client is ready
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const rows = sanitizedCars.map((c: Record<string, unknown>) => ({
          id: String(c.id),
          title: c.title,
          brand: (c.brand as string) || ((c.title as string)?.toLowerCase().includes('mercedes') ? 'mercedes' : 'ford'),
          model: c.model || 'Transit',
          year: Number(c.year),
          price: Number(c.price),
          mileage: Number(c.mileage),
          engine: c.engine,
          horse_power: Number((c.horsePower as number) || (c.hp as number) || 125),
          transmission: c.transmission,
          drive_type: c.driveType || c.wheelDrive,
          body_type: c.bodyType,
          base_length: c.baseLength,
          roof_height: c.roofHeight,
          color: c.color,
          primary_image: c.primaryImage,
          images: Array.isArray(c.images) ? c.images : [],
          description: c.description || '',
          features: Array.isArray(c.features) ? c.features : [],
          badges: Array.isArray(c.badges || c.statusBadges) ? (c.badges || c.statusBadges) : [],
          is_featured: Boolean(c.isFeatured),
          status: c.status === 'sold' ? 'sold' : 'active',
          updated_at: new Date().toISOString()
        }));

        const { error } = await supabase.from('cars').upsert(rows, { onConflict: 'id' });
        if (error) {
          console.warn('Supabase batch upsert warning:', error.message);
        }
      } catch (sbErr) {
        console.warn('Failed to sync cars to Supabase:', sbErr);
      }
    }

    res.json({ success: true, cars: sanitizedCars });
  });

  // Protected: Delete car endpoint with Supabase Storage and DB cleanup
  app.delete('/api/cars/:id', requireAdminAuth, async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const rawId = req.params.id;
    if (!rawId) {
      res.status(400).json({ error: 'Avtomobil ID tələb olunur' });
      return;
    }

    const carId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);

    try {
      // 1. Remove from local disk/cache
      const currentCars = getCarsFromDisk();
      const updatedCars = currentCars.filter((c: Record<string, unknown>) => String(c.id) !== String(carId));
      saveCarsToDisk(updatedCars);

      // 2. Remove from Supabase DB & Storage if configured
      const supabase = getServerSupabase();
      if (supabase) {
        try {
          // Get car images first
          const { data: dbCar } = await supabase
            .from('cars')
            .select('primary_image, images')
            .eq('id', carId)
            .maybeSingle();

          if (dbCar) {
            const allImages: string[] = [];
            if (dbCar.primary_image) allImages.push(dbCar.primary_image);
            if (Array.isArray(dbCar.images)) allImages.push(...dbCar.images);

            const paths: string[] = [];
            for (const imgUrl of allImages) {
              if (!imgUrl || typeof imgUrl !== 'string') continue;
              const match = imgUrl.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/?#]+\/(.+)$/i);
              if (match && match[1]) {
                const p = decodeURIComponent(match[1]);
                paths.push(p);
                if (p.startsWith('cars/')) paths.push(p.replace(/^cars\//, ''));
                else paths.push(`cars/${p}`);
              }
            }

            if (paths.length > 0) {
              await supabase.storage.from('CAR-IMAGES').remove(paths).catch(() => {});
              await supabase.storage.from('car-images').remove(paths).catch(() => {});
              await supabase.storage.from('cars').remove(paths).catch(() => {});
              await supabase.storage.from(STORAGE_BUCKET_NAME).remove(paths).catch(() => {});
            }
          }

          // Delete DB row
          await supabase.from('cars').delete().eq('id', carId);
        } catch (sbErr) {
          console.warn('Server Supabase car delete sync warning:', sbErr);
        }
      }

      res.json({ success: true, message: 'Avtomobil uğurla silindi' });
    } catch (err: unknown) {
      console.error('Server car delete error:', err);
      res.status(500).json({ error: 'Silinmə zamanı xəta baş verdi' });
    }
  });

  // Protected: Delete uploaded image(s) from Supabase Storage and local storage
  app.delete('/api/upload-image', requireAdminAuth, async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const { urls, filePaths } = req.body || {};
      const itemsToDelete = Array.isArray(urls) ? urls : Array.isArray(filePaths) ? filePaths : [];

      if (itemsToDelete.length === 0) {
        res.status(400).json({ error: 'Silinəcək şəkil siyahısı tələb olunur' });
        return;
      }

      const paths: string[] = [];
      const localFiles: string[] = [];

      for (const item of itemsToDelete) {
        if (!item || typeof item !== 'string') continue;

        // Check if local file
        if (item.includes('/pics/uploads/')) {
          const localFileName = item.split('/pics/uploads/')[1]?.split('?')[0]?.split('#')[0];
          if (localFileName) {
            localFiles.push(localFileName.replace(/[^a-zA-Z0-9._-]/g, ''));
          }
        }

        // Check if Supabase Storage URL or path
        const match = item.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/?#]+\/(.+)$/i);
        if (match && match[1]) {
          const p = decodeURIComponent(match[1]);
          paths.push(p);
          if (p.startsWith('cars/')) paths.push(p.replace(/^cars\//, ''));
          else paths.push(`cars/${p}`);
        } else if (!item.startsWith('http') && !item.startsWith('/')) {
          paths.push(item);
          if (item.startsWith('cars/')) paths.push(item.replace(/^cars\//, ''));
          else paths.push(`cars/${item}`);
        }
      }

      // 1. Delete from Supabase Storage using server credentials
      const supabase = getServerSupabase();
      if (supabase && paths.length > 0) {
        await supabase.storage.from('CAR-IMAGES').remove(paths).catch(() => {});
        await supabase.storage.from('car-images').remove(paths).catch(() => {});
        await supabase.storage.from('cars').remove(paths).catch(() => {});
        await supabase.storage.from(STORAGE_BUCKET_NAME).remove(paths).catch(() => {});
      }

      // 2. Delete local files if any
      for (const localFile of localFiles) {
        try {
          const filePath = path.join(process.cwd(), 'public', 'pics', 'uploads', localFile);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fErr) {
          console.warn('Local file delete warning:', fErr);
        }
      }

      res.json({ success: true, message: 'Şəkillər uğurla silindi' });
    } catch (err: unknown) {
      console.error('Image delete error:', err);
      res.status(500).json({ error: 'Şəkillərin silinməsi zamanı xəta baş verdi' });
    }
  });

  // Protected: Multiple image upload helper endpoint (Supabase Storage First with Magic Byte Inspection)
  app.post('/api/upload-image', requireAdminAuth, async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const { dataUrl, filename } = req.body;
      if (!dataUrl) {
        res.status(400).json({ error: 'dataUrl tələb olunur' });
        return;
      }

      // If it's already an HTTP URL, return as-is
      if (dataUrl.startsWith('http') || (dataUrl.startsWith('/') && !dataUrl.startsWith('data:'))) {
        res.json({ url: dataUrl, success: true });
        return;
      }

      // Parse base64
      const matches = dataUrl.match(/^data:image\/([A-Za-z0-9-+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ error: 'Düzgün şəkil formatı deyil' });
        return;
      }

      const rawExt = matches[1].toLowerCase().replace('jpeg', 'jpg');
      const extension = ['jpg', 'png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'jpg';
      const buffer = Buffer.from(matches[2], 'base64');

      // Maximum 15MB file size limit
      if (buffer.length > 15 * 1024 * 1024) {
        res.status(413).json({ error: 'Fayl həcmi 15MB-dan artıq ola bilməz' });
        return;
      }

      // Magic Byte inspection: Verify the payload is a genuine image (no SVG bypass)
      if (!isValidImageBuffer(buffer)) {
        res.status(400).json({ error: 'Yalnız etibarlı şəkil formatları (JPEG, PNG, WebP, GIF) qəbul edilir' });
        return;
      }

      const cleanName = filename ? filename.replace(/[^a-zA-Z0-9.-]/g, '_') : `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
      const storagePath = `cars/${Date.now()}_${cleanName}`;

      // 1. Try Supabase Storage upload
      const supabase = getServerSupabase();
      if (supabase) {
        try {
          const contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .upload(storagePath, buffer, {
              contentType,
              upsert: true
            });

          if (!upErr) {
            const { data: pubData } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(storagePath);
            if (pubData?.publicUrl) {
              res.json({ url: pubData.publicUrl, success: true, storage: 'supabase' });
              return;
            }
          } else {
            console.warn(`Supabase storage upload error on ${STORAGE_BUCKET_NAME}:`, upErr.message);
            // Secondary attempt with clean name directly
            const { error: retryErr } = await supabase.storage
              .from(STORAGE_BUCKET_NAME)
              .upload(cleanName, buffer, {
                contentType,
                upsert: true
              });
            if (!retryErr) {
              const { data: fbData } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(cleanName);
              if (fbData?.publicUrl) {
                res.json({ url: fbData.publicUrl, success: true, storage: 'supabase' });
                return;
              }
            }
          }
        } catch (sbStorageErr) {
          console.warn('Supabase storage exception:', sbStorageErr);
        }
      }

      // 2. Fallback to local server file system
      const uploadsDir = path.join(process.cwd(), 'public', 'pics', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, buffer);

      try {
        const distUploadsDir = path.join(process.cwd(), 'dist', 'pics', 'uploads');
        if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
          if (!fs.existsSync(distUploadsDir)) {
            fs.mkdirSync(distUploadsDir, { recursive: true });
          }
          fs.writeFileSync(path.join(distUploadsDir, safeName), buffer);
        }
      } catch (distErr) {
        // Non-critical
      }

      const publicUrl = `/pics/uploads/${safeName}`;
      res.json({ url: publicUrl, success: true, storage: 'local' });
    } catch (err: unknown) {
      console.error('Image upload failed:', err);
      res.status(500).json({ error: 'Şəkil yüklənmədi' });
    }
  });

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Kosalar Auto API' });
  });

  // Session verification endpoint for admin UI
  app.get('/api/admin/check-session', requireAdminAuth, (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ success: true, authenticated: true });
  });

  // Secure Server-side Admin Verification with Rate Limiting & Constant-time Comparison
  app.post('/api/admin/verify', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown').split(',')[0].trim();
      const rateLimit = checkLoginRateLimit(clientIp);
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          error: `Həddindən artıq yanlış cəhd! Təhlükəsizlik məqsədilə zəhmət olmasa ${rateLimit.waitSeconds} saniyə gözləyin.`
        });
        return;
      }

      // Thwart timing analysis and brute-force automation
      await new Promise(r => setTimeout(r, 350));

      const { password, email } = req.body || {};
      if (!password || typeof password !== 'string') {
        recordFailedLogin(clientIp);
        res.status(400).json({ success: false, error: 'Şifrə daxil edilməyib' });
        return;
      }

      const cleanPassword = password.trim();

      // 1. Supabase Auth authentication if email was provided
      if (email && typeof email === 'string') {
        const supabase = getServerSupabase();
        if (supabase) {
          try {
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password: cleanPassword
            });
            if (!authErr && authData?.session && authData.user) {
              const userRole = authData.user.app_metadata?.role || authData.user.user_metadata?.role || '';
              const adminEmailEnv = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
              const isAllowlistedEmail = adminEmailEnv && authData.user.email?.toLowerCase() === adminEmailEnv;
              const isAdminRole = userRole === 'admin';

              if (isAdminRole || isAllowlistedEmail) {
                resetLoginAttempts(clientIp);
                const sessionToken = createAdminSessionToken();
                res.json({
                  success: true,
                  authType: 'supabase_auth',
                  token: sessionToken,
                  user: {
                    id: authData.user.id,
                    email: authData.user.email
                  }
                });
                return;
              } else {
                recordFailedLogin(clientIp);
                res.status(403).json({
                  success: false,
                  error: 'Giriş qadağandır: Bu Supabase hesabı admin səlahiyyətinə malik deyil.'
                });
                return;
              }
            }
          } catch (sbAuthErr) {
            console.warn('Supabase auth signIn error:', sbAuthErr);
          }
        }
      }

      // 2. Server-side Environment Variable verification with constant-time comparison (FAIL-CLOSED)
      const validAdminPass = process.env.ADMIN_PASSWORD || process.env.KOSALAR_ADMIN_PASS;
      if (!validAdminPass) {
        console.error('[SECURITY ALERT] Login attempt rejected: ADMIN_PASSWORD environment variable is not configured on server!');
        recordFailedLogin(clientIp);
        res.status(503).json({
          success: false,
          error: 'Sistem xətası: Admin şifrəsi server mühitində təyin edilməyib (ADMIN_PASSWORD tələb olunur). Zəhmət olmasa hosting panelində ADMIN_PASSWORD təyin edin.'
        });
        return;
      }

      const isMatch = safeComparePasswords(cleanPassword, validAdminPass);

      if (isMatch) {
        resetLoginAttempts(clientIp);
        const sessionToken = createAdminSessionToken();

        res.json({
          success: true,
          authType: 'server_env',
          token: sessionToken,
          expiresIn: 86400 // 24 hours
        });
        return;
      }

      recordFailedLogin(clientIp);
      res.status(401).json({
        success: false,
        error: 'Daxil edilən şifrə yanlışdır! Zəhmət olmasa təkrar yoxlayın.'
      });
    } catch (err: any) {
      console.error('Admin verify error:', err);
      res.status(500).json({ success: false, error: 'Təsdiqləmə zamanı daxili server xətası baş verdi' });
    }
  });

  // Global express error handler to prevent crashing
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express server caught error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Daxili server xətası' });
    }
  });

  // Vite middleware for dev or static server for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const configuredAdminPass = process.env.ADMIN_PASSWORD || process.env.KOSALAR_ADMIN_PASS;
  if (!configuredAdminPass) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  [TƏHLÜKƏSİZLİK XƏBƏRDARLIĞI] ADMIN_PASSWORD və ya KOSALAR_ADMIN_PASS mühit dəyişəni təyin edilməyib!');
    console.warn('\x1b[33m%s\x1b[0m', '   Admin paneli qapalıdır (Fail-Closed). Zəhmət olmasa hosting/server parametrlərində ADMIN_PASSWORD dəyişənini daxil edin.');
  }

  // Supabase environment variables startup validation
  const startRawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const startNormUrl = normalizeSupabaseUrl(startRawUrl);
  const startKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!startNormUrl || !startKey) {
    const missing: string[] = [];
    if (!startNormUrl) missing.push('SUPABASE_URL (və ya VITE_SUPABASE_URL)');
    if (!startKey) missing.push('SUPABASE_ANON_KEY (və ya SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY)');
    console.warn('\x1b[33m%s\x1b[0m', `⚠️  [SUPABASE XƏBƏRDARLIĞI] Supabase mühit dəyişənləri təyin edilməyib: ${missing.join(', ')}`);
    console.warn('\x1b[33m%s\x1b[0m', '   Supabase əlaqəsi deaktivdir. Server yerli disk-keş (data/cars.json) rejimində davam edir.');
  } else {
    console.log(`✅ Supabase konfiqurasiyası mühit dəyişənlərindən təyin edildi (${startNormUrl})`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Process-level crash prevention
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception caught safely:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection caught safely at:', promise, 'reason:', reason);
});

startServer().catch((err) => {
  console.error('Fatal startServer error:', err);
});
