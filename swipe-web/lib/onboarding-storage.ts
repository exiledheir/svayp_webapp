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

// ─── Interactive onboarding step (resume mid-flow) ──────────────────────────────
const ONBOARDING_STEP_KEY = 'svayp_onboarding_step';

/** Persist the current interactive-onboarding step so a reload resumes where the user left off. */
export function setOnboardingStep(step: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_STEP_KEY, String(step));
  } catch { /* ignore */ }
}

/** Returns the saved interactive-onboarding step, or 0 if none/unparseable. */
export function getOnboardingStep(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const v = parseInt(localStorage.getItem(ONBOARDING_STEP_KEY) ?? '', 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch {
    return 0;
  }
}

/** Clears the saved step (called when onboarding completes or is skipped). */
export function clearOnboardingStep(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ONBOARDING_STEP_KEY);
  } catch { /* ignore */ }
}

// ─── Closet in-page tour ────────────────────────────────────────────────────────
const CLOSET_TOUR_KEY = 'svayp_closet_tour_done';

/** Returns true if the user has already dismissed the in-page coach-mark tour. */
export function isClosetTourDone(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(CLOSET_TOUR_KEY) === 'true';
  } catch {
    return true;
  }
}

/** Marks the entire in-page tour as completed so it never shows again. */
export function setClosetTourDone(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLOSET_TOUR_KEY, 'true');
  } catch { /* ignore */ }
}

/** Clears the tour-done flag so the tour will show again on next render. */
export function clearClosetTour(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CLOSET_TOUR_KEY);
  } catch { /* ignore */ }
}

// ─── Canvas interaction hint ────────────────────────────────────────────────────
const CANVAS_HINT_KEY = 'svayp_canvas_hint_seen';

/** Returns true if the canvas drag/pinch/swap hint has already been shown. */
export function isCanvasHintSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(CANVAS_HINT_KEY) === 'true';
  } catch {
    return true;
  }
}

/** Marks the canvas hint as seen so it never shows again. */
export function setCanvasHintSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CANVAS_HINT_KEY, 'true');
  } catch { /* ignore */ }
}
