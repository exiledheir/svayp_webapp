// ── AI-стилист «Nur» ─────────────────────────────────────────────────────────
// Доступ к фиче решает сервер: пара флагов feature.stylist.* плюс вайтлист беты
// (uz.svayp.svayp.stylist.StylistAccessService). На клиенте НЕТ списка телефонов —
// иначе состав беты уехал бы в бандл и менялся только редеплоем.

import { api } from '@/lib/api';

export type StylistAction =
  | 'TEXT'
  | 'RATING'
  | 'OUTFIT'
  | 'VARIATION'
  | 'SHOPPING_LIST'
  | 'WARDROBE_AUDIT'
  | 'STYLE_REPORT';

export type ChargedSource = 'FREE_DAILY' | 'SUBSCRIPTION_QUOTA' | 'COINS' | 'NONE';

export interface StylistAccess {
  /** Показывать ли кнопку и пускать ли в чат. */
  available: boolean;
  /** Пользователь попал по вайтлисту закрытой беты — рисуем плашку «бета». */
  beta: boolean;
}

export interface StylistMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  action: StylistAction | null;
  content: string;
  /** Карточки образов, если это был ответ-сборка. Приходят и из истории. */
  outfits?: StylistOutfitCard[];
  /** Подписанные URL присланных фото — чтобы снимок остался в переписке после перезахода. */
  attachments?: string[];
  coinsSpent: number;
  createdAt: string;
}

export type SlotRole = 'TOP' | 'BOTTOM' | 'SHOES' | 'OUTER' | 'ACCESSORY' | 'HEADSCARF';

/** Подписи ролей — порядок задаёт бэкенд, здесь только человеческие названия. */
export const SLOT_LABELS: Record<SlotRole, string> = {
  TOP: 'Верх',
  BOTTOM: 'Низ',
  OUTER: 'Верхний слой',
  SHOES: 'Обувь',
  HEADSCARF: 'Платок',
  ACCESSORY: 'Аксессуары',
};

export interface OutfitSlot {
  role: SlotRole;
  description: string;
  /**
   * WARDROBE — вещь нашлась у пользователя, CATALOG — предлагаем подобрать,
   * ATTACHED — это вещь с присланного фото: предлагать купить её было бы ошибкой.
   */
  source: 'WARDROBE' | 'CATALOG' | 'ATTACHED';
  wardrobeItemId: string | null;
  imageUrl: string | null;
  /** Примеры «как носят» под этот слот. Раскрываются по тапу на «подобрать». */
  references?: InspirationImage[];
}

/**
 * Референс «как носят» из открытых источников.
 *
 * Атрибуция обязательна по лицензии Creative Commons: автор, лицензия и ссылка на оригинал
 * должны быть видны рядом с картинкой. Бэкенд не отдаёт записи, по которым её не собрать.
 */
export interface InspirationImage {
  thumbnailUrl: string;
  sourceUrl: string;
  creator: string | null;
  license: string;
  licenseUrl: string | null;
  provider: string | null;
}

export interface StylistOutfitCard {
  title: string;
  slots: OutfitSlot[];
  why: string | null;
}

export interface StylistAnswer {
  threadId: string;
  messageId: string;
  /** Текст ответа. Пусто, когда собрались карточки — тогда показываем их. */
  answer: string | null;
  outfits: StylistOutfitCard[];
  followups: string[];
  coinsSpent: number;
  chargedSource: ChargedSource;
}

/**
 * Сохранить образ в гардероб. Возвращает id доски — образ становится обычным и дальше
 * живёт в гардеробе, включая примерку.
 */
export async function saveStylistOutfit(
  messageId: string,
  outfitIndex: number,
  name?: string,
): Promise<string> {
  const res = await api.post(`/stylist/messages/${messageId}/save-outfit`, { outfitIndex, name });
  return unwrap<string>(res);
}

function unwrap<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d.data ?? d) as T;
}

/**
 * Доступен ли стилист. Вызывается при открытии гардероба, поэтому ошибка не должна
 * ломать экран: любой сбой трактуем как «фичи нет» — лучше не показать кнопку,
 * чем показать её тому, кто упрётся в 403.
 */
export async function fetchStylistAccess(): Promise<StylistAccess> {
  try {
    const res = await api.get('/stylist/access');
    return unwrap<StylistAccess>(res);
  } catch {
    return { available: false, beta: false };
  }
}

export interface StylistThread {
  id: string;
  /** Первая реплика пользователя — по ней разговор и узнаётся в списке. */
  title: string | null;
  preview: string | null;
  messages: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export async function fetchStylistThreads(): Promise<StylistThread[]> {
  const res = await api.get('/stylist/threads');
  return unwrap<StylistThread[]>(res) ?? [];
}

/** Новый разговор. Старые не удаляются — к прежней теме можно вернуться. */
export async function startStylistThread(): Promise<string> {
  const res = await api.post('/stylist/threads');
  return unwrap<string>(res);
}

export async function deleteStylistThread(threadId: string): Promise<void> {
  await api.delete(`/stylist/threads/${threadId}`);
}

/** Стирает переписку. Стилевой профиль остаётся — он правится на своём экране. */
export async function clearStylistHistory(): Promise<void> {
  await api.delete('/stylist/threads');
}

/** Активный разговор пользователя; создаётся сервером при первом обращении. */
export async function fetchStylistThread(): Promise<string> {
  const res = await api.get('/stylist/thread');
  return unwrap<string>(res);
}

export async function fetchStylistHistory(threadId: string): Promise<StylistMessage[]> {
  const res = await api.get(`/stylist/threads/${threadId}/messages`);
  return unwrap<StylistMessage[]>(res) ?? [];
}

/** Причины 👎. Закрытый список — совпадает с бэкендом, свободный текст не собираем. */
export const FEEDBACK_REASONS = [
  { code: 'OFF_TOPIC', label: 'Не по теме' },
  { code: 'TOO_GENERIC', label: 'Слишком общо' },
  { code: 'NOT_FOR_ME', label: 'Не подходит мне' },
  { code: 'UGLY_OUTFIT', label: 'Некрасивый образ' },
  { code: 'BAD_PHOTO_READ', label: 'Не понял фото' },
] as const;

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number]['code'];

export interface FeedbackResult {
  /** Вернулись ли монеты — за «не по теме» возврат автоматический, первые 3 раза в месяц. */
  refunded: boolean;
  coins: number;
}

export async function rateStylistAnswer(
  messageId: string,
  positive: boolean,
  reason?: FeedbackReason,
): Promise<FeedbackResult> {
  const res = await api.post(`/stylist/messages/${messageId}/feedback`, { positive, reason });
  return unwrap<FeedbackResult>(res);
}

/**
 * Отправить сообщение.
 *
 * Картинки адресуются КЛЮЧАМИ блоба и id вещей гардероба, а не готовыми URL: сервер
 * не должен ходить по адресу, который выбрал клиент, и сам проверяет владельца вещи.
 */
export async function sendStylistMessage(payload: {
  action?: StylistAction;
  /** Может отсутствовать: фото без подписи — рабочий запрос, сценарий бэкенд ставит сам. */
  text?: string;
  imageKeys?: string[];
  wardrobeItemIds?: string[];
  chosenStyle?: string;
  threadId?: string;
  /** Язык ответа Nur. Берётся из текущей локали приложения. */
  locale?: string;
}): Promise<StylistAnswer> {
  const res = await api.post('/stylist/messages', payload);
  return unwrap<StylistAnswer>(res);
}

// ── Стилевой профиль ─────────────────────────────────────────────────────────

/** Откуда взялось значение. Метка источника — смысл экрана, а не украшение. */
export type ProfileSource = 'PHOTO_INFERRED' | 'USER_ANSWERED' | 'DERIVED_FROM_SWIPES' | 'MANUAL_EDIT';

export const SOURCE_LABELS: Record<ProfileSource, string> = {
  PHOTO_INFERRED: 'определено по фото',
  USER_ANSWERED: 'ты сказала',
  DERIVED_FROM_SWIPES: 'из твоих свайпов',
  MANUAL_EDIT: 'исправлено вручную',
};

export interface ProfileField {
  key: string;
  label: string;
  value: string | null;
  source: ProfileSource | null;
  confidence: number | null;
  updatedAt: string | null;
  editable: boolean;
}

export interface StyleProfile {
  fields: ProfileField[];
  completeness: number;
  nextHint: string;
}

export async function fetchStyleProfile(): Promise<StyleProfile> {
  const res = await api.get('/stylist/profile');
  return unwrap<StyleProfile>(res);
}

/** Пустое значение стирает поле — после этого Nur снова сможет вывести его из фото. */
export async function editStyleProfileField(field: string, value: string): Promise<StyleProfile> {
  const res = await api.put(`/stylist/profile/${field}`, { value });
  return unwrap<StyleProfile>(res);
}
