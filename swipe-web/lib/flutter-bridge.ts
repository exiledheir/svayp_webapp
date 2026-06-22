/**
 * Type-safe bridge for sending messages from the web page to the Flutter
 * host application via a JavascriptChannel named "FlutterBridge".
 *
 * In a regular browser (no Flutter WebView) all calls are no-ops so the
 * auth pages remain usable standalone for testing.
 */

export type BridgeMessageType =
  | 'auth_complete'
  | 'onboarding_complete'
  | 'partner_auth_complete'
  | 'guest_mode'
  | 'telegram_auth_start'
  | 'google_auth_start'
  | 'apple_auth_start'
  | 'set_language'
  | 'set_theme'
  | 'save_image';

export interface AuthCompletePayload {
  type: 'auth_complete';
  accessToken: string;
  refreshToken: string;
  userId: string;
  phone: string;
  username: string;
}

export interface OnboardingCompletePayload {
  type: 'onboarding_complete';
  accessToken: string;
  refreshToken: string;
  userId: string;
  phone: string;
  username: string;
}

export interface PartnerAuthCompletePayload {
  type: 'partner_auth_complete';
  accessToken: string;
  refreshToken: string;
}

export interface GuestModePayload {
  type: 'guest_mode';
}

/**
 * Sent before navigating to Telegram OIDC so Flutter can store PKCE params AND
 * open the auth URL in an EXTERNAL browser (so the native Telegram app opens
 * instead of loading oauth.telegram.org inside the WebView). Flutter then
 * intercepts the com.svaypai.app:// deep-link callback and exchanges the code.
 */
export interface TelegramAuthStartPayload {
  type: 'telegram_auth_start';
  url: string;
  codeVerifier: string;
  state: string;
  nonce: string;
  redirectUri: string;
  /** Phone the user typed — fallback for the backend if Telegram omits it. */
  phone?: string;
}

/**
 * Sent when the user taps "Continue with Google". Flutter runs the native
 * Google Sign-In SDK, exchanges the id_token for app tokens, and completes the
 * flow itself — the web page just hands off the entered phone as a fallback.
 */
export interface GoogleAuthStartPayload {
  type: 'google_auth_start';
  /** Phone the user typed — fallback for the backend. */
  phone?: string;
}

/**
 * Sent when the user taps "Continue with Apple". Flutter runs Sign in with
 * Apple natively and completes the flow itself.
 */
export interface AppleAuthStartPayload {
  type: 'apple_auth_start';
  /** Phone the user typed — fallback for the backend. */
  phone?: string;
}

/**
 * Sent whenever the user changes the language inside the web view, so the
 * native app updates its own locale and stays in sync. `code` is one of the
 * supported locales ('uz' | 'ru' | 'en').
 */
export interface SetLanguagePayload {
  type: 'set_language';
  code: string;
}

/**
 * Sent whenever the user toggles the theme inside the web view, so the native
 * app updates its own ThemeMode and both surfaces stay on the same theme.
 */
export interface SetThemePayload {
  type: 'set_theme';
  theme: 'light' | 'dark';
}

/**
 * Sent when the user taps "Save Look" inside the WebView. Browser downloads
 * (`<a download>`) don't work in a WebView, so the web page hands the rendered
 * image to the native app, which writes it to the device photo gallery.
 */
export interface SaveImagePayload {
  type: 'save_image';
  /** Base64-encoded image bytes (no `data:` URI prefix). */
  base64: string;
  /** Suggested file name, e.g. `libas-tryon-1700000000000.jpg`. */
  filename: string;
  /** MIME type of the bytes, e.g. `image/jpeg`. */
  mimeType: string;
}

export type BridgePayload =
  | AuthCompletePayload
  | OnboardingCompletePayload
  | PartnerAuthCompletePayload
  | GuestModePayload
  | TelegramAuthStartPayload
  | GoogleAuthStartPayload
  | AppleAuthStartPayload
  | SetLanguagePayload
  | SetThemePayload
  | SaveImagePayload;

type FlutterBridgeChannel = {
  postMessage: (message: string) => void;
};

function getChannel(): FlutterBridgeChannel | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { FlutterBridge?: FlutterBridgeChannel }).FlutterBridge ?? null
  );
}

/** Returns true when running inside the Flutter WebView (iOS or Android). */
export function isInFlutterWebView(): boolean {
  if (typeof window === 'undefined') return false;
  // 1. Android: the app injects a `window.FlutterBridge` JS-channel object.
  if (getChannel() !== null) return true;
  // 2. iOS (WKWebView): JS channels are registered under
  //    `window.webkit.messageHandlers`, not as a plain window property.
  const webkit = (window as unknown as {
    webkit?: { messageHandlers?: Record<string, unknown> };
  }).webkit;
  if (webkit?.messageHandlers?.FlutterBridge) return true;
  // 3. Some setups expose the flutter_inappwebview global.
  if ((window as unknown as { flutter_inappwebview?: unknown }).flutter_inappwebview) return true;
  // 4. User-Agent marker (Android default WebView / custom UAs).
  if (typeof navigator !== 'undefined' && /flutter/i.test(navigator.userAgent)) return true;
  // 5. The app injects `?platform=ios|android` on entry and we persist it to
  //    localStorage; a standalone browser never sets this key. This is the
  //    reliable signal on iOS, where the WKWebView UA mimics mobile Safari.
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('platform');
    if (fromUrl === 'ios' || fromUrl === 'android') return true;
    if (localStorage.getItem(PLATFORM_STORAGE_KEY)) return true;
  } catch {
    /* ignore storage failures */
  }
  return false;
}

/** Send a typed message to the Flutter host. Safe to call in any environment. */
export function sendToFlutter(payload: BridgePayload): void {
  const channel = getChannel();
  if (!channel) return;
  channel.postMessage(JSON.stringify(payload));
}

/**
 * Hand an image blob to the native app to save into the device photo gallery.
 * Returns true when running inside the Flutter WebView (and the message was
 * sent), false otherwise — callers should fall back to a browser download.
 */
export async function saveImageToGallery(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  // Requires a real messaging channel to post the image to — fall back to a
  // browser download if there isn't one (e.g. iOS, where the channel isn't a
  // plain window property even though isInFlutterWebView() is true).
  if (getChannel() === null) return false;
  const base64 = await blobToBase64(blob);
  sendToFlutter({
    type: 'save_image',
    base64,
    filename,
    mimeType: blob.type || 'image/jpeg',
  });
  return true;
}

/** Read a Blob as a bare base64 string (strips the `data:...;base64,` prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('blob read failed'));
    reader.readAsDataURL(blob);
  });
}

export type HostPlatform = 'ios' | 'android';

const PLATFORM_STORAGE_KEY = 'svayp_platform';

/**
 * Resolve the host platform so the auth pages can show the right social button
 * (iOS → Apple, Android → Google), mirroring the native app.
 *
 * The Flutter WebView injects `?platform=ios|android` on the first page load.
 * Because that param is lost when the page navigates (phone → verify-method),
 * we persist it to localStorage on first read. Falls back to iOS detection via
 * the User-Agent for standalone browsers, defaulting to Google.
 */
export function getHostPlatform(): HostPlatform {
  if (typeof window === 'undefined') return 'android';

  const fromUrl = new URLSearchParams(window.location.search).get('platform');
  if (fromUrl === 'ios' || fromUrl === 'android') {
    try {
      localStorage.setItem(PLATFORM_STORAGE_KEY, fromUrl);
    } catch {
      /* ignore storage failures */
    }
    return fromUrl;
  }

  try {
    const saved = localStorage.getItem(PLATFORM_STORAGE_KEY);
    if (saved === 'ios' || saved === 'android') return saved;
  } catch {
    /* ignore storage failures */
  }

  // Standalone browser fallback — best-effort iOS detection.
  if (typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
    return 'ios';
  }
  return 'android';
}
