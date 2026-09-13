import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import LunaMark from './NurMark';
import { editStyleProfileField } from '../../lib/stylist';
import { uploadModelPhoto } from '../../lib/wardrobe-api';
import type { StylistStrings } from '../../lib/stylist-strings';
import { stylistTheme } from '../../lib/stylist-theme';

/**
 * Знакомство с Luna — первый экран стилиста.
 *
 * <p>Раньше человек попадал сразу в пустой чат и должен был сам придумать, о чём спросить
 * ассистента, который о нём ничего не знает. Ответы получались общими, и первое впечатление
 * — «обычный бот». Знакомство решает обе задачи: даёт Luna лицо и собирает то, без чего
 * совет не может быть личным.
 *
 * <p>Порядок шагов не случаен: сначала приветствие (кто это и зачем), потом фото (оно
 * закрывает сразу четыре поля профиля и его проще дать в начале, чем посреди разговора),
 * и только потом вопросы. Каждый шаг можно пропустить — иначе знакомство превращается
 * в анкету, и человек уходит, не дойдя до чата.
 */

interface Props {
  S: StylistStrings;
  dark: boolean;
  /** Фото уходит в чат первым сообщением: разбор делает та же ручка, что и обычно. */
  onFinish: (photoKey: string | null) => void;
}

/**
 * Нижний блок действий — одинаковый на всех шагах знакомства.
 *
 * Кнопки шага живут внизу экрана, а не под текстом: так они не прыгают от шага
 * к шагу и палец достаёт их не глядя. Перекрыть нижнюю панель приложения нельзя
 * и не нужно — WebView вкладки заканчивается ВЫШЕ плавающего навбара
 * (WebViewScreen.bottomPadding), поэтому хватает обычного отступа. env() добирает
 * домашний индикатор там, где нативной оболочки нет, — в браузере.
 */
const ACTIONS_CLASS = 'px-6 pt-3 shrink-0';
const ACTIONS_STYLE: React.CSSProperties = {
  paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))',
};

/**
 * Содержимое шага: по центру, пока помещается, и прокручивается, когда нет.
 * `my-auto` центрирует при свободном месте и обнуляется при переполнении —
 * `justify-center` в этом случае обрезал бы верх списка вариантов.
 */
const CONTENT_CLASS = 'flex-1 min-h-0 overflow-y-auto px-6 flex flex-col';

export default function LunaOnboarding({ S, dark, onFinish }: Props) {
  // Вопросы и подписи — из строк локали: раньше экран был целиком по-русски и у
  // узбекских, и у английских пользователей, хотя всё приложение уже на их языке.
  const O = S.onboarding;
  const STEPS = O.steps;
  const { bg, ink, muted, card, line, accent } = stylistTheme(dark);

  /** -1 — приветствие, 0 — фото, дальше вопросы по одному. */
  const [step, setStep] = useState(-1);
  const [uploading, setUploading] = useState(false);
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const pickPhoto = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        setPhotoKey(await uploadModelPhoto(file));
        setStep(1);
      } catch {
        // Неудачная загрузка не должна запирать в знакомстве — фото можно прислать в чате.
        setStep(1);
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const answer = useCallback(
    async (field: string, value: string | null) => {
      if (value) {
        setSaving(true);
        try {
          await editStyleProfileField(field, value);
        } catch {
          // Профиль — обогащение, а не условие входа: ошибка сохранения не повод
          // держать человека на шаге, который он уже прошёл.
        } finally {
          setSaving(false);
        }
      }
      setStep((s) => s + 1);
    },
    [],
  );

  useEffect(() => {
    if (step > STEPS.length) onFinish(photoKey);
  }, [step, photoKey, onFinish, STEPS.length]);

  const current = step >= 1 && step <= STEPS.length ? STEPS[step - 1] : null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: bg }}>
      <style jsx>{`
        @keyframes lunaGlow {
          0% {
            opacity: 0;
            transform: scale(0.82);
          }
          60% {
            opacity: 1;
            transform: scale(1.04);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes lunaRise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes lunaHalo {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.12);
          }
        }
        .luna-mark {
          animation: lunaGlow 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .luna-halo {
          animation: lunaHalo 2800ms ease-in-out infinite;
        }
        .luna-line {
          animation: lunaRise 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .luna-mark,
          .luna-halo,
          .luna-line {
            animation: none;
          }
        }
      `}</style>

      {/* Полоса прогресса: видно, что знакомство короткое и вот-вот закончится.
          Сверху, а не снизу: низ теперь занят кнопками шага, а прогресс под
          кнопкой читался бы как часть самой кнопки. На приветствии её нет —
          знакомство ещё не началось. */}
      {step >= 0 && (
        <div
          className="px-6 shrink-0"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 1rem)' }}
        >
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: line }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                background: accent,
                width: `${Math.min(100, ((step + 1) / (STEPS.length + 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Приветствие: знак — свечение, а не аватар бота. Экран ждёт нажатия;
          раньше он уходил сам через 2.6 с, и знакомство начиналось до того, как
          человек успевал понять, куда попал. */}
      {step === -1 && (
        <>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="relative mb-8">
            <div
              className="luna-halo absolute inset-0 rounded-full blur-2xl"
              style={{ background: accent }}
            />
            <div
              className="luna-mark relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: ink }}
            >
              <LunaMark size={34} color={accent} />
            </div>
          </div>

          <h1
            className="luna-line text-[40px] leading-[48px] mb-3"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              color: ink,
              letterSpacing: '-0.5px',
              animationDelay: '260ms',
            }}
          >
            {O.hello}
          </h1>
          <p
            className="luna-line text-[16px] leading-6 max-w-[300px]"
            style={{ color: muted, animationDelay: '520ms' }}
          >
            {O.tagline}
          </p>
        </div>

        <div className={ACTIONS_CLASS} style={ACTIONS_STYLE}>
          <button
            onClick={() => setStep(0)}
            className="luna-line w-full h-12 rounded-full text-[15px] font-semibold active:scale-[0.98] transition-transform"
            style={{ background: ink, color: bg, animationDelay: '760ms' }}
          >
            {O.start}
          </button>
        </div>
        </>
      )}

      {/* Фото: закрывает цветотип, фигуру, пропорции и текущий стиль разом. */}
      {step === 0 && (
        <>
        <div className={CONTENT_CLASS}>
          <div className="luna-line my-auto py-6">
            <h2
              className="text-[28px] leading-9 mb-3"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: ink }}
            >
              {O.showYourself}
            </h2>
            <p className="text-[15px] leading-6" style={{ color: muted }}>
              {O.photoPitch}
            </p>
          </div>
        </div>

        <div className={ACTIONS_CLASS} style={ACTIONS_STYLE}>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickPhoto(f);
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="w-full h-12 rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            style={{ background: ink, color: bg }}
          >
            {uploading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Camera size={17} />
            )}
            {uploading ? S.uploading : O.pickPhoto}
          </button>
          <button
            onClick={() => setStep(1)}
            className="w-full h-11 mt-2 text-[14px]"
            style={{ color: muted }}
          >
            {O.later}
          </button>
        </div>
        </>
      )}

      {/* Вопросы: по одному за раз и только вариантами — печатать ответ никто не станет. */}
      {current && (
        <>
        <div className={CONTENT_CLASS}>
          <div className="luna-line my-auto py-6" key={current.field}>
            <p
              className="text-[11px] font-bold uppercase mb-3"
              style={{ color: accent, letterSpacing: '0.5px' }}
            >
              {O.stepOf(step, STEPS.length)}
            </p>
            <h2
              className="text-[26px] leading-8 mb-1"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: ink }}
            >
              {current.question}
            </h2>
            {current.hint && (
              <p className="text-[13px] mb-6" style={{ color: muted }}>
                {current.hint}
              </p>
            )}

            <div className="flex flex-col gap-2 mt-4">
              {current.options.map((opt) => (
                <button
                  key={opt.label}
                  // В профиль уходит значение, а не подпись: подпись переведена, а бэкенд
                  // читает значение как есть (закрытость сравнивается с «без ограничений»).
                  onClick={() => answer(current.field, opt.value)}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 rounded-2xl text-[15px] active:scale-[0.99] transition-transform disabled:opacity-60"
                  style={{ background: card, color: ink, border: `1px solid ${line}` }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Пропуск живёт там же, где «Позже» на шаге с фото: вторичное действие
            всегда внизу, чтобы варианты ответа не соседствовали с отказом. */}
        <div className={ACTIONS_CLASS} style={ACTIONS_STYLE}>
          <button
            onClick={() => answer(current.field, null)}
            className="w-full h-11 text-[14px]"
            style={{ color: muted }}
          >
            {O.skip}
          </button>
        </div>
        </>
      )}

    </div>
  );
}
