const ONBOARDING_KEY = 'svayp_onboarding_complete';
const CLOUD_ONBOARDING_KEY = 'svayp_ob';

type TgCloudStorage = {
  setItem(key: string, value: string, cb?: (err: string | null) => void): void;
  getItem(key: string, cb: (err: string | null, value?: string) => void): void;
};

function getCloudStorage(): TgCloudStorage | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { Telegram?: { WebApp?: { CloudStorage?: TgCloudStorage } } })
      .Telegram?.WebApp?.CloudStorage ?? null
  );
}

export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch { /* ignore */ }
  // Mirror to Telegram CloudStorage so it survives localStorage being cleared on iOS
  getCloudStorage()?.setItem(CLOUD_ONBOARDING_KEY, 'true');
}

/**
 * Call once on app startup (in _app.tsx) to restore the onboarding flag from
 * Telegram CloudStorage into localStorage, so isOnboardingComplete() works
 * synchronously even after iOS clears localStorage.
 */
export function restoreOnboardingFromCloud(): Promise<void> {
  return new Promise((resolve) => {
    const cs = getCloudStorage();
    if (!cs) { resolve(); return; }
    cs.getItem(CLOUD_ONBOARDING_KEY, (err, value) => {
      if (!err && value === 'true') {
        try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch { /* ignore */ }
      }
      resolve();
    });
  });
}

export function clearOnboarding(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch { /* ignore */ }
}
