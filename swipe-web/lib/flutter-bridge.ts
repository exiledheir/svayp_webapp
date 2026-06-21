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
  | 'apple_auth_start';

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

export type BridgePayload =
  | AuthCompletePayload
  | OnboardingCompletePayload
  | PartnerAuthCompletePayload
  | GuestModePayload
  | TelegramAuthStartPayload
  | GoogleAuthStartPayload
  | AppleAuthStartPayload;

type FlutterBridgeChannel = {
  postMessage: (message: string) => void;
};

function getChannel(): FlutterBridgeChannel | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { FlutterBridge?: FlutterBridgeChannel }).FlutterBridge ?? null
  );
}

/** Returns true when running inside the Flutter WebView. */
export function isInFlutterWebView(): boolean {
  if (getChannel() !== null) return true;
  // Fallback: Flutter embeds "flutter" in the User-Agent
  if (typeof navigator !== 'undefined' && /flutter/i.test(navigator.userAgent)) return true;
  return false;
}

/** Send a typed message to the Flutter host. Safe to call in any environment. */
export function sendToFlutter(payload: BridgePayload): void {
  const channel = getChannel();
  if (!channel) return;
  channel.postMessage(JSON.stringify(payload));
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
