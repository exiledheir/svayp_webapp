export interface TryOnRecord {
  id: string;
  resultUrl: string;
  timestamp: number;
}

const STORAGE_KEY = 'libas_tryon_history';
const MAX_RECORDS = 20;

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

export function deleteTryOnRecord(id: string): void {
  if (typeof window === 'undefined') return;
  const updated = getTryOnHistory().filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* storage quota */ }
}
