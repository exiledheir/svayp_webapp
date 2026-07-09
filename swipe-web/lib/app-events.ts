// Offline-resilient sink that batches generic analytics events to our backend
// (POST /proxy/analytics/events/batch → app_events). Mirrors the mobile app's
// AnalyticsApiService/SessionManager semantics: in-memory queue persisted to
// localStorage (survives WebView reloads), flushed on a timer / queue growth /
// page hide, session UUID rotated after 30 min of inactivity, stable anon_id.
//
// Never throws into the caller — analytics must not disrupt the app.

import { getHostPlatform } from './flutter-bridge';
import pkg from '../package.json';

const QUEUE_KEY = 'app_events_queue_v1';
const SESSION_KEY = 'app_events_session_v1';
const ANON_KEY = 'app_events_anon_id';
const MAX_QUEUE = 500;
const FLUSH_THRESHOLD = 20;
const FLUSH_INTERVAL_MS = 10_000;
const SESSION_IDLE_MS = 30 * 60_000;
const ENDPOINT = '/proxy/analytics/events/batch';

interface QueuedEvent {
  event_name: string;
  screen: string | null;
  properties: Record<string, unknown>;
  platform: string;
  source: 'webapp';
  anon_id: string;
  session_id: string;
  app_version: string;
  os_version: string | null;
  device_model: string | null;
}

/** "iOS 17.4" / "Android 14" из userAgent — иначе webapp в дашборде «Технологии» виден как unknown. */
function osVersionFromUa(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  const ios = ua.match(/(?:iPhone|CPU) OS (\d+[._]\d+)/);
  if (ios) return `iOS ${ios[1].replace('_', '.')}`.slice(0, 24);
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (android) return `Android ${android[1]}`.slice(0, 24);
  return null;
}

/** Модель устройства из userAgent (best-effort). */
function deviceModelFromUa(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  // "... Android 14; SM-A525F Build/..." → SM-A525F
  const android = ua.match(/Android [^;]+; ([^;)]+?)(?: Build|\))/);
  if (android) return android[1].trim().slice(0, 64);
  return null;
}

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let flushing = false;
let currentScreen: string | null = null;

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Older WebViews without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full/unavailable — analytics stays best-effort */
  }
}

function getAnonId(): string {
  let id: string | null = null;
  try {
    id = localStorage.getItem(ANON_KEY);
  } catch { /* ignore */ }
  if (!id) {
    id = uuid();
    try {
      localStorage.setItem(ANON_KEY, id);
    } catch { /* ignore */ }
  }
  return id;
}

/** Session UUID with 30-minute idle rotation (same semantics as mobile SessionManager). */
function getSessionId(): string {
  const now = Date.now();
  const saved = readJson<{ id: string; last: number }>(SESSION_KEY);
  if (saved && now - saved.last < SESSION_IDLE_MS) {
    writeJson(SESSION_KEY, { id: saved.id, last: now });
    return saved.id;
  }
  const fresh = uuid();
  writeJson(SESSION_KEY, { id: fresh, last: now });
  return fresh;
}

function clientContext(): string {
  if (typeof navigator !== 'undefined' && /flutter/i.test(navigator.userAgent)) {
    return 'webview_flutter';
  }
  const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
    .Telegram?.WebApp?.initData;
  if (tg) return 'telegram_miniapp';
  return 'browser';
}

/** Normalise a Next.js route: keep the pattern (`/feed/p/[id]` → `/feed/p/:id`). */
function normalizeScreen(path: string): string {
  return path.split('?')[0].replace(/\[([^\]]+)\]/g, ':$1');
}

/** Called from _app on every route change so events carry the current screen. */
export function setAppEventsScreen(routePattern: string): void {
  currentScreen = normalizeScreen(routePattern);
}

/** Start timers + lifecycle flush hooks. Call once on mount from _app. */
export function initAppEvents(): void {
  if (typeof window === 'undefined' || timer) return;
  const persisted = readJson<QueuedEvent[]>(QUEUE_KEY);
  if (persisted && Array.isArray(persisted)) queue = persisted.slice(-MAX_QUEUE);
  timer = setInterval(() => void flushAppEvents(), FLUSH_INTERVAL_MS);
  const onHide = () => {
    if (document.visibilityState === 'hidden') flushAppEvents(true);
  };
  window.addEventListener('pagehide', () => flushAppEvents(true));
  document.addEventListener('visibilitychange', onHide);
}

/**
 * Queue one event for the backend app_events pipeline. `params` become jsonb
 * `properties` (plus client_ts/client_context). Safe pre-init: events queue to
 * localStorage and go out on the first flush.
 */
export function trackAppEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') return;
  try {
    const event: QueuedEvent = {
      event_name: eventName.slice(0, 64),
      screen: currentScreen ?? normalizeScreen(window.location.pathname),
      properties: {
        ...params,
        client_ts: new Date().toISOString(),
        client_context: clientContext(),
      },
      platform: getHostPlatform(),
      source: 'webapp',
      anon_id: getAnonId(),
      session_id: getSessionId(),
      app_version: `web-${pkg.version}`,
      os_version: osVersionFromUa(),
      device_model: deviceModelFromUa(),
    };
    queue.push(event);
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    writeJson(QUEUE_KEY, queue);
    if (queue.length >= FLUSH_THRESHOLD) void flushAppEvents();
  } catch {
    /* never disrupt the app */
  }
}

/**
 * Send the queued batch. `useBeacon` is for pagehide/visibility flushes where
 * a normal fetch may be killed by the WebView.
 */
export async function flushAppEvents(useBeacon = false): Promise<void> {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.slice(0, 200);
  const body = JSON.stringify({ events: batch });
  try {
    if (useBeacon && navigator.sendBeacon) {
      // sendBeacon cannot carry an Authorization header — the event still lands
      // anonymously (anon_id) which the backend accepts.
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      if (ok) {
        queue = queue.slice(batch.length);
        writeJson(QUEUE_KEY, queue);
      }
      return;
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let token: string | null = null;
    try {
      token = localStorage.getItem('auth_token');
    } catch { /* ignore */ }
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body,
      keepalive: useBeacon,
    });
    if (res.ok) {
      queue = queue.slice(batch.length);
      writeJson(QUEUE_KEY, queue);
    }
    // Non-2xx → keep events queued for the next flush.
  } catch {
    // Network failure → keep events queued; retried on the next interval.
  } finally {
    flushing = false;
  }
}
