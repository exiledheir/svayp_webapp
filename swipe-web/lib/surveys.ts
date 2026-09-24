// ── Опросы (surveys) ────────────────────────────────────────────────────────
// Клиентский API модуля «Опросы»: приглашение по номеру визита, пошаговый флоу,
// награда алмазами через леджер монет. Контракт — `/api/v1/surveys`, обёртка
// ApiResponse `{ data, message }`, camelCase. Поля со значением null могут
// отсутствовать в JSON (`@JsonInclude(NON_NULL)`) — в первую очередь `progress`.
//
// Функции тонкие, без try/catch: ошибки решает вызывающий (хук автопоказа
// глотает всё молча, флоу показывает «Повторить»).

import { api } from '@/lib/api';
import { getSessionId } from '@/lib/app-events';

export type SurveyQuestionType = 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT' | 'RATING';
export type SurveyImpressionTrigger = 'AUTO' | 'LIST';
export type SurveyLocale = 'ru' | 'uz' | 'en';
export type SurveyPlatform = 'ios' | 'android' | 'web';

export type AnswerValue =
  | { optionId: string }
  | { optionIds: string[] }
  | { text: string }
  | { rating: number };

export interface QuestionSettings {
  minSelections?: number | null;
  maxSelections?: number | null;
  maxLength?: number | null;
  ratingMax?: number | null;
}

/** Карточка в списке доступных опросов (`GET /surveys/available`). */
export interface SurveyCard {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  rewardCoins: number;
  /** Оценка длительности, 12 с на вопрос. */
  estimatedSeconds: number;
  /** У пользователя есть незавершённое прохождение. */
  resume: boolean;
  /** Можно показать приглашение автоматически (недельный лимит и правило повтора соблюдены). */
  autoPrompt: boolean;
}

export interface AvailableSurveys {
  /** Номер дня с заходом. */
  visitNo: number;
  /** Номер захода (сессии приложения). */
  sessionNo: number;
  promptDelaySeconds: number;
  surveys: SurveyCard[];
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  text: string;
  hint: string | null;
  options: { id: string; text: string }[] | null;
  settings: QuestionSettings | null;
  required: boolean;
}

export interface SurveyProgress {
  responseId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  answers: Record<string, AnswerValue>;
  skipped: string[];
}

export interface SurveyDetail {
  id: string;
  title: string;
  description: string | null;
  rewardCoins: number;
  questions: SurveyQuestion[];
  /** Отсутствует, пока пользователь не начал опрос. */
  progress?: SurveyProgress | null;
}

export interface AnswerResult {
  questionId: string;
  answered: number;
  total: number;
}

export interface CompleteResult {
  responseId: string;
  /** Повторный complete: награда не начисляется второй раз. */
  alreadyCompleted: boolean;
  rewardCoins: number;
  newBalance: number;
  coinsExpireAt: string | null;
  freeCoinTtlDays: number;
}

function unwrap<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d.data ?? d) as T;
}

/**
 * Доступные пользователю опросы. Вызов фиксирует на сервере и день, и заход: id сессии — та же
 * сессия аналитики (новая после 30 минут простоя), по ней считаются опросы «на N-й заход».
 */
export async function fetchAvailableSurveys(lang: string): Promise<AvailableSurveys> {
  const res = await api.get('/surveys/available', { params: { lang, sessionId: getSessionId() } });
  const data = unwrap<Partial<AvailableSurveys>>(res);
  return {
    visitNo: data.visitNo ?? 1,
    sessionNo: data.sessionNo ?? 1,
    promptDelaySeconds: data.promptDelaySeconds ?? 30,
    surveys: Array.isArray(data.surveys) ? data.surveys : [],
  };
}

/** Опрос с активными вопросами и прогрессом пользователя (если начинал). */
export async function fetchSurvey(id: string, lang: string): Promise<SurveyDetail> {
  const res = await api.get(`/surveys/${id}`, { params: { lang } });
  const data = unwrap<SurveyDetail>(res);
  return { ...data, questions: Array.isArray(data.questions) ? data.questions : [] };
}

/** Показ приглашения (AUTO) или карточки из списка (LIST) — для статистики и недельного лимита. */
export async function markSurveyShown(id: string, trigger: SurveyImpressionTrigger): Promise<void> {
  await api.post(`/surveys/${id}/shown`, { trigger });
}

/** «Позже» на приглашении: один отказ на визит. */
export async function dismissSurvey(id: string): Promise<void> {
  await api.post(`/surveys/${id}/dismiss`);
}

/** Создать прохождение (идемпотентно) и вернуть прогресс. */
export async function startSurvey(id: string, platform: SurveyPlatform, locale: string): Promise<SurveyProgress> {
  const res = await api.post(`/surveys/${id}/start`, { platform, locale });
  const p = unwrap<SurveyProgress>(res);
  return { ...p, answers: p.answers ?? {}, skipped: Array.isArray(p.skipped) ? p.skipped : [] };
}

/** Сохранить ответ на вопрос (upsert). `skipped=true` допустим только для необязательных. */
export async function answerSurveyQuestion(
  id: string,
  questionId: string,
  value: AnswerValue | null,
  skipped: boolean,
): Promise<AnswerResult> {
  const res = await api.put(`/surveys/${id}/answers/${questionId}`, { value, skipped });
  return unwrap<AnswerResult>(res);
}

/** Завершить опрос и получить награду. Повторный вызов → 200 с `alreadyCompleted=true`. */
export async function completeSurvey(id: string): Promise<CompleteResult> {
  const res = await api.post(`/surveys/${id}/complete`);
  return unwrap<CompleteResult>(res);
}
