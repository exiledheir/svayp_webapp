/**
 * Ручные правки образа дня в «Календаре».
 *
 * Образ дня подбирается детерминированно на клиенте (см. pickItem в pages/closet):
 * та же дата + тот же гардероб = тот же образ, ничего не хранится. Как только человек
 * может поменять вещь сам, выбор надо где-то держать — иначе он исчезнет при
 * переключении дня.
 *
 * Держим в localStorage: у календаря НЕТ ручки на запись — `/outfits/calendar` только
 * GET (и тот пока не используется). Отсюда следствие, которое стоит помнить: правки
 * живут в одном браузере/WebView и не переезжают на другое устройство. Когда на бэке
 * появится сохранение образа дня, этот модуль — единственное место, которое придётся
 * переключить на сеть.
 */

/** Слоты образа дня — ровно те, что рисует карточка календаря. */
export type DaySlot = 'upper' | 'lower' | 'shoes' | 'shawl' | 'acc';

export const DAY_SLOTS: DaySlot[] = ['upper', 'lower', 'shoes', 'shawl', 'acc'];

/**
 * Правки одного дня.
 *
 * Три состояния слота, и все три разные:
 *  • ключа нет      — слот на автоподборе;
 *  • строка         — человек выбрал эту вещь;
 *  • null           — человек убрал вещь из образа (и автоподбор её не вернёт).
 */
export type DayPicks = Partial<Record<DaySlot, string | null>>;

/** Правки по дням: ключ — дата в локальном ISO-виде (`2026-09-09`). */
export type CalendarPicks = Record<string, DayPicks>;

const STORAGE_KEY = 'libas_calendar_picks';

/**
 * Ключ дня в ЛОКАЛЬНОЙ зоне: toISOString() отдаёт UTC и в Ташкенте (UTC+5)
 * сдвигал бы вечерние правки на вчерашний день.
 */
export function dayKey(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function isDayPicks(value: unknown): value is DayPicks {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([slot, id]) =>
      DAY_SLOTS.includes(slot as DaySlot) && (id === null || typeof id === 'string'),
  );
}

/**
 * Прочитать правки, выбросив всё, что старше `today`.
 *
 * Прошлые дни в календаре не показываются, а без чистки запись росла бы вечно.
 * Дата приходит параметром, чтобы чтение оставалось предсказуемым в тестах.
 */
export function loadCalendarPicks(today: Date = new Date()): CalendarPicks {
  if (typeof window === 'undefined') return {};
  let parsed: unknown;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    parsed = JSON.parse(raw);
  } catch {
    // Приватный режим или битый JSON — календарь просто вернётся к автоподбору.
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const cutoff = dayKey(today);
  const clean: CalendarPicks = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    // Ключи сравниваем строками: ISO-даты сортируются лексикографически.
    if (key < cutoff) continue;
    if (isDayPicks(value)) clean[key] = value;
  }
  return clean;
}

export function saveCalendarPicks(picks: CalendarPicks): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  } catch {
    /* приватный режим / переполнение — правки останутся только в памяти вкладки */
  }
}

/** Есть ли у дня хоть одна ручная правка (нужно для кнопки «вернуть подбор»). */
export function hasDayPicks(picks: CalendarPicks, key: string): boolean {
  const day = picks[key];
  return !!day && Object.keys(day).length > 0;
}
