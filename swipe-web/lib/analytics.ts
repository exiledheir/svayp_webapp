// Firebase Analytics singleton — SSR-safe (Next.js pages router).
// Call initAnalytics() once in _app.tsx on mount.

import { initializeApp, getApps } from 'firebase/app';
import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
  isSupported,
  type Analytics,
} from 'firebase/analytics';

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

// Expose instance globally for debugging (optional)
if (typeof window !== 'undefined') {
  (window as any).__firebaseAnalyticsDebug = () => ({
    instance: instance ? 'INITIALIZED' : 'NULL',
    config: {
      projectId: firebaseConfig.projectId,
      measurementId: firebaseConfig.measurementId,
    },
  });
}

export async function initAnalytics(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const supported = await isSupported();
    console.log('[Analytics] isSupported check:', supported);
    if (!supported) {
      console.warn('[Analytics] Firebase Analytics is not supported in this environment');
      return;
    }
    console.log('[Analytics] Initializing Firebase...');
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    console.log('[Analytics] Firebase app initialized, getting analytics instance...');
    instance = getAnalytics(app);
    console.log('[Analytics] Firebase Analytics instance created successfully');
    
    // Log debug info if debug_mode parameter is present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug_mode')) {
      console.log('[Analytics] Debug mode: events will be visible in Firebase DebugView');
      console.log('[Analytics] DebugView URL: https://console.firebase.google.com/project/svayp-ai/analytics/debugview');
      // Log a test event to confirm setup
      logEvent(instance, 'debug_mode_enabled', {
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log('[Analytics] Firebase Analytics initialized successfully');
  } catch (err) {
    console.error('[Analytics] Failed to initialize Firebase Analytics:', err);
    console.error('[Analytics] Stack:', err instanceof Error ? err.stack : 'N/A');
    // Analytics is optional — never crash the app
  }
}

export function logAnalyticsEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!instance) {
    console.warn(`[Analytics] Event logged but analytics not initialized: ${eventName}`, params);
    return;
  }
  try {
    logEvent(instance, eventName, params);
    console.log(`[Analytics] Event: ${eventName}`, params);
  } catch (err) {
    console.error(`[Analytics] Failed to log event ${eventName}:`, err);
  }
}

export function setAnalyticsUser(userId: string): void {
  if (!instance) {
    console.warn(`[Analytics] User ID set but analytics not initialized: ${userId}`);
    return;
  }
  try {
    setUserId(instance, userId);
    console.log(`[Analytics] User ID set: ${userId}`);
  } catch (err) {
    console.error(`[Analytics] Failed to set user ID:`, err);
  }
}

export function clearAnalyticsUser(): void {
  if (!instance) {
    console.warn('[Analytics] Clear user but analytics not initialized');
    return;
  }
  try {
    // Firebase typing requires a string, but null clears the user
    setUserId(instance, null as unknown as string);
    console.log('[Analytics] User ID cleared');
  } catch (err) {
    console.error(`[Analytics] Failed to clear user ID:`, err);
  }
}

export function setAnalyticsUserProperties(
  props: Record<string, string>,
): void {
  if (!instance) {
    console.warn('[Analytics] User properties set but analytics not initialized', props);
    return;
  }
  try {
    setUserProperties(instance, props);
    console.log('[Analytics] User properties set:', props);
  } catch (err) {
    console.error(`[Analytics] Failed to set user properties:`, err);
  }
}
