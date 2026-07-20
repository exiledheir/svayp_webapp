/**
 * "Libas" support contact — the in-app help/feedback channel.
 *
 * Entry points (closet feedback banner, market support banner) call
 * {@link openSupportChat}: it asks the backend for the user's support chat
 * (`POST /chats/support`) and opens it — the NATIVE chat screen inside the
 * Flutter app (via the `open_chat` bridge), or `/chat/{id}` in a plain browser.
 *
 * If the request fails it falls back to the Libas Admin Telegram chat so the
 * button is never a dead end.
 */
import type { NextRouter } from 'next/router';
import { createSupportChat } from '@/lib/api';
import { openNativeChat, isInFlutterWebView } from '@/lib/flutter-bridge';

// t.me (not telegram.me): the native WebView intercepts t.me links and opens
// them in the external Telegram app; telegram.me is not intercepted and would
// load the web page inside the WebView instead.
export const LIBAS_ADMIN_TELEGRAM_URL = 'https://t.me/libasai_admin';

function openAdminTelegram(): void {
  if (typeof window === 'undefined') return;
  // Inside the Flutter WebView (esp. iOS WKWebView) window.open('_blank') is a
  // no-op; a real navigation lets the native delegate launch Telegram externally.
  if (isInFlutterWebView()) {
    window.location.href = LIBAS_ADMIN_TELEGRAM_URL;
  } else {
    window.open(LIBAS_ADMIN_TELEGRAM_URL, '_blank');
  }
}

/**
 * Open (or create) the support chat with the Libas team and show it.
 *
 * Inside the Flutter app the thread is handed off to the native chat module; in
 * a plain browser it routes to `/chat/{id}`. Falls back to the Libas Admin
 * Telegram chat when the support request fails.
 *
 * @param router the Next.js router (used for the browser fallback navigation)
 */
export async function openSupportChat(router: NextRouter): Promise<void> {
  try {
    const { id } = await createSupportChat();
    // Inside the mobile app → hand off to the NATIVE chat module. In a plain
    // browser → fall back to the webapp chat thread.
    if (!openNativeChat(id)) {
      await router.push(`/chat/${id}`);
    }
  } catch {
    openAdminTelegram();
  }
}
