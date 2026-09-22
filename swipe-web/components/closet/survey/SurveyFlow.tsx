import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, Star, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { apiErrorCode } from '@/lib/api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { getHostPlatform, isInFlutterWebView } from '@/lib/flutter-bridge';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';
import {
  answerSurveyQuestion,
  completeSurvey,
  fetchSurvey,
  startSurvey,
  type AnswerValue,
  type CompleteResult,
  type SurveyDetail,
  type SurveyQuestion,
} from '@/lib/surveys';
import { surveyTheme, type SurveyTheme } from './theme';

/** Меньше двух символов — «пусто», как на сервере: «.» на обязательный вопрос не проходит. */
const MIN_TEXT = 2;

function isValid(q: SurveyQuestion, v: AnswerValue | undefined): boolean {
  if (!v) return false;
  switch (q.type) {
    case 'RATING':
      return 'rating' in v && v.rating >= 1;
    case 'SINGLE_CHOICE':
      return 'optionId' in v && !!v.optionId;
    case 'MULTI_CHOICE':
      return 'optionIds' in v && v.optionIds.length >= Math.max(1, q.settings?.minSelections ?? 1);
    case 'TEXT':
      return 'text' in v && v.text.trim().length >= MIN_TEXT;
  }
}

/** id вопроса из details[] ответа 422 REQUIRED_QUESTIONS_MISSING. */
function firstMissingQuestion(err: unknown): string | null {
  const details = (err as { response?: { data?: { error?: { details?: { rejectedValue?: unknown }[] } } } })
    ?.response?.data?.error?.details;
  const v = Array.isArray(details) ? details[0]?.rejectedValue : null;
  return typeof v === 'string' ? v : null;
}

/**
 * Прохождение опроса: полноэкранный оверлей поверх гардероба, один вопрос на экран.
 *
 * Каждый ответ уходит на сервер при «Далее» — выход из приложения на середине не теряет
 * прогресс, а повторный вход начинается с первого неотвеченного вопроса. Экран успеха
 * показываем только после ответа сервера на complete: награда считается там.
 */
export default function SurveyFlow({
  surveyId,
  dark,
  onCompleted,
  onExit,
}: {
  surveyId: string;
  dark: boolean;
  onCompleted: (result: CompleteResult) => void;
  onExit: () => void;
}) {
  const { t, locale } = useI18n();
  const th = surveyTheme(dark);

  const [detail, setDetail] = useState<SurveyDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const finished = useRef(false);
  /** Время открытия флоу в этой сессии — для duration_seconds в аналитике (точное время считает сервер). */
  const startedAt = useRef(Date.now());
  const indexRef = useRef(0);
  indexRef.current = index;
  // Родитель передаёт инлайн-колбэк: без ref загрузка перезапускалась бы на каждом рендере.
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  // Back на телефоне: из опроса — диалог «Выйти?», из диалога — закрыть диалог.
  useOverlayBackClose(!exitOpen, () => setExitOpen(true));
  useOverlayBackClose(exitOpen, () => setExitOpen(false));

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const d = await fetchSurvey(surveyId, locale);
      if (!d.questions.length) throw new Error('empty survey');
      let progress = d.progress ?? null;
      if (!progress) {
        const platform = isInFlutterWebView() ? getHostPlatform() : 'web';
        progress = await startSurvey(surveyId, platform, locale);
        logAnalyticsEvent(Events.SURVEY_STARTED, { [Params.SURVEY_ID]: surveyId });
      }
      if (progress.status === 'COMPLETED') {
        // Уже пройден (второе устройство) — сервер вернёт тот же результат без новой награды.
        finished.current = true;
        onCompletedRef.current(await completeSurvey(surveyId));
        return;
      }
      const skipped = new Set(progress.skipped);
      const first = d.questions.findIndex((q) => !(q.id in progress!.answers) && !skipped.has(q.id));
      setAnswers(progress.answers);
      setIndex(first < 0 ? d.questions.length - 1 : first);
      setDetail(d);
    } catch {
      setLoadError(true);
    }
  }, [surveyId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  // Приложение закрыли посреди опроса — фиксируем уход (прогресс уже на сервере).
  useEffect(() => {
    const onHide = () => {
      if (!finished.current) {
        logAnalyticsEvent(Events.SURVEY_ABANDONED, {
          [Params.SURVEY_ID]: surveyId,
          [Params.QUESTION_INDEX]: indexRef.current,
        });
      }
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [surveyId]);

  const questions = detail?.questions ?? [];
  const q = questions[index];
  const value = q ? answers[q.id] : undefined;
  const isLast = index === questions.length - 1;

  const complete = async () => {
    try {
      const result = await completeSurvey(surveyId);
      finished.current = true;
      logAnalyticsEvent(Events.SURVEY_COMPLETED, {
        [Params.SURVEY_ID]: surveyId,
        [Params.REWARD_COINS]: result.alreadyCompleted ? 0 : result.rewardCoins,
        duration_seconds: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0,
      });
      if (result.rewardCoins > 0 && !result.alreadyCompleted) {
        logAnalyticsEvent(Events.SURVEY_REWARD_GRANTED, {
          [Params.SURVEY_ID]: surveyId,
          [Params.REWARD_COINS]: result.rewardCoins,
          new_balance: result.newBalance,
        });
      }
      onCompleted(result);
    } catch (err) {
      if (apiErrorCode(err) === 'REQUIRED_QUESTIONS_MISSING') {
        const missing = firstMissingQuestion(err);
        const i = questions.findIndex((x) => x.id === missing);
        if (i >= 0) setIndex(i);
        return;
      }
      setSaveError(true);
    }
  };

  const submit = async (skip: boolean) => {
    if (!q || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await answerSurveyQuestion(surveyId, q.id, skip ? null : value ?? null, skip);
      if (skip) {
        setAnswers((a) => {
          const next = { ...a };
          delete next[q.id];
          return next;
        });
      }
      logAnalyticsEvent(Events.SURVEY_QUESTION_ANSWERED, {
        [Params.SURVEY_ID]: surveyId,
        [Params.QUESTION_ID]: q.id,
        [Params.QUESTION_INDEX]: index,
        [Params.QUESTION_TYPE]: q.type,
        skipped: skip,
      });
      if (isLast) await complete();
      else setIndex(index + 1);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const confirmExit = () => {
    finished.current = true;
    logAnalyticsEvent(Events.SURVEY_ABANDONED, {
      [Params.SURVEY_ID]: surveyId,
      [Params.QUESTION_INDEX]: index,
    });
    setExitOpen(false);
    onExit();
  };

  const setValue = (v: AnswerValue) => {
    setSaveError(false);
    if (q) setAnswers((a) => ({ ...a, [q.id]: v }));
  };

  const canNext = !!q && isValid(q, value);
  const nextLabel = isLast ? t.sv_finish : t.sv_next;

  const footer = q && (
    <div className="flex flex-col gap-1">
      {saveError && (
        <button type="button" onClick={() => void submit(false)} className="text-[13px] font-semibold py-1" style={{ color: '#d94b4b' }}>
          {t.sv_save_error}
        </button>
      )}
      <button
        type="button"
        disabled={!canNext || saving}
        onClick={() => void submit(false)}
        className="w-full h-14 rounded-2xl text-white text-[16px] font-bold transition-transform active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: th.accentGradient }}
      >
        {saving && <Loader2 size={18} className="animate-spin" />}
        {nextLabel}
      </button>
      {!q.required && (
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit(true)}
          className="w-full h-11 text-[15px] font-semibold disabled:opacity-40"
          style={{ color: th.sub }}
        >
          {t.sv_skip}
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[95] flex flex-col" style={{ background: th.surface, color: th.ink }}>
      {/* Шапка */}
      <div className="px-4" style={{ paddingTop: 'max(0.75rem, var(--safe-top))' }}>
        <div className="flex items-center gap-2 h-11">
          <RoundBtn theme={th} label="←" onClick={() => (index > 0 ? setIndex(index - 1) : setExitOpen(true))}>
            <ArrowLeft size={18} />
          </RoundBtn>
          <span className="flex-1 text-center text-[13px] font-semibold tabular-nums" style={{ color: th.sub }}>
            {detail && t.sv_q_of.replace('{n}', String(index + 1)).replace('{total}', String(questions.length))}
          </span>
          <RoundBtn theme={th} label="✕" onClick={() => setExitOpen(true)}>
            <X size={18} />
          </RoundBtn>
        </div>
        <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: th.track }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${questions.length ? (index / questions.length) * 100 : 0}%`, background: th.accent }}
          />
        </div>
      </div>

      {/* Тело */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
        {loadError ? (
          <div className="flex flex-col items-center text-center pt-16 gap-4">
            <p className="text-[15px]" style={{ color: th.sub }}>
              {t.sv_load_error}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="h-11 px-6 rounded-2xl text-white font-bold"
              style={{ background: th.accent }}
            >
              {t.sv_retry}
            </button>
          </div>
        ) : !q ? (
          <div className="flex justify-center pt-20">
            <Loader2 size={28} className="animate-spin" style={{ color: th.accent }} />
          </div>
        ) : (
          <>
            <h2 className="text-[22px] font-extrabold leading-tight">
              {q.text}
              {q.required && <span style={{ color: th.accent }}> *</span>}
            </h2>
            {q.hint && (
              <p className="text-[14px] mt-2" style={{ color: th.sub }}>
                {q.hint}
              </p>
            )}
            <div className="mt-5">
              <QuestionBody q={q} value={value} onChange={setValue} theme={th} />
            </div>
            {/* Для текста кнопка под полем, а не в фиксированном футере: на iOS футер уезжает под клавиатуру. */}
            {q.type === 'TEXT' && <div className="mt-5">{footer}</div>}
          </>
        )}
      </div>

      {q && q.type !== 'TEXT' && (
        <div className="px-5 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
          {footer}
        </div>
      )}

      {exitOpen && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-7"
          style={{ background: 'rgba(15,8,14,0.45)' }}
          onClick={() => setExitOpen(false)}
        >
          <div
            className="w-full max-w-[340px] rounded-3xl p-5"
            style={{ background: th.surface }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-label={t.sv_exit_title}
          >
            <h3 className="text-[17px] font-extrabold">{t.sv_exit_title}</h3>
            <p className="text-[14px] mt-1.5" style={{ color: th.sub }}>
              {t.sv_exit_body}
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setExitOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold"
                style={{ border: `1.5px solid ${th.line}`, color: th.ink }}
              >
                {t.sv_exit_stay}
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="flex-1 h-12 rounded-2xl font-bold"
                style={{ background: th.ink, color: th.surface }}
              >
                {t.sv_exit_confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundBtn({
  theme,
  label,
  onClick,
  children,
}: {
  theme: SurveyTheme;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
      style={{ background: theme.chip, color: theme.ink }}
    >
      {children}
    </button>
  );
}

function QuestionBody({
  q,
  value,
  onChange,
  theme: th,
}: {
  q: SurveyQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  theme: SurveyTheme;
}) {
  const { t } = useI18n();

  if (q.type === 'RATING') {
    const current = value && 'rating' in value ? value.rating : 0;
    const max = q.settings?.ratingMax ?? 5;
    return (
      <div>
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
            const filled = n <= current;
            return (
              <button
                key={n}
                type="button"
                aria-label={String(n)}
                onClick={() => onChange({ rating: n })}
                className="w-12 h-12 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Star size={36} style={{ fill: filled ? th.accent : 'transparent', color: filled ? th.accent : '#d1d5db' }} />
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-[12px] mt-2 px-2" style={{ color: th.sub }}>
          <span>{t.sv_rate_low}</span>
          <span>{t.sv_rate_high}</span>
        </div>
      </div>
    );
  }

  if (q.type === 'TEXT') {
    const text = value && 'text' in value ? value.text : '';
    const max = q.settings?.maxLength ?? 1000;
    return (
      <div>
        <textarea
          value={text}
          maxLength={max}
          rows={5}
          placeholder={t.sv_text_placeholder}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full resize-none rounded-2xl px-3.5 py-3 text-[15px] focus:outline-none"
          style={{ background: th.chip, border: `1px solid ${th.line}`, color: th.ink }}
        />
        <p className="text-right text-[12px] mt-1 tabular-nums" style={{ color: th.sub }}>
          {text.length} / {max}
        </p>
      </div>
    );
  }

  const options = q.options ?? [];
  if (q.type === 'SINGLE_CHOICE') {
    const selected = value && 'optionId' in value ? value.optionId : null;
    return (
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const on = o.id === selected;
          return (
            <OptionRow key={o.id} theme={th} on={on} square={false} onClick={() => onChange({ optionId: o.id })}>
              {o.text}
            </OptionRow>
          );
        })}
      </div>
    );
  }

  // MULTI_CHOICE: при достижении максимума остальные блокируются с подсказкой «Выбрано n из max».
  const selected = value && 'optionIds' in value ? value.optionIds : [];
  const max = q.settings?.maxSelections ?? options.length;
  return (
    <div>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const on = selected.includes(o.id);
          const disabled = !on && selected.length >= max;
          return (
            <OptionRow
              key={o.id}
              theme={th}
              on={on}
              square
              disabled={disabled}
              onClick={() =>
                onChange({ optionIds: on ? selected.filter((x) => x !== o.id) : [...selected, o.id] })
              }
            >
              {o.text}
            </OptionRow>
          );
        })}
      </div>
      {q.settings?.maxSelections != null && (
        <p className="text-right text-[12px] mt-2 tabular-nums" style={{ color: th.sub }}>
          {t.sv_selected_of.replace('{n}', String(selected.length)).replace('{max}', String(max))}
        </p>
      )}
    </div>
  );
}

function OptionRow({
  theme: th,
  on,
  square,
  disabled,
  onClick,
  children,
}: {
  theme: SurveyTheme;
  on: boolean;
  square: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left text-[15px] font-semibold transition-colors active:scale-[0.99] disabled:opacity-40"
      style={{
        border: `1.5px solid ${on ? th.accent : th.line}`,
        background: on ? th.accentWash : 'transparent',
        color: th.ink,
      }}
    >
      <span
        className={`w-5 h-5 shrink-0 flex items-center justify-center ${square ? 'rounded-md' : 'rounded-full'}`}
        style={{
          border: on ? 'none' : '1.5px solid rgba(128,128,128,0.4)',
          background: on ? th.accent : 'transparent',
        }}
      >
        {on && (square ? <Check size={13} color="#fff" strokeWidth={3} /> : <span className="w-2 h-2 rounded-full bg-white" />)}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}
