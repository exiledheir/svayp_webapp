// ─── In-memory page cache ─────────────────────────────────────────────────────
// Keeps list-page data alive across client-side navigations (feed → post → back)
// so returning to a list doesn't refetch page 0 every time. Module state:
// survives Next.js route changes, resets on a full reload / WebView restart,
// so a user switch or token hand-off can never serve another user's data.

type Entry = { data: unknown; at: number };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 50;

/** Returns the cached value if it is younger than ttlMs, else null. */
export function getPageCache<T>(key: string, ttlMs: number): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setPageCache(key: string, data: unknown): void {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    // Drop the oldest entry — tiny LRU-ish bound, lists are small.
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { data, at: Date.now() });
}

/** Invalidate one key or, with a prefix, a whole family (e.g. "market:"). */
export function clearPageCache(keyOrPrefix: string, prefix = false): void {
  if (!prefix) {
    store.delete(keyOrPrefix);
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(keyOrPrefix)) store.delete(key);
  }
}
