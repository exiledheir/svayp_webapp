// ── Diamonds (in-app currency) ───────────────────────────────────────────────
// Per the coins BRD: 1 diamond = 240 UZS ($0.02). Buying 200+ at once gets −30%
// (168 UZS each). These would come from remote config once payments ship; kept
// as constants for the interim manual (Telegram) top-up flow. There's no coins
// backend yet, so the balance is a local placeholder seeded with the 15-diamond
// starter bonus — real balance/spend/refund is a backend follow-up.

export const COIN_UNIT_UZS = 240;
export const COIN_UNIT_DISCOUNTED_UZS = 168;
export const COIN_DISCOUNT_THRESHOLD = 200;
export const COIN_DISCOUNT_PCT = 30;
export const COIN_PACKAGES = [100, 200, 500];
export const STARTER_BONUS = 20;

/** What each action costs, in diamonds. Upload is free. */
export const ACTION_COST = { createOutfit: 1, beautify: 2, tryOn: 5 } as const;

const KEY = 'svayp_coins';

export function getCoins(): number {
  if (typeof window === 'undefined') return STARTER_BONUS;
  try {
    const v = localStorage.getItem(KEY);
    if (v == null) { localStorage.setItem(KEY, String(STARTER_BONUS)); return STARTER_BONUS; }
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : STARTER_BONUS;
  } catch { return STARTER_BONUS; }
}

export function setCoins(n: number): void {
  try { localStorage.setItem(KEY, String(Math.max(0, Math.round(n)))); } catch { /* private mode */ }
}

/** Price breakdown for a quantity of diamonds (applies the 200+ discount). */
export function coinsPrice(qty: number): { total: number; original: number; perUnit: number; discountPct: number } {
  const q = Math.max(0, Math.floor(qty || 0));
  const discounted = q >= COIN_DISCOUNT_THRESHOLD;
  const perUnit = discounted ? COIN_UNIT_DISCOUNTED_UZS : COIN_UNIT_UZS;
  return { total: q * perUnit, original: q * COIN_UNIT_UZS, perUnit, discountPct: discounted ? COIN_DISCOUNT_PCT : 0 };
}
