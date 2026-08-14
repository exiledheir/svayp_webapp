// ── Промокоды блогеров ───────────────────────────────────────────────────────
// Код закрепляется за аккаунтом навсегда (для статистики блогера), а право на скидку
// сгорает после первой покупки или по сроку. Поэтому состояние читается двумя полями:
// `code` — что привязано, `discountActive` — можно ли ещё получить скидку.
//
// Цена со скидкой НЕ считается на клиенте: минимум платежа, округление и проверка срока
// живут на сервере, и локальный расчёт разошёлся бы с суммой, которую выставит оплата.

import { api } from '@/lib/api';
import { getAnonId } from '@/lib/app-events';

/**
 * Достаёт payload из конверта ApiResponse.
 *
 * Тонкость: на сервере у ApiResponse стоит @JsonInclude(NON_NULL), поэтому пустой ответ
 * приезжает как `{}` — БЕЗ ключа `data`. Наивная проверка `'data' in body` его не ловит и
 * возвращает сам конверт: объект-пустышка выглядит «истинным», и UI решает, что промокод есть.
 * Отсюда была плашка «Ваш промокод: undefined» вместо поля ввода. Пустой объект = null.
 */
function unwrap<T>(res: { data: unknown }): T {
  const body = res.data;
  if (!body || typeof body !== 'object') return body as T;
  if ('data' in body) return ((body as { data: T }).data ?? null) as T;
  // Конверт без payload (`{}` или только `message`) — данных нет.
  if (Object.keys(body).every((k) => k === 'message')) return null as T;
  return body as T;
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

/**
 * Почему в котировке нет скидки.
 * Без этого поля «кода нет» и «код есть, но не действует на такое количество» приезжали
 * неотличимо, и витрина молча показывала полную цену — человек не понимал, что произошло.
 */
export type PromoQuoteReason = 'APPLIED' | 'NO_PROMO' | 'OUT_OF_RANGE';

export interface PromoQuote {
  promoCodeId: string | null;
  code: string | null;
  percent: number;
  listUzs: number;
  discountUzs: number;
  finalUzs: number;
  raisedToMinimum: boolean;
  reason: PromoQuoteReason;
  /** Границы кода — приходят при OUT_OF_RANGE, чтобы написать «действует от 100 до 200». */
  minCoins: number | null;
  maxCoins: number | null;
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

/**
 * Промокод пользователя или null, если не активирован.
 *
 * Проверка на `code` — страховка от любого «почти пустого» ответа: экран покупки решает по
 * этому значению, показывать поле ввода или плашку привязки, и объект без кода превращает
 * рабочий экран в тупик, где промокод ввести уже нельзя.
 */
export async function fetchMyPromo(): Promise<MyPromo | null> {
  const res = await api.get('/promo/me');
  const promo = unwrap<MyPromo | null>(res);
  return promo && typeof promo.code === 'string' && promo.code.length > 0 ? promo : null;
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
