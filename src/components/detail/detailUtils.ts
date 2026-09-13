// Safe Number Formatter (e.g. 14 500)
export function formatNumberSafe(val: unknown, fallback = '0'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString('az-AZ').replace(/,/g, ' ');
}

// Format brand display name to always start with proper capital letter
export function formatBrandDisplayName(brand?: string, title?: string): string {
  const raw = (brand || '').trim();
  const lower = raw.toLowerCase();
  if (lower === 'ford') return 'Ford';
  if (lower === 'mercedes' || lower === 'mercedes-benz' || lower === 'mercedes benz') return 'Mercedes';
  if (lower === 'iveco') return 'Iveco';
  if (lower === 'volkswagen' || lower === 'vw') return 'Volkswagen';
  if (lower === 'renault') return 'Renault';
  if (lower === 'peugeot') return 'Peugeot';
  if (lower === 'fiat') return 'Fiat';
  if (lower === 'opel') return 'Opel';
  if (lower === 'hyundai') return 'Hyundai';
  if (lower === 'toyota') return 'Toyota';
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);

  if (title) {
    const tLower = title.toLowerCase();
    if (tLower.includes('mercedes')) return 'Mercedes';
    if (tLower.includes('iveco')) return 'Iveco';
    if (tLower.includes('volkswagen') || tLower.includes('crafter')) return 'Volkswagen';
    if (tLower.includes('renault') || tLower.includes('master')) return 'Renault';
    if (tLower.includes('peugeot') || tLower.includes('boxer')) return 'Peugeot';
    if (tLower.includes('fiat') || tLower.includes('ducato')) return 'Fiat';
  }
  return 'Ford';
}

// Format model display name
export function formatModelDisplayName(model?: string, title?: string): string {
  const raw = (model || '').trim();
  const lower = raw.toLowerCase();
  if (lower === 'transit') return 'Transit';
  if (lower === 'sprinter') return 'Sprinter';
  if (lower === 'daily') return 'Daily';
  if (lower === 'crafter') return 'Crafter';
  if (lower === 'master') return 'Master';
  if (lower === 'boxer') return 'Boxer';
  if (lower === 'ducato') return 'Ducato';
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);

  if (title) {
    const tLower = title.toLowerCase();
    if (tLower.includes('sprinter')) return 'Sprinter';
    if (tLower.includes('daily')) return 'Daily';
    if (tLower.includes('crafter')) return 'Crafter';
    if (tLower.includes('master')) return 'Master';
    if (tLower.includes('boxer')) return 'Boxer';
    if (tLower.includes('ducato')) return 'Ducato';
  }
  return 'Transit';
}

// Safe Features Parser (Only returns active/true features)
export function parseAndFilterFeatures(rawFeatures: unknown): string[] {
  if (!rawFeatures) return [];
  
  let list: unknown[] = [];
  if (Array.isArray(rawFeatures)) {
    list = rawFeatures;
  } else if (typeof rawFeatures === 'string') {
    try {
      const parsed = JSON.parse(rawFeatures);
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        list = Object.entries(parsed)
          .filter(([_, val]) => Boolean(val))
          .map(([key]) => key);
      } else {
        list = rawFeatures.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch {
      list = rawFeatures.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else if (typeof rawFeatures === 'object' && rawFeatures !== null) {
    list = Object.entries(rawFeatures as Record<string, unknown>)
      .filter(([_, val]) => Boolean(val))
      .map(([key]) => key);
  }

  const result: string[] = [];
  for (const item of list) {
    if (!item) continue;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.length > 0) result.push(trimmed);
    } else if (typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const isActive = obj.active !== false && obj.checked !== false && obj.enabled !== false && obj.is_active !== false;
      if (isActive) {
        const name = (obj.name || obj.title || obj.feature || obj.label || obj.value || '') as string;
        if (typeof name === 'string' && name.trim().length > 0) {
          result.push(name.trim());
        }
      }
    }
  }

  return Array.from(new Set(result));
}
