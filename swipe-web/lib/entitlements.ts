// ── Единое состояние прав пользователя ───────────────────────────────────────
// Одна ручка вместо связки /me/plan + /me/coins + /app/coins/pricing.
//
// Дело не только в трёх запросах: пока состояние собиралось по частям, гейты рисовались
// по наполовину приехавшим данным — баланс инициализировался нулём, и до ответа /me/coins
// кнопка примерки успевала заблокироваться «из-за нехватки алмазов», которых хватало.

import { api } from '@/lib/api';

export type PlanTier = 'FREE' | 'PRO' | 'PREMIUM';
export type SubscriptionSource = 'PURCHASE' | 'ADMIN_GRANT' | 'PROMO' | 'COMPENSATION';

/** null = безлимит / лимит не энфорсится. Ровно это значение применяет сервер. */
export interface EffectiveLimits {
  tier: PlanTier;
  wardrobeItems: number | null;
  outfitCanvases: number | null;
  tryOnMonthly: number | null;
  regenMonthly: number | null;
  dailyLooks: number | null;
  calendarDays: number;
  mlDailyOutfits: boolean;
}

export interface PlanTitles {
  ru: string | null;
  uz: string | null;
  en: string | null;
}

export interface SubscriptionPlanView {
  code: string;
  tier: PlanTier;
  durationDays: number;
  /** Цена без скидки — показываем зачёркнутой, когда есть промо. */
  priceUzs: number;
  /** Столько человек заплатит на самом деле: сервер уже учёл его промокод. */
  finalPriceUzs: number;
  discountPercent: number;
  promoCode: string | null;
  purchasable: boolean;
  badge: string | null;
  title: PlanTitles;
  subtitle: PlanTitles;
  limits: EffectiveLimits;
}

export interface EntitlementsFlags {
  premiumEnabled: boolean;
  paywallEnabled: boolean;
  plansPurchaseEnabled: boolean;
  coinsEnforcement: boolean;
  coinsPurchaseEnabled: boolean;
}

export interface Entitlements {
  tier: PlanTier;
  planName: string;
  planCode: string | null;
  source: SubscriptionSource;
  paid: boolean;
  startsAt: string | null;
  endsAt: string | null;
  daysLeft: number | null;
  autoRenew: boolean;
  limits: EffectiveLimits;
  usage: {
    wardrobeItems: number;
    tryOnMonthly: number;
    regenMonthly: number;
    dailyLooks: number;
  };
  periodStart: string;
  periodEnd: string;
  coins: {
    balance: number;
    nonExpiring: number;
    expiringTotal: number;
    nextExpiry: { amount: number; expiresAt: string } | null;
  };
  actionCosts: { uploadItem: number; outfitCreate: number; photoEnhance: number; tryOn: number };
  flags: EntitlementsFlags;
  plans: SubscriptionPlanView[];
}

function unwrap<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d.data ?? d) as T;
}

export async function fetchEntitlements(): Promise<Entitlements> {
  const res = await api.get('/me/entitlements');
  return unwrap<Entitlements>(res);
}

/** Название тарифа на языке интерфейса. Фолбэк — код плана: пустая карточка хуже кода. */
export function planTitle(plan: SubscriptionPlanView, lang: string): string {
  const byLang: Record<string, string | null> = {
    ru: plan.title.ru,
    uz: plan.title.uz,
    en: plan.title.en,
  };
  return byLang[lang] || plan.title.ru || plan.title.en || plan.code;
}

export function planSubtitle(plan: SubscriptionPlanView, lang: string): string | null {
  const byLang: Record<string, string | null> = {
    ru: plan.subtitle.ru,
    uz: plan.subtitle.uz,
    en: plan.subtitle.en,
  };
  return byLang[lang] || plan.subtitle.ru || plan.subtitle.en || null;
}
