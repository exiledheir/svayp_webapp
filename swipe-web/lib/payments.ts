// ── Онлайн-оплата через WLCM (Payme / Click / Paylov / Uzum) ─────────────────
// Сумму считает СЕРВЕР: наружу уходит только количество монет либо id заказа.
// Пока идёт тестовый период, оплата доступна лишь пользователям из вайтлиста —
// для остальных `fetchPaymentOptions().onlineEnabled === false`, и экран покупки
// продолжает работать по-старому (через Telegram).

import { api } from '@/lib/api';
import { isInFlutterWebView, openExternal } from '@/lib/flutter-bridge';

export type PaymentProvider = 'PAYME' | 'CLICK' | 'PAYLOV' | 'UZUM';

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'FAILED'
  | 'EXPIRED'
  | 'AMOUNT_MISMATCH';

/** Статусы, после которых опрашивать сервер больше нет смысла. */
const TERMINAL: PaymentStatus[] = ['FULFILLED', 'CANCELLED', 'FAILED', 'EXPIRED', 'AMOUNT_MISMATCH'];

export interface PaymentOptions {
  onlineEnabled: boolean;
  providers: PaymentProvider[];
  fallback: 'TELEGRAM';
  telegramUrl: string;
}

export interface Payment {
  paymentId: string;
  externalId: string;
  purpose: 'COINS' | 'ORDER';
  status: PaymentStatus;
  provider: PaymentProvider;
  /** В СУМАХ (не в тийинах) — можно показывать как есть. */
  amountUzs: number;
  coins?: number | null;
  orderId?: string | null;
  checkoutUrl?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
  /** Актуальный баланс монет — приходит вместе со статусом, экономит второй запрос. */
  coinBalance?: number | null;
}

function unwrap<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d.data ?? d) as T;
}

/** Ключ, по которому страница возврата находит платёж, если провайдер потерял query-параметры. */
const PENDING_KEY = 'svayp_pending_payment';

export function rememberPendingPayment(paymentId: string) {
  try {
    localStorage.setItem(PENDING_KEY, paymentId);
  } catch {
    /* приватный режим — не критично, id есть в URL */
  }
}

export function readPendingPayment(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* no-op */
  }
}

/** Показывать ли онлайн-оплату этому пользователю (персонально, зависит от вайтлиста). */
export async function fetchPaymentOptions(): Promise<PaymentOptions> {
  const res = await api.get('/payments/options');
  return unwrap<PaymentOptions>(res);
}

/** Куда провайдер вернёт пользователя. Адрес обязан совпадать с аллоулистом на бэке. */
export function paymentReturnUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/pay/return`;
}

export async function createCoinPayment(coins: number, provider: PaymentProvider): Promise<Payment> {
  const res = await api.post('/payments/coins', { coins, provider, returnUrl: paymentReturnUrl() });
  return unwrap<Payment>(res);
}

/** `refresh` дополнительно просит сервер опросить шлюз (когда вебхук ещё не дошёл). */
export async function fetchPaymentStatus(paymentId: string, refresh = false): Promise<Payment> {
  const res = await api.get(`/payments/${paymentId}`, { params: refresh ? { refresh: true } : undefined });
  return unwrap<Payment>(res);
}

export function isTerminal(status: PaymentStatus): boolean {
  return TERMINAL.includes(status);
}

/**
 * Уводит пользователя на оплату.
 *
 * Внутри приложения ссылку открывает ОПЕРАЦИОННАЯ СИСТЕМА, а не WebView. Это принципиально:
 * WLCM отдаёт настоящие адреса провайдеров (`checkout.paycom.uz`, `my.click.uz`), а их
 * приложения регистрируют эти домены как App Links — но внутри WebView App Links не
 * срабатывают, поэтому переход в Payme/Click возможен только через натив. Если приложение
 * не установлено, система откроет ту же страницу в браузере, где есть оплата картой.
 *
 * Сами при этом уходим на экран ожидания: пользователь может завершить оплату в чужом
 * приложении и вернуться в наше, так и не открыв `return_url`. Страница возврата опрашивает
 * статус, поэтому результат он увидит в любом случае.
 *
 * В обычном браузере — обычная навигация верхнего уровня. `window.open('_blank')` здесь
 * не годится: в WKWebView на iOS это no-op, и нажатие «ничего не делает».
 */
export function goToCheckout(url: string) {
  if (isInFlutterWebView() && openExternal(url)) {
    window.location.href = '/pay/return';
    return;
  }
  window.location.href = url;
}

/**
 * Опрашивает статус платежа до терминального или до таймаута.
 * Возврат пользователя из приложения провайдера не гарантирован, а вебхук может
 * задержаться — поэтому именно поллинг, а не разовая проверка.
 */
export async function pollPaymentUntilTerminal(
  paymentId: string,
  opts: { intervalMs?: number; timeoutMs?: number; onTick?: (p: Payment) => void; signal?: AbortSignal } = {},
): Promise<Payment | null> {
  const intervalMs = opts.intervalMs ?? 2000;
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const started = Date.now();
  let attempt = 0;

  while (Date.now() - started < timeoutMs) {
    if (opts.signal?.aborted) return null;
    try {
      // Каждый третий заход просим сервер сходить в шлюз: чаще — лишняя нагрузка на WLCM.
      const payment = await fetchPaymentStatus(paymentId, attempt % 3 === 2);
      opts.onTick?.(payment);
      if (isTerminal(payment.status)) return payment;
    } catch {
      // Сетевая ошибка не должна прерывать ожидание — пробуем снова.
    }
    attempt += 1;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
