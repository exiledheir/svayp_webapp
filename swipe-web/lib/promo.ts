// ── Промокоды блогеров ───────────────────────────────────────────────────────
// Код закрепляется за аккаунтом навсегда (для статистики блогера), а право на скидку
// сгорает после первой покупки или по сроку. Поэтому состояние читается двумя полями:
// `code` — что привязано, `discountActive` — можно ли ещё получить скидку.
//
// Цена со скидкой НЕ считается на клиенте: минимум платежа, округление и проверка срока
// живут на сервере, и локальный расчёт разошёлся бы с суммой, которую выставит оплата.

import { api } from '@/lib/api';
import { getAnonId } from '@/lib/app-events';

function unwrap<T>(res: { data: unknown }): T {
  const body = res.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object)
    ? (body as { data: T }).data
    : body) as T;
}

export type PromoType = 'BONUS_COINS' | 'DISCOUNT_PERCENT';

export interface MyPromo {
  code: string;
  ownerName: string;
  type: PromoType;
  value: number;
  activatedAt: string;
  /** Право на скидку ещё живо: рисуем плашку на экране покупки только при true. */
  discountActive: boolean;
  discountPercent: number | null;
  discountExpiresAt: string | null;
}

export interface PromoApplied {
  code: string;
  type: PromoType;
  value: number;
  balanceAfter: number;
}

export interface PromoQuote {
  promoCodeId: string | null;
  code: string | null;
  percent: number;
  listUzs: number;
  discountUzs: number;
  finalUzs: number;
  raisedToMinimum: boolean;
}

/** Коды ошибок сервера — ровно четыре, разбираются через apiErrorCode(). */
export type PromoErrorCode =
  | 'PROMO_NOT_FOUND'
  | 'PROMO_EXPIRED'
  | 'PROMO_LIMIT_REACHED'
  | 'PROMO_ALREADY_HAS';

/** Применить код. deviceId берётся из анонимного id аналитики — он уже стабилен. */
export async function applyPromo(code: string): Promise<PromoApplied> {
  const res = await api.post('/promo/apply', { code, deviceId: getAnonId() });
  return unwrap<PromoApplied>(res);
}

/** Промокод пользователя или null, если не активирован. */
export async function fetchMyPromo(): Promise<MyPromo | null> {
  const res = await api.get('/promo/me');
  return unwrap<MyPromo | null>(res);
}

/** Серверная цена пакета с учётом промокода. */
export async function fetchPromoQuote(coins: number): Promise<PromoQuote> {
  const res = await api.get('/promo/quote', { params: { coins } });
  return unwrap<PromoQuote>(res);
}

/** Нормализация ввода на клиенте — только для отображения; сервер нормализует сам. */
export function normalizePromoInput(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase().slice(0, 20);
}
