import { useCallback, useEffect, useRef, useState } from 'react';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { getSessionId } from '@/lib/app-events';
import {
  dismissSurvey,
  fetchAvailableSurveys,
  markSurveyShown,
  type AvailableSurveys,
  type SurveyCard,
} from '@/lib/surveys';

/** Не чаще раза в минуту перезапрашиваем опросы при возврате в приложение. */
const REFETCH_THROTTLE_MS = 60_000;
const PROMPTED_KEY = 'svayp_survey_prompted';

/**
 * «Уже предлагали в этой сессии». Ключ — пользователь + сессия app_events (ротация после
 * 30 мин простоя). Не жизнь страницы: WebView гардероба живёт в IndexedStack без перезагрузки,
 * и «раз за загрузку страницы» превратилось бы в «раз за установку».
 */
function promptedMark(uid: string): string {
  return `${uid}:${getSessionId()}`;
}

function wasPrompted(uid: string): boolean {
  try {
    return localStorage.getItem(PROMPTED_KEY) === promptedMark(uid);
  } catch {
    return false;
  }
}

function markPrompted(uid: string): void {
  try {
    localStorage.setItem(PROMPTED_KEY, promptedMark(uid));
  } catch {
    // приватный режим / запрет хранилища — просто покажем ещё раз, не страшно
  }
}

interface Options {
  /** Гардероб загружен и не уходит на /closet/setup. */
  enabled: boolean;
  uid: string | null;
  lang: string;
  /** Открыт любой другой оверлей — приглашение ждёт, пока его закроют. */
  overlayOpen: boolean;
  onRoute: boolean;
}

/**
 * Автоматическое приглашение пройти опрос и список опросов для профиля.
 *
 * Правило «кому и какой опрос» решает сервер (номер визита, отказы, недельный лимит) —
 * здесь только клиентские условия: задержка после загрузки, раз за сессию, не поверх
 * других оверлеев. Любая ошибка сети глотается молча: гардероб не должен пострадать,
 * даже если бэкенд опросов ещё не выехал.
 */
export function useSurveyPrompt({ enabled, uid, lang, overlayOpen, onRoute }: Options) {
  const [data, setData] = useState<AvailableSurveys | null>(null);
  const [pending, setPending] = useState<SurveyCard | null>(null);
  const [invite, setInvite] = useState<SurveyCard | null>(null);
  const lastFetch = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled || !uid) return;
    lastFetch.current = Date.now();
    try {
      setData(await fetchAvailableSurveys(lang));
    } catch {
      // тишина: без опросов гардероб работает как раньше
    }
  }, [enabled, uid, lang]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Возврат в приложение: WebView не перезагружается, «после загрузки» второй раз не наступит.
  useEffect(() => {
    if (!enabled || !uid) return;
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastFetch.current > REFETCH_THROTTLE_MS) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, uid, refresh]);

  // Кандидат на автопоказ — через задержку из настроек сервера.
  useEffect(() => {
    if (!data || !uid || !enabled) return;
    const candidate = data.surveys.find((s) => s.autoPrompt);
    if (!candidate || wasPrompted(uid)) return;
    const timer = setTimeout(() => setPending(candidate), Math.max(0, data.promptDelaySeconds) * 1000);
    return () => clearTimeout(timer);
  }, [data, uid, enabled]);

  // Показываем, когда ничего не мешает; иначе ждём смены условий.
  const [recheck, setRecheck] = useState(0);
  useEffect(() => {
    if (!pending || invite || overlayOpen || !onRoute || !uid || !enabled) return;
    // Страховка от оверлеев, о которых гардероб не знает (шиты внутри дочерних компонентов):
    // их считает useOverlayBackClose. Занято — перепроверяем через пару секунд.
    const openOverlays = (window as unknown as { __svaypOverlays?: number }).__svaypOverlays ?? 0;
    if (openOverlays > 0) {
      const timer = setTimeout(() => setRecheck((n) => n + 1), 2000);
      return () => clearTimeout(timer);
    }
    setPending(null);
    if (wasPrompted(uid)) return;
    markPrompted(uid);
    setInvite(pending);
    markSurveyShown(pending.id, 'AUTO').catch(() => {});
    logAnalyticsEvent(Events.SURVEY_SHOWN, {
      [Params.SURVEY_ID]: pending.id,
      [Params.TRIGGER]: 'auto',
      [Params.VISIT_NO]: data?.visitNo ?? 0,
    });
  }, [pending, invite, overlayOpen, onRoute, uid, enabled, data, recheck]);

  /** «Пройти»: закрыть приглашение и вернуть id для флоу. */
  const acceptInvite = useCallback((): string | null => {
    const id = invite?.id ?? null;
    setInvite(null);
    return id;
  }, [invite]);

  /** «Позже» / бэкдроп / Back — всё это отказ: закрыть без отказа нельзя. */
  const dismissInvite = useCallback(() => {
    if (!invite) return;
    const id = invite.id;
    setInvite(null);
    logAnalyticsEvent(Events.SURVEY_DISMISSED, { [Params.SURVEY_ID]: id });
    dismissSurvey(id)
      .catch(() => {})
      .finally(() => void refresh());
  }, [invite, refresh]);

  const surveys = data?.surveys ?? [];
  return { surveys, hasSurveys: surveys.length > 0, invite, acceptInvite, dismissInvite, refresh, visitNo: data?.visitNo ?? 0 };
}
