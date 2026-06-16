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
  | 'telegram_auth_start';

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
}

export type BridgePayload =
  | AuthCompletePayload
  | OnboardingCompletePayload
  | PartnerAuthCompletePayload
  | GuestModePayload
  | TelegramAuthStartPayload;

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
