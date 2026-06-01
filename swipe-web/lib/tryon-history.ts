export interface TryOnRecord {
  id: string;
  resultUrl: string;
  timestamp: number;
}

const STORAGE_KEY = 'libas_tryon_history';
const ACTIVE_JOB_KEY = 'libas_active_tryon_job';
const MAX_RECORDS = 20;

// ── Telegram CloudStorage helpers ────────────────────────────────────────────
// CloudStorage survives Mini App restarts on iOS (localStorage does not).
const CLOUD_HISTORY_KEY = 'svayp_tryon_hist';
const CLOUD_ACTIVE_JOB_KEY = 'svayp_tryon_job';

type TgCloudStorage = {
  setItem(key: string, value: string, cb?: (err: string | null) => void): void;
  getItem(key: string, cb: (err: string | null, value?: string) => void): void;
  removeItem(key: string, cb?: (err: string | null) => void): void;
};

function getCloudStorage(): TgCloudStorage | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { Telegram?: { WebApp?: { CloudStorage?: TgCloudStorage } } })
      .Telegram?.WebApp?.CloudStorage ?? null
  );
}

function syncHistoryToCloud(records: TryOnRecord[]): void {
  // CloudStorage values are limited — store only what we need (last 10 records, compact)
  const compact = records.slice(0, 10).map((r) => ({ u: r.resultUrl, t: r.timestamp }));
  try {
    getCloudStorage()?.setItem(CLOUD_HISTORY_KEY, JSON.stringify(compact));
  } catch { /* ignore */ }
}

function restoreHistoryFromCloud(): Promise<TryOnRecord[]> {
  return new Promise((resolve) => {
    const cs = getCloudStorage();
    if (!cs) { resolve([]); return; }
    cs.getItem(CLOUD_HISTORY_KEY, (err, value) => {
      if (err || !value) { resolve([]); return; }
      try {
        const compact = JSON.parse(value) as { u: string; t: number }[];
        resolve(compact.map((c, i) => ({
          id: `cloud_${c.t}_${i}`,
          resultUrl: c.u,
          timestamp: c.t,
        })));
      } catch { resolve([]); }
    });
  });
}

// ── Active Try-On Job (survives reload) ──────────────────────────────────────

export function saveActiveTryOnJob(jobId: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(ACTIVE_JOB_KEY, jobId); } catch {}
  try { getCloudStorage()?.setItem(CLOUD_ACTIVE_JOB_KEY, jobId); } catch {}
}

export function getActiveTryOnJob(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_JOB_KEY);
}

export function getActiveTryOnJobWithCloud(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(null); return; }
    const local = localStorage.getItem(ACTIVE_JOB_KEY);
    if (local) { resolve(local); return; }
    const cs = getCloudStorage();
    if (!cs) { resolve(null); return; }
    cs.getItem(CLOUD_ACTIVE_JOB_KEY, (err, value) => {
      resolve(!err && value ? value : null);
    });
  });
}

export function clearActiveTryOnJob(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(ACTIVE_JOB_KEY); } catch {}
  try { getCloudStorage()?.removeItem(CLOUD_ACTIVE_JOB_KEY); } catch {}
}

// ── Try-On History ───────────────────────────────────────────────────────────

export function saveTryOnResult(resultUrl: string): void {
  if (typeof window === 'undefined') return;
  const current = getTryOnHistory();
  const record: TryOnRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    resultUrl,
    timestamp: Date.now(),
  };
  const updated = [record, ...current].slice(0, MAX_RECORDS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* storage quota */ }
  syncHistoryToCloud(updated);
}

export function getTryOnHistory(): TryOnRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TryOnRecord[];
  } catch {
    return [];
  }
}

/** Try localStorage first; if empty (iOS Telegram clears it), restore from CloudStorage */
export async function getTryOnHistoryWithCloud(): Promise<TryOnRecord[]> {
  const local = getTryOnHistory();
  if (local.length > 0) return local;
  const cloud = await restoreHistoryFromCloud();
  if (cloud.length > 0) {
    // Re-hydrate localStorage from cloud
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud)); } catch {}
  }
  return cloud;
}

export function deleteTryOnRecord(id: string): void {
  if (typeof window === 'undefined') return;
  const updated = getTryOnHistory().filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* storage quota */ }
  syncHistoryToCloud(updated);
}
