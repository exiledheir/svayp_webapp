// Paywall-воронка монетизации (purchase_funnel_events на бэке).
// Питает блок «Монетизация» в админ-дашборде: PAYWALL_SHOWN → UPGRADE_CLICKED →
// TELEGRAM_OPENED. До этого endpoint /me/subscription/funnel не вызывался ВООБЩЕ —
// paywall-воронка в админке всегда была пустой.
//
// Словарь типов зафиксирован на бэке (MySubscriptionController.FUNNEL_EVENT_TYPES);
// неизвестный тип → 400, поэтому используем только эти константы.

export type PurchaseFunnelEventType =
  | 'PAYWALL_SHOWN'
  | 'PAYWALL_DISMISSED'
  | 'UPGRADE_CLICKED'
  | 'TELEGRAM_OPENED'
  | 'LIMIT_HIT_LOOKS'
  | 'LIMIT_HIT_ITEMS'
  | 'LIMIT_HIT_TRYON'
  /** Выбор тарифа в шторке подписки — шаг между показом пейволла и переходом к оплате. */
  | 'PLAN_SELECTED';

/** Fire-and-forget: аналитика не должна мешать UI и не роняет ошибки в caller. */
export function reportPurchaseFunnel(eventType: PurchaseFunnelEventType, surface?: string): void {
  if (typeof window === 'undefined') return;
  let token: string | null = null;
  try {
    token = localStorage.getItem('auth_token');
  } catch { /* ignore */ }
  if (!token) return; // endpoint требует авторизацию — аноним просто не учитывается

  const params = new URLSearchParams({ eventType });
  if (surface) params.set('surface', surface.slice(0, 40));
  fetch(`/proxy/me/subscription/funnel?${params.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true,
  }).catch(() => { /* ignore */ });
}
