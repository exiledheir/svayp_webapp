// ─── Feed source cache (7-day TTL) ───────────────────────────────────────────
// The publish picker pulls boards / try-ons / calendar from the wardrobe backend.
// Those lists change rarely, so we cache each response in localStorage for 7 days
// to avoid re-fetching every time the composer opens. `loadCached` returns fresh
// cache when valid, otherwise fetches (and falls back to stale cache on error).

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Entry<T> {
  ts: number;
  data: T;
}

export function readCache<T>(key: string): { data: T; fresh: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const e = JSON.parse(raw) as Entry<T>;
    return { data: e.data, fresh: Date.now() - e.ts < TTL_MS };
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data } as Entry<T>));
  } catch {
    // QuotaExceeded — caching is best-effort; drop silently.
  }
}

export function clearCache(...keys: string[]): void {
  if (typeof window === 'undefined') return;
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Returns fresh cache when valid; otherwise runs `fetcher`, caches and returns it.
 * On fetch error falls back to stale cache (if any) then to `fallback`.
 * Pass `force` to bypass a fresh cache (manual refresh).
 */
export async function loadCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallback: T,
  force = false,
): Promise<T> {
  const cached = readCache<T>(key);
  if (!force && cached && cached.fresh) return cached.data;
  try {
    const data = await fetcher();
    writeCache(key, data);
    return data;
  } catch {
    return cached ? cached.data : fallback;
  }
}
