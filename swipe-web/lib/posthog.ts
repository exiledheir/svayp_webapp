// PostHog — третий канал аналитики (Firebase + app_events + PostHog).
// Включается ТОЛЬКО когда заданы env-переменные:
//   NEXT_PUBLIC_POSTHOG_KEY  — project API key
//   NEXT_PUBLIC_POSTHOG_HOST — хост инстанса (self-hosted в Azure или https://eu.i.posthog.com)
// Без ключа все функции — no-op, приложение работает как раньше.

import posthog from 'posthog-js';
// Бандлим рекордер реплеев: иначе он лениво грузится с сервера ПОСЛЕ старта
// сессии, первый снимок экрана опаздывает и начало записи — чёрный экран
// («initial snapshot arrived late» в плеере).
import 'posthog-js/dist/recorder';
import { isInFlutterWebView } from './flutter-bridge';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

let enabled = false;

export function initPostHog(): void {
  if (typeof window === 'undefined' || !KEY || !HOST || enabled) return;
  try {
    // Внутри Flutter-вебвью запись сессии ведёт мобильный SDK (posthog_flutter
    // снимает и натив, и вебвью в ОДНУ запись). posthog-js здесь НЕ должен
    // писать вторую, дублирующую web-запись — только события (они сшиваются
    // с мобильной персоной по одному user_id). В браузере/Telegram — пишем.
    const inFlutterWebView = isInFlutterWebView();
    posthog.init(KEY, {
      api_host: HOST,
      // page_view шлём сами из _app (единый путь с Firebase/app_events)
      capture_pageview: false,
      capture_pageleave: true,
      // Клики по кнопкам/ссылкам как события $autocapture: питает «топ кнопок»,
      // heatmaps и поиск по тексту кнопки. Кастомный словарь событий не трогает.
      autocapture: true,
      persistence: 'localStorage',
      disable_session_recording: inFlutterWebView,
      session_recording: {
        maskAllInputs: true, // не записываем содержимое полей ввода
      },
    });
    enabled = true;
  } catch {
    /* аналитика никогда не роняет приложение */
  }
}

export function posthogCapture(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!enabled) return;
  try {
    posthog.capture(eventName, params);
  } catch { /* ignore */ }
}

export function posthogPageView(path: string): void {
  if (!enabled) return;
  try {
    posthog.capture('$pageview', { $current_url: path });
  } catch { /* ignore */ }
}

export function posthogIdentify(userId: string, props?: Record<string, string>): void {
  if (!enabled) return;
  try {
    posthog.identify(userId, props);
  } catch { /* ignore */ }
}

export function posthogReset(): void {
  if (!enabled) return;
  try {
    posthog.reset();
  } catch { /* ignore */ }
}
