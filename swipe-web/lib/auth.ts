// Key names must match what the Flutter app uses in SharedPreferences
// so that tokens injected by the Flutter WebView are readable here.
const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'web_user';

// ── Telegram CloudStorage helpers ────────────────────────────────────────────
// Telegram Mini App's CloudStorage survives WebApp restarts (unlike localStorage
// on iOS which is cleared when the user closes the Telegram WebApp).
// We mirror the refresh token here so we can silently re-auth on next open.

const CLOUD_RT_KEY = 'svayp_rt';

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

function syncRefreshToCloud(refreshToken: string): void {
  getCloudStorage()?.setItem(CLOUD_RT_KEY, refreshToken);
}

export function getRefreshFromCloud(): Promise<string | null> {
  return new Promise((resolve) => {
    const cs = getCloudStorage();
    if (!cs) { resolve(null); return; }
    cs.getItem(CLOUD_RT_KEY, (err, value) => {
      resolve(!err && value ? value : null);
    });
  });
}

function clearRefreshFromCloud(): void {
  getCloudStorage()?.removeItem(CLOUD_RT_KEY);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  // Mirror refresh token to Telegram CloudStorage so it survives localStorage
  // being cleared when the user closes the Telegram Mini App (iOS behaviour).
  syncRefreshToCloud(refreshToken);
}

export function saveUser(user: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearRefreshFromCloud();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
