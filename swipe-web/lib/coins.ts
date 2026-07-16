// ── Diamonds / coins (in-app currency) ───────────────────────────────────────
// Backend монетная система реализована (uz.svayp.svayp.coins). Баланс и цены
// приходят с сервера — это источник правды. Списание/возврат/402 — серверно
// при вызове платных action-ручек (try-on / ai-suggest / beautify). Константы
// ниже остаются только как офлайн-фолбэк для UI (сеть недоступна / SSR).

import { api } from '@/lib/api';

// Локальный фолбэк курса/пакетов (сервер присылает актуальные в /app/coins/pricing).
export const COIN_UNIT_UZS = 240;
export const COIN_UNIT_DISCOUNTED_UZS = 168;
export const COIN_DISCOUNT_THRESHOLD = 200;
export const COIN_DISCOUNT_PCT = 30;
export const COIN_PACKAGES = [100, 200, 500];
export const STARTER_BONUS = 15; // выровнено с бэком (coins.starter_bonus); реальное значение — из pricing.starterBonusCoins

/** Фолбэк-стоимость действий в монетах (реальные — из pricing.actions). Upload бесплатен. */
export const ACTION_COST = { createOutfit: 1, beautify: 2, tryOn: 5 } as const;

// ── Server DTOs ───────────────────────────────────────────────────────────────

export interface CoinBalance {
  balance: number;
  nonExpiring: number;
  expiringTotal: number;
  nextExpiry?: { amount: number; expiresAt: string } | null;
}

export interface CoinPricing {
  currency: string;
  coinUnitPriceUzs: number;
  starterBonusCoins: number;
  freeCoinTtlDays: number;
  /** Ключи: outfitCreate / photoEnhance / tryOn. */
  actions: Record<string, number>;
  packages: { coins: number; priceUzs: number; discountPercent: number }[];
  manualTiers: { minCoins: number; pricePerCoinUzs: number; discountPercent: number }[];
  /** Включено ли реальное списание монет. Если false — платные действия идут по
   *  старым квотам подписки (не гейтить их по балансу монет на клиенте). */
  enforcementEnabled?: boolean;
}

export interface CoinQuote {
  coins: number;
  totalUzs: number;
  pricePerCoinUzs: number;
  discountPercent: number;
}

function unwrap<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d.data ?? d) as T;
}

/** Текущий баланс монет пользователя. */
export async function fetchCoinBalance(): Promise<CoinBalance> {
  const res = await api.get('/me/coins');
  return unwrap<CoinBalance>(res);
}

/** Прайс-лист действий, пакеты, курс (публичный). */
export async function fetchCoinPricing(): Promise<CoinPricing> {
  const res = await api.get('/app/coins/pricing');
  return unwrap<CoinPricing>(res);
}

/** Серверный пересчёт суммы/скидки за количество монет (источник правды для оплаты). */
export async function quoteCoins(coins: number): Promise<CoinQuote> {
  const res = await api.post('/app/coins/quote', { coins });
  return unwrap<CoinQuote>(res);
}

/**
 * Локальный расчёт цены. Если передан `pricing` с сервера — считает по его
 * manualTiers (совпадает с серверным quote), иначе фолбэк на константы (порог 200+).
 * Для мгновенного отображения до ответа серверного quote.
 */
export function coinsPrice(qty: number, pricing?: CoinPricing | null): { total: number; original: number; perUnit: number; discountPct: number } {
  const q = Math.max(0, Math.floor(qty || 0));
  if (pricing && pricing.manualTiers?.length) {
    const tiers = [...pricing.manualTiers].sort((a, b) => a.minCoins - b.minCoins);
    let applicable = tiers[0];
    for (const tier of tiers) if (q >= tier.minCoins) applicable = tier;
    const base = tiers[0]?.pricePerCoinUzs ?? pricing.coinUnitPriceUzs;
    return {
      total: q * applicable.pricePerCoinUzs,
      original: q * base,
      perUnit: applicable.pricePerCoinUzs,
      discountPct: applicable.discountPercent,
    };
  }
  const discounted = q >= COIN_DISCOUNT_THRESHOLD;
  const perUnit = discounted ? COIN_UNIT_DISCOUNTED_UZS : COIN_UNIT_UZS;
  return { total: q * perUnit, original: q * COIN_UNIT_UZS, perUnit, discountPct: discounted ? COIN_DISCOUNT_PCT : 0 };
}

/** Пакеты для UI: с сервера, иначе константы. */
export function coinPackages(pricing?: CoinPricing | null): number[] {
  return pricing?.packages?.length ? pricing.packages.map((p) => p.coins) : COIN_PACKAGES;
}

/** Стоимость действий для UI: с сервера, иначе константы. */
export function actionCosts(pricing?: CoinPricing | null): { createOutfit: number; beautify: number; tryOn: number } {
  const a = pricing?.actions;
  return {
    createOutfit: a?.outfitCreate ?? ACTION_COST.createOutfit,
    beautify: a?.photoEnhance ?? ACTION_COST.beautify,
    tryOn: a?.tryOn ?? ACTION_COST.tryOn,
  };
}
