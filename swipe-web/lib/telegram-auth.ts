/**
 * Telegram OIDC – Authorization Code + PKCE (S256) helpers
 *
 * Flow:
 *   1. buildTelegramAuthUrl()  → generate PKCE params, save to sessionStorage, return auth URL
 *   2. navigate to auth URL   → Telegram consent screen
 *   3. Telegram redirects to  → /auth/telegram/callback?code=...&state=...
 *   4. loadSession()          → retrieve stored params to validate state + send to backend
 *   5. clearSession()         → clean up after use
 */

export const TELEGRAM_CLIENT_ID = '8713945846';

/**
 * The redirect URI MUST be registered in BotFather under the bot's
 * "Allowed callback URLs" / OIDC settings.
 *
 * When running inside the Flutter WebView we use the app's native deep-link
 * scheme so Flutter can intercept the redirect.
 * When running in a regular browser we use NEXT_PUBLIC_TELEGRAM_REDIRECT_URI
 * (or fall back to the current origin).
 */
function getRedirectUri(): string {
  // Inside Flutter WebView — use the native scheme
  if (typeof window !== 'undefined' &&
    (window as unknown as { FlutterBridge?: unknown }).FlutterBridge) {
    return 'com.svaypai.app://auth/telegram/callback';
  }
  // Browser — use env var or current origin
  const envUri = process.env.NEXT_PUBLIC_TELEGRAM_REDIRECT_URI;
  if (envUri) return envUri;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/telegram/callback`;
  }
  return '';
}

const STORAGE_KEY = 'svayp_tg_pkce';

export interface TelegramPkceSession {
  codeVerifier: string;
  state: string;
  nonce: string;
  redirectUri: string;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateRandomBytes(length: number): ArrayBuffer {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf.buffer;
}

function generateCodeVerifier(): string {
  // 32 bytes → 43-char base64url (well within 43–128 char PKCE spec)
  return base64urlEncode(generateRandomBytes(32));
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(digest);
}

function generateRandom16(): string {
  return base64urlEncode(generateRandomBytes(16));
}

// ── Session storage ───────────────────────────────────────────────────────────

export function saveSession(session: TelegramPkceSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): TelegramPkceSession | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TelegramPkceSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

// ── Build auth URL ────────────────────────────────────────────────────────────

/**
 * Generates PKCE params, stores them in sessionStorage, and returns the
 * Telegram authorization URL to navigate to.
 *
 * The redirectUri is derived from window.location.origin so it works on
 * both localhost (dev) and https://web.svaypai.com (prod).
 */
export async function buildTelegramAuthUrl(): Promise<{ url: string; session: TelegramPkceSession }> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandom16();
  const nonce = generateRandom16();
  const redirectUri = getRedirectUri();

  const session: TelegramPkceSession = { codeVerifier, state, nonce, redirectUri };
  saveSession(session);

  const params = new URLSearchParams({
    client_id: TELEGRAM_CLIENT_ID,
    scope: 'openid phone profile',
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  return {
    url: `https://oauth.telegram.org/auth?${params.toString()}`,
    session,
  };
}
