import type { Locale } from '@/lib/translations';

/** Two-letter initials for an avatar fallback. */
export function getInitials(name?: string | null): string {
  const s = (name ?? '').trim();
  if (!s) return '?';
  const parts = s.replace(/[@_.]+/g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return s.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const REL_UNITS: { ru: string; uz: string; en: string; limit: number; div: number }[] = [
  { limit: 60, div: 1, ru: 'с', uz: 's', en: 's' },
  { limit: 3600, div: 60, ru: 'м', uz: 'd', en: 'm' },
  { limit: 86400, div: 3600, ru: 'ч', uz: 's', en: 'h' },
  { limit: 604800, div: 86400, ru: 'д', uz: 'k', en: 'd' },
  { limit: 2629800, div: 604800, ru: 'нед', uz: 'h', en: 'w' },
];

/** Compact relative time, e.g. "3ч", "2d", "5m". Falls back to a date for old posts. */
export function timeAgo(iso: string, locale: Locale = 'ru'): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 5) {
    return locale === 'en' ? 'now' : locale === 'uz' ? 'hozir' : 'сейчас';
  }
  for (const u of REL_UNITS) {
    if (sec < u.limit) {
      const n = Math.max(1, Math.floor(sec / u.div));
      return `${n}${u[locale] ?? u.en}`;
    }
  }
  return new Date(iso).toLocaleDateString(
    locale === 'ru' ? 'ru-RU' : locale === 'uz' ? 'uz-UZ' : 'en-US',
    { day: 'numeric', month: 'short' },
  );
}

/** Compact like count, e.g. 1200 → "1.2k". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
}
