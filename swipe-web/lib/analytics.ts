// Firebase Analytics singleton — SSR-safe (Next.js pages router).
// Call initAnalytics() once in _app.tsx on mount.
//
// Every event is dual-written: to Firebase AND to our own backend app_events
// pipeline (lib/app-events.ts), so funnels can be built in the admin dashboard.
// Events fired before Firebase finishes initialising are buffered in a pre-init
// queue and flushed (with the user identity already set) once init completes —
// nothing is silently dropped on startup.

import { initializeApp, getApps } from 'firebase/app';
import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
  isSupported,
  type Analytics,
} from 'firebase/analytics';
import { trackAppEvent } from './app-events';
import {
  initPostHog,
  posthogCapture,
  posthogPageView,
  posthogIdentify,
  posthogReset,
} from './posthog';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let instance: Analytics | null = null;
// Firebase init resolved (successfully or not) — pre-init queue may be drained.
let initSettled = false;

type PendingEvent = {
  eventName: string;
  params?: Record<string, string | number | boolean>;
};
const preInitQueue: PendingEvent[] = [];
const PRE_INIT_QUEUE_CAP = 100;

function debugEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  try {
    return new URLSearchParams(window.location.search).has('debug_mode');
  } catch {
    return false;
  }
}

function debugLog(...args: unknown[]): void {
  if (debugEnabled()) console.log('[Analytics]', ...args);
}

// Expose instance globally for debugging (optional)
if (typeof window !== 'undefined') {
  (window as any).__firebaseAnalyticsDebug = () => ({
    instance: instance ? 'INITIALIZED' : 'NULL',
    queued: preInitQueue.length,
    config: {
      projectId: firebaseConfig.projectId,
      measurementId: firebaseConfig.measurementId,
    },
  });
}

export interface AnalyticsIdentity {
  userId?: string;
  userProperties?: Record<string, string>;
  /** PostHog-only person properties (username/phone — PII, в Firebase не шлём). */
  personProperties?: Record<string, string>;
}

/**
 * Initialise Firebase. Pass the known identity so it is applied BEFORE the
 * pre-init event buffer is drained — otherwise startup events lose attribution.
 */
export async function initAnalytics(identity?: AnalyticsIdentity): Promise<void> {
  if (typeof window === 'undefined') return;
  // PostHog — no-op без NEXT_PUBLIC_POSTHOG_KEY/HOST
  initPostHog();
  if (identity?.userId) {
    posthogIdentify(identity.userId, {
      ...identity.userProperties,
      ...identity.personProperties,
    });
  }
  try {
    const supported = await isSupported();
    if (!supported) {
      debugLog('Firebase Analytics is not supported in this environment');
      return;
    }
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    instance = getAnalytics(app);

    if (identity?.userId) setAnalyticsUser(identity.userId);
    if (identity?.userProperties) setAnalyticsUserProperties(identity.userProperties);

    if (new URLSearchParams(window.location.search).has('debug_mode')) {
      debugLog('Debug mode: events visible in Firebase DebugView');
      logEvent(instance, 'debug_mode_enabled', { timestamp: new Date().toISOString() });
    }
    debugLog('Firebase Analytics initialized');
  } catch (err) {
    console.error('[Analytics] Failed to initialize Firebase Analytics:', err);
    // Analytics is optional — never crash the app
  } finally {
    // Even if Firebase failed, drain the buffer so app_events still got these
    // via trackAppEvent at fire time and Firebase gets whatever is possible.
    initSettled = true;
    drainPreInitQueue();
  }
}

function drainPreInitQueue(): void {
  while (preInitQueue.length > 0) {
    const { eventName, params } = preInitQueue.shift()!;
    fireFirebaseEvent(eventName, params);
  }
}

function fireFirebaseEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!instance) return; // Firebase unavailable — app_events already has it
  try {
    logEvent(instance, eventName, params);
    debugLog(`Event: ${eventName}`, params);
  } catch (err) {
    console.error(`[Analytics] Failed to log event ${eventName}:`, err);
  }
}

export function logAnalyticsEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  // Our own pipeline first — independent of Firebase init state.
  trackAppEvent(eventName, params);
  posthogCapture(eventName, params);

  if (!initSettled) {
    // Buffer until initAnalytics() settles so startup events reach Firebase
    // with the user identity already set.
    if (preInitQueue.length < PRE_INIT_QUEUE_CAP) preInitQueue.push({ eventName, params });
    return;
  }
  fireFirebaseEvent(eventName, params);
}

/**
 * Page view: Firebase keeps its conventional `page_view`, while app_events
 * gets `screen_view` — the same name the mobile app sends, so cross-platform
 * screen analytics aggregate in one place.
 */
export function logPageViewEvent(path: string): void {
  trackAppEvent('screen_view', { page_path: path });
  posthogPageView(path);

  if (!initSettled) {
    if (preInitQueue.length < PRE_INIT_QUEUE_CAP) {
      preInitQueue.push({ eventName: 'page_view', params: { page_path: path } });
    }
    return;
  }
  fireFirebaseEvent('page_view', { page_path: path });
}

export function setAnalyticsUser(userId: string): void {
  posthogIdentify(userId);
  if (!instance) return;
  try {
    setUserId(instance, userId);
    debugLog(`User ID set: ${userId}`);
  } catch (err) {
    console.error('[Analytics] Failed to set user ID:', err);
  }
}

export function clearAnalyticsUser(): void {
  posthogReset();
  if (!instance) return;
  try {
    // Firebase typing requires a string, but null clears the user
    setUserId(instance, null as unknown as string);
    debugLog('User ID cleared');
  } catch (err) {
    console.error('[Analytics] Failed to clear user ID:', err);
  }
}

export function setAnalyticsUserProperties(props: Record<string, string>): void {
  if (!instance) return;
  try {
    setUserProperties(instance, props);
    debugLog('User properties set:', props);
  } catch (err) {
    console.error('[Analytics] Failed to set user properties:', err);
  }
}
