/**
 * Analytics Operations Module
 */

/**
 * Fetch analytics data from server API (GET /api/analytics)
 */
export async function fetchAnalyticsFromSupabase(): Promise<{ 
  success: boolean; 
  whatsappClicks: number; 
  error?: string;
}> {
  const cachedVal = typeof localStorage !== 'undefined' 
    ? Number(localStorage.getItem('kosalar_whatsapp_clicks') || '0') 
    : 0;

  try {
    const res = await fetch('/api/analytics', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.whatsappClicks === 'number') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('kosalar_whatsapp_clicks', String(data.whatsappClicks));
        }
        return { success: true, whatsappClicks: data.whatsappClicks };
      }
    }
    return { success: true, whatsappClicks: cachedVal };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Xəta';
    return { success: false, whatsappClicks: cachedVal, error: msg };
  }
}

/**
 * Increment WhatsApp click counter via lightweight server endpoint.
 * Uses navigator.sendBeacon so the ping survives navigating to WhatsApp,
 * falling back to fetch with keepalive: true.
 * Guaranteed not to block the user or throw unhandled exceptions.
 */
export async function trackWhatsAppClick(carId?: string): Promise<number> {
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

  // Ping server via sendBeacon (survives page unload / external link click)
  // falling back to fetch with keepalive: true
  try {
    const payload = JSON.stringify({ carId: carId || undefined });
    const url = '/api/analytics/whatsapp-click';

    let sent = false;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        sent = navigator.sendBeacon(url, blob);
      } catch {
        sent = false;
      }
    }

    if (!sent && typeof fetch === 'function') {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  } catch {
    // Fail silently
  }

  return nextCount;
}
