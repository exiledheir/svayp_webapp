import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { editStyleProfileField } from '../../lib/stylist';
import { uploadModelPhoto } from '../../lib/wardrobe-api';
import type { StylistStrings } from '../../lib/stylist-strings';

/**
 * Знакомство с Nur — первый экран стилиста.
 *
 * <p>Раньше человек попадал сразу в пустой чат и должен был сам придумать, о чём спросить
 * ассистента, который о нём ничего не знает. Ответы получались общими, и первое впечатление
 * — «обычный бот». Знакомство решает обе задачи: даёт Nur лицо и собирает то, без чего
 * совет не может быть личным.
 *
 * <p>Порядок шагов не случаен: сначала приветствие (кто это и зачем), потом фото (оно
 * закрывает сразу четыре поля профиля и его проще дать в начале, чем посреди разговора),
 * и только потом вопросы. Каждый шаг можно пропустить — иначе знакомство превращается
 * в анкету, и человек уходит, не дойдя до чата.
 */

/** Один вопрос знакомства: поле профиля и варианты ответа. */
interface Step {
  field: string;
  question: string;
  hint?: string;
  options: string[];
}

const STEPS: Step[] = [
  {
    field: 'style',
    question: 'Какой стиль тебе ближе?',
    hint: 'Можно поменять в любой момент',
    options: ['Минимализм', 'Классика', 'Casual', 'Романтичный', 'Спортивный', 'Пока не знаю'],
  },
  {
    field: 'modesty',
    question: 'Есть ли пожелания по закрытости?',
    options: ['Закрытая одежда', 'Умеренно', 'Без ограничений'],
  },
  {
    field: 'lifestyle',
    question: 'Где ты бываешь чаще всего?',
    hint: 'От этого зависит, что попадёт в образы',
    options: ['Офис', 'Учёба', 'Дома и прогулки', 'Много встреч', 'Творческая работа'],
  },
  {
    field: 'height_range',
    question: 'Твой рост?',
    hint: 'Нужен для пропорций — цифры спрашивать не буду',
    options: ['до 160 см', '160–170 см', '170–180 см', 'выше 180 см'],
  },
];

interface Props {
  S: StylistStrings;
  dark: boolean;
  /** Фото уходит в чат первым сообщением: разбор делает та же ручка, что и обычно. */
  onFinish: (photoKey: string | null) => void;
}

export default function NurOnboarding({ S, dark, onFinish }: Props) {
  const bg = dark ? '#0F0F0F' : '#FAFAF8';
  const ink = dark ? '#FAFAF8' : '#0A0A0A';
  const muted = dark ? '#9B9B9B' : '#6B6B6B';
  const card = dark ? '#1A1A1A' : '#F5F5F3';
  const line = dark ? '#2D2D2D' : '#E5E5E5';
  const accent = '#C8A882';

  /** -1 — приветствие, 0 — фото, дальше вопросы по одному. */
  const [step, setStep] = useState(-1);
  const [uploading, setUploading] = useState(false);
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Приветствие держится ровно столько, чтобы дочитать строку, и уходит само:
  // экран-заставка, на котором надо ещё и нажать кнопку, раздражает.
  useEffect(() => {
    if (step !== -1) return;
    const t = setTimeout(() => setStep(0), 2600);
    return () => clearTimeout(t);
  }, [step]);

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
  }, [step, photoKey, onFinish]);

  const current = step >= 1 && step <= STEPS.length ? STEPS[step - 1] : null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: bg }}>
      <style jsx>{`
        @keyframes nurGlow {
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
        @keyframes nurRise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes nurHalo {
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
        .nur-mark {
          animation: nurGlow 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .nur-halo {
          animation: nurHalo 2800ms ease-in-out infinite;
        }
        .nur-line {
          animation: nurRise 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .nur-mark,
          .nur-halo,
          .nur-line {
            animation: none;
          }
        }
      `}</style>

      {/* Приветствие: имя означает «свет», поэтому и знак — свечение, а не аватар бота. */}
      {step === -1 && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="relative mb-8">
            <div
              className="nur-halo absolute inset-0 rounded-full blur-2xl"
              style={{ background: accent }}
            />
            <div
              className="nur-mark relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: ink }}
            >
              <Sparkles size={30} color={accent} />
            </div>
          </div>

          <h1
            className="nur-line text-[40px] leading-[48px] mb-3"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              color: ink,
              letterSpacing: '-0.5px',
              animationDelay: '260ms',
            }}
          >
            Привет, я Nur
          </h1>
          <p
            className="nur-line text-[16px] leading-6 max-w-[300px]"
            style={{ color: muted, animationDelay: '520ms' }}
          >
            Твой личный стилист. «Nur» значит «свет» — помогу увидеть, что тебе идёт.
          </p>
        </div>
      )}

      {/* Фото: закрывает цветотип, фигуру, пропорции и текущий стиль разом. */}
      {step === 0 && (
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="nur-line">
            <h2
              className="text-[28px] leading-9 mb-3"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: ink }}
            >
              Покажи себя
            </h2>
            <p className="text-[15px] leading-6 mb-8" style={{ color: muted }}>
              По фото в полный рост я определю цветотип, пропорции и подберу оттенки — советы
              станут точными, а не общими. Фото видно только тебе.
            </p>

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
              {uploading ? S.uploading : 'Выбрать или снять фото'}
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full h-11 mt-2 text-[14px]"
              style={{ color: muted }}
            >
              Позже
            </button>
          </div>
        </div>
      )}

      {/* Вопросы: по одному за раз и только вариантами — печатать ответ никто не станет. */}
      {current && (
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="nur-line" key={current.field}>
            <p
              className="text-[11px] font-bold uppercase mb-3"
              style={{ color: accent, letterSpacing: '0.5px' }}
            >
              Шаг {step} из {STEPS.length}
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
                  key={opt}
                  onClick={() => answer(current.field, opt === 'Пока не знаю' ? null : opt)}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 rounded-2xl text-[15px] active:scale-[0.99] transition-transform disabled:opacity-60"
                  style={{ background: card, color: ink, border: `1px solid ${line}` }}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              onClick={() => answer(current.field, null)}
              className="w-full h-11 mt-3 text-[14px]"
              style={{ color: muted }}
            >
              Пропустить
            </button>
          </div>
        </div>
      )}

      {/* Полоса прогресса: видно, что знакомство короткое и вот-вот закончится. */}
      {step >= 0 && (
        <div className="px-6 pb-8">
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
    </div>
  );
}
