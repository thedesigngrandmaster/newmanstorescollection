// Small localStorage cache used by the simplified admin so the dashboard still
// shows the last known numbers / product list when the device is offline.
// Never used for authentication decisions beyond the role cache in auth.tsx.

export const STATS_CACHE_KEY = "nsc_simple_stats";
export const PRODUCTS_CACHE_KEY = "nsc_simple_products";

export function readCache<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / private mode — the dashboard keeps working online.
  }
}
