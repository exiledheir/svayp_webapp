import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Send, Loader2, Sparkles, ImagePlus, X, UserRound } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { getStylistStrings } from '@/lib/stylist-strings';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { uploadModelPhoto } from '@/lib/wardrobe-api';
import {
  fetchStylistAccess,
  fetchStylistThread,
  fetchStylistHistory,
  sendStylistMessage,
  rateStylistAnswer,
  saveStylistOutfit,
  SLOT_LABELS,
  type StylistOutfitCard,
  FEEDBACK_REASONS,
  type FeedbackReason,
  type StylistMessage,
} from '@/lib/stylist';

/**
 * Чат с AI-стилистом «Nur».
 *
 * Доступ проверяется на сервере при каждом запросе, но экран проверяет его и на входе:
 * без этого пользователь, зашедший по прямой ссылке, упёрся бы в 403 уже после отправки
 * сообщения — хуже, чем честный отказ сразу.
 */

export default function StylistPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { locale } = useI18n();
  const S = getStylistStrings(locale);
  const dark = theme === 'dark';

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [beta, setBeta] = useState(false);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StylistMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Прикреплённые фото: ключ блоба для отправки + локальный превью для показа.
  // URL наружу не отдаём — сервер сам резолвит ключ, проверив владельца.
  const [attachments, setAttachments] = useState<{ key: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // Сохранённые образы: ключ «id сообщения — номер образа». Держим локально, чтобы
  // кнопка сразу сменилась на «Открыть в гардеробе» без перезапроса истории.
  const [savedOutfits, setSavedOutfits] = useState<Record<string, string>>({});
  const [savingOutfit, setSavingOutfit] = useState<string | null>(null);

  // Оценки: id сообщения → вердикт. Тоже локально — чтобы не тянуть историю
  // после каждого тапа и не дать оценить дважды.
  const [rated, setRated] = useState<Record<string, 'UP' | 'DOWN'>>({});
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [refundNote, setRefundNote] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // ── Доступ и история ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const access = await fetchStylistAccess();
      if (cancelled) return;
      setAllowed(access.available);
      setBeta(access.beta);
      setChecking(false);
      if (!access.available) return;

      logAnalyticsEvent(Events.STYLIST_CHAT_OPENED, { [Params.SOURCE]: 'closet_header' });
      try {
        const id = await fetchStylistThread();
        if (cancelled) return;
        setThreadId(id);
        const history = await fetchStylistHistory(id);
        if (!cancelled) setMessages(history);
      } catch {
        // История не критична: пустой тред — рабочее состояние, чат откроется чистым.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  /**
   * Сохранить образ в гардероб. После успеха кнопка меняется на переход к доскам —
   * там образ живёт как обычный и оттуда же запускается примерка.
   */
  const saveOutfit = useCallback(
    async (messageId: string, index: number, outfit: StylistOutfitCard) => {
      const key = `${messageId}-${index}`;
      setSavingOutfit(key);
      setError(null);
      try {
        const canvasId = await saveStylistOutfit(messageId, index, outfit.title);
        setSavedOutfits((prev) => ({ ...prev, [key]: canvasId }));
        logAnalyticsEvent(Events.STYLIST_OUTFIT_SAVED, { [Params.SOURCE]: 'chat' });
      } catch (e: unknown) {
        const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
        setError(
          code === 'OUTFIT_HAS_NO_WARDROBE_ITEMS'
            ? S.errorNoWardrobeItems
            : S.errorSaveOutfit,
        );
      } finally {
        setSavingOutfit(null);
      }
    },
    [S],
  );

  /**
   * Оценить ответ. Вердикт запоминаем сразу, не дожидаясь сервера: кнопка должна
   * откликаться мгновенно, а неудача оценки — не тот случай, ради которого стоит
   * показывать ошибку поверх диалога.
   */
  const rate = useCallback(async (messageId: string, positive: boolean, reason?: FeedbackReason) => {
    setRated((prev) => ({ ...prev, [messageId]: positive ? 'UP' : 'DOWN' }));
    setReasonFor(null);
    try {
      const res = await rateStylistAnswer(messageId, positive, reason);
      if (res.refunded) {
        setRefundNote((prev) => ({ ...prev, [messageId]: S.refunded(res.coins) }));
      }
    } catch {
      // Оценка не критична — молча откатываем отметку, чтобы можно было попробовать снова.
      setRated((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    }
  }, [S]);

  /** Загружает фото и держит его ключ до отправки. Превью — локальный object URL. */
  const attachPhoto = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const key = await uploadModelPhoto(file);
      setAttachments((prev) => [...prev, { key, preview: URL.createObjectURL(file) }]);
    } catch {
      setError(S.errorPhoto);
    } finally {
      setUploading(false);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const body = text.trim();
      // Фото без текста — рабочий сценарий: «скинула вещь, собери образ».
      if ((!body && attachments.length === 0) || sending) return;

      setError(null);
      setSending(true);
      setDraft('');
      const keys = attachments.map((a) => a.key);
      setAttachments([]);

      // Оптимистично показываем свою реплику: ждать ответа модели молча — плохой UX.
      const optimistic: StylistMessage = {
        id: `local-${Date.now()}`,
        role: 'USER',
        action: null,
        content: body || (keys.length === 1 ? S.photoOne : S.photoMany(keys.length)),
        coinsSpent: 0,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      logAnalyticsEvent(Events.STYLIST_MESSAGE_SENT, { [Params.HAS_PHOTO]: keys.length > 0 });

      try {
        const answer = await sendStylistMessage({
          // Фото без подписи трактуем как «собери образ вокруг этой вещи» — главный сценарий.
          text: body || S.defaultOutfitPrompt,
          action: keys.length > 0 && !body ? 'OUTFIT' : undefined,
          imageKeys: keys.length > 0 ? keys : undefined,
          // Nur обязана отвечать на языке приложения: узбекоязычному пользователю
          // русский ответ бесполезен.
          locale,
          threadId: threadId ?? undefined,
        });
        setThreadId(answer.threadId);
        setMessages((prev) => [
          ...prev,
          {
            id: answer.messageId,
            role: 'ASSISTANT',
            action: null,
            content: answer.answer ?? '',
            outfits: answer.outfits ?? [],
            coinsSpent: answer.coinsSpent,
            createdAt: new Date().toISOString(),
          },
        ]);
        logAnalyticsEvent(Events.STYLIST_ANSWER_SHOWN, { [Params.SOURCE]: answer.chargedSource });
      } catch (e: unknown) {
        // Реплику оставляем на экране. На сервере её нет: при сбое генерации транзакция
        // откатывается целиком, чтобы в истории не оседали вопросы без ответов. Значит
        // единственная копия написанного — эта, и стирать её нельзя.
        const status = (e as { response?: { status?: number; data?: { code?: string } } })?.response;
        setError(
          status?.data?.code === 'INSUFFICIENT_COINS'
            ? S.errorCoins
            : S.errorGeneric,
        );
      } finally {
        setSending(false);
      }
    },
    [sending, threadId, attachments, locale, S],
  );

  const bg = dark ? '#0F0F0F' : '#FAFAF8';
  const ink = dark ? '#FAFAF8' : '#0A0A0A';
  const muted = dark ? '#9B9B9B' : '#6B6B6B';
  const card = dark ? '#1A1A1A' : '#F5F5F3';
  const line = dark ? '#2D2D2D' : '#E5E5E5';

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: bg }}>
        <Loader2 size={22} className="animate-spin" style={{ color: muted }} />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center" style={{ background: bg }}>
        <Sparkles size={28} style={{ color: '#C8A882' }} />
        <p className="mt-4 text-[15px] font-semibold" style={{ color: ink }}>
          {S.unavailableTitle}
        </p>
        <p className="mt-2 text-[13px]" style={{ color: muted }}>
          {S.unavailableText}
        </p>
        <button
          onClick={() => router.back()}
          className="mt-6 px-5 h-10 rounded-full text-[13px] font-bold"
          style={{ background: ink, color: bg }}
        >
          {S.goBack}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: bg }}>
      {/* Шапка */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14"
        style={{ background: bg, borderBottom: `1px solid ${line}` }}
      >
        <button onClick={() => router.back()} aria-label="Назад" className="active:scale-95 transition-transform">
          <ArrowLeft size={20} style={{ color: ink }} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-bold" style={{ color: ink }}>
            {S.title}
          </span>
          {beta && (
            <span
              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{ background: '#C8A88222', color: '#C8A882', letterSpacing: '0.5px' }}
            >
              {S.beta}
            </span>
          )}
        </div>

        {/* Вход в профиль — по ТЗ 3.4 он живёт в шапке чата: онбординга нет, и это
            единственное место, где видно, что Nur о тебе знает. */}
        <button
          onClick={() => router.push('/stylist/profile')}
          aria-label="Мой стилевой профиль"
          className="ml-auto w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: card, color: muted, border: `1px solid ${line}` }}
        >
          <UserRound size={15} />
        </button>
      </header>

      {/* Лента */}
      <main className="flex-1 px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="mt-6">
            <p className="text-[15px] font-semibold" style={{ color: ink }}>
              {S.greeting}
            </p>
            <p className="mt-1 text-[13px]" style={{ color: muted }}>
              {S.greetingHint}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {S.starters.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    logAnalyticsEvent(Events.STYLIST_STARTER_CHIP_TAPPED, { [Params.SOURCE]: chip });
                    send(chip);
                  }}
                  className="text-left px-4 py-3 rounded-2xl text-[14px] active:scale-[0.99] transition-transform"
                  style={{ background: card, color: ink, border: `1px solid ${line}` }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'USER' ? 'self-end' : 'self-start'} max-w-[85%]`}>
            {/* Текст показываем, только когда карточек нет: при сборке образа
                вся информация уже в них, и абзац рядом был бы дублем. */}
            {(!m.outfits || m.outfits.length === 0) && m.content && (
              <div
                className="px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap"
                style={
                  m.role === 'USER'
                    ? { background: ink, color: bg }
                    : { background: card, color: ink, border: `1px solid ${line}` }
                }
              >
                {m.content}
              </div>
            )}

            {/* Карточки образов: слоты по ролям с метками происхождения. */}
            {m.outfits?.map((outfit, idx) => (
              <div
                key={`${m.id}-${idx}`}
                className="mb-2 rounded-2xl overflow-hidden"
                style={{ background: card, border: `1px solid ${line}` }}
              >
                <div className="px-4 pt-3 pb-2">
                  <p className="text-[15px] font-semibold" style={{ color: ink }}>
                    {outfit.title}
                  </p>
                </div>

                <div className="flex flex-col">
                  {outfit.slots.map((slot, si) => (
                    <div
                      key={si}
                      className="flex items-center gap-3 px-4 py-2"
                      style={{ borderTop: `1px solid ${line}` }}
                    >
                      {slot.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slot.imageUrl}
                          alt={slot.description}
                          className="w-11 h-11 rounded-lg object-cover shrink-0"
                          style={{ background: bg }}
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center text-[16px]"
                          style={{ background: bg, border: `1px dashed ${line}` }}
                        >
                          🔵
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[10px] font-bold uppercase"
                          style={{ color: muted, letterSpacing: '0.5px' }}
                        >
                          {SLOT_LABELS[slot.role] ?? slot.role}
                        </p>
                        <p className="text-[13px] leading-snug" style={{ color: ink }}>
                          {slot.description}
                        </p>
                      </div>
                      <span
                        className="text-[11px] font-semibold shrink-0"
                        style={{ color: slot.source === 'WARDROBE' ? '#2D6A4F' : '#C8A882' }}
                      >
                        {slot.source === 'WARDROBE' ? S.inWardrobe : S.pickUp}
                      </span>
                    </div>
                  ))}
                </div>

                {outfit.why && (
                  <p className="px-4 py-2.5 text-[12px] leading-snug" style={{ color: muted, borderTop: `1px solid ${line}` }}>
                    {outfit.why}
                  </p>
                )}

                {/* Блок «вдохновение» — чужие фото из открытых источников.
                    Стоит ОТДЕЛЬНО от слотов и подписан честно: на снимке другой человек
                    с другой фигурой, и выдавать его за персональную рекомендацию нельзя.
                    Атрибуция обязательна по лицензии CC — автор, лицензия и ссылка
                    на оригинал видны и кликабельны. */}
                {outfit.inspiration && outfit.inspiration.length > 0 && (
                  <div className="px-4 py-3" style={{ borderTop: `1px solid ${line}` }}>
                    <p
                      className="text-[10px] font-bold uppercase mb-2"
                      style={{ color: muted, letterSpacing: '0.5px' }}
                    >
                      {S.howWorn}
                    </p>
                    <div className="flex gap-2 overflow-x-auto">
                      {outfit.inspiration.map((img) => (
                        <a
                          key={img.thumbnailUrl}
                          href={img.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 w-24"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.thumbnailUrl}
                            alt={`Референс, автор ${img.creator ?? 'неизвестен'}`}
                            className="w-24 h-32 rounded-lg object-cover"
                            style={{ background: bg, border: `1px solid ${line}` }}
                          />
                          <span className="block mt-1 text-[9px] leading-tight" style={{ color: muted }}>
                            {img.creator ?? 'неизвестный автор'} · {img.license.toUpperCase()}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 px-4 py-3" style={{ borderTop: `1px solid ${line}` }}>
                  {savedOutfits[`${m.id}-${idx}`] ? (
                    <button
                      onClick={() => router.push('/closet?tab=boards')}
                      className="flex-1 h-9 rounded-full text-[13px] font-bold active:scale-[0.98] transition-transform"
                      style={{ background: '#2D6A4F', color: '#fff' }}
                    >
                      {S.openInCloset}
                    </button>
                  ) : (
                    <button
                      onClick={() => saveOutfit(m.id, idx, outfit)}
                      disabled={savingOutfit === `${m.id}-${idx}`}
                      className="flex-1 h-9 rounded-full text-[13px] font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                      style={{ background: ink, color: bg }}
                    >
                      {savingOutfit === `${m.id}-${idx}` ? S.saving : S.saveOutfit}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Оценка только под ответами Nur и только для сохранённых сообщений:
                у оптимистичной реплики id локальный, сервер о ней не знает. */}
            {m.role === 'ASSISTANT' && !m.id.startsWith('local-') && (
              <div className="flex items-center gap-1 mt-1.5 pl-1">
                <button
                  onClick={() => rate(m.id, true)}
                  disabled={!!rated[m.id]}
                  aria-label="Хороший ответ"
                  className="px-2 py-1 rounded-lg text-[13px] active:scale-95 transition-transform disabled:opacity-100"
                  style={{ color: rated[m.id] === 'UP' ? '#2D6A4F' : muted }}
                >
                  👍
                </button>
                <button
                  onClick={() => setReasonFor(m.id)}
                  disabled={!!rated[m.id]}
                  aria-label="Плохой ответ"
                  className="px-2 py-1 rounded-lg text-[13px] active:scale-95 transition-transform"
                  style={{ color: rated[m.id] === 'DOWN' ? '#8B1A1A' : muted }}
                >
                  👎
                </button>
                {refundNote[m.id] && (
                  <span className="text-[12px] ml-1" style={{ color: '#2D6A4F' }}>
                    {refundNote[m.id]}
                  </span>
                )}
              </div>
            )}

            {/* Причину спрашиваем сразу после 👎: без неё дашборд качества показывает
                только «плохо», но не что именно сломалось. */}
            {reasonFor === m.id && (
              <div
                className="mt-2 p-2 rounded-xl flex flex-wrap gap-1.5"
                style={{ background: card, border: `1px solid ${line}` }}
              >
                {S.feedbackReasons.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => rate(m.id, false, r.code)}
                    className="px-2.5 py-1.5 rounded-lg text-[12px] active:scale-95 transition-transform"
                    style={{ background: bg, color: ink, border: `1px solid ${line}` }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div
            className="self-start px-4 py-2.5 rounded-2xl text-[13px]"
            style={{ background: card, color: muted, border: `1px solid ${line}` }}
          >
            {S.thinking}
          </div>
        )}

        {error && (
          <div className="self-start text-[13px] px-1" style={{ color: '#8B1A1A' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Ввод */}
      <footer className="sticky bottom-0 px-4 py-3" style={{ background: bg, borderTop: `1px solid ${line}` }}>
        {/* Превью прикреплённых фото. Крестик убирает снимок до отправки — переснять
            вещь под другим углом дешевле, чем потратить монеты на плохой кадр. */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto">
            {attachments.map((a) => (
              <div key={a.key} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.preview}
                  alt="Прикреплённое фото"
                  className="w-14 h-14 rounded-xl object-cover"
                  style={{ border: `1px solid ${line}` }}
                />
                <button
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.key !== a.key))}
                  aria-label={S.removePhoto}
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full"
                  style={{ background: ink, color: bg }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) attachPhoto(f);
            // Сбрасываем значение: иначе повторный выбор того же файла не даст onChange.
            e.target.value = '';
          }}
        />

        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || sending}
            aria-label={S.attachPhoto}
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: card, color: ink, border: `1px solid ${line}` }}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            placeholder={S.inputPlaceholder}
            className="flex-1 resize-none px-4 py-2.5 rounded-2xl text-[14px] outline-none"
            style={{ background: card, color: ink, border: `1px solid ${line}`, maxHeight: 120 }}
          />
          <button
            onClick={() => send(draft)}
            disabled={(!draft.trim() && attachments.length === 0) || sending || uploading}
            aria-label={S.send}
            className="flex items-center justify-center w-10 h-10 rounded-full active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: ink, color: bg }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </footer>
    </div>
  );
}
