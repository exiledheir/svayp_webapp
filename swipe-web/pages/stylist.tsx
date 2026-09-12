import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import NurOnboarding from '@/components/stylist/NurOnboarding';
import NurMark from '@/components/stylist/NurMark';
import {
  ArrowLeft,
  Send,
  Loader2,
  ImagePlus,
  X,
  UserRound,
  MessageSquarePlus,
  History,
  Trash2,
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { isShellTab } from '@/lib/flutter-bridge';
import { useRootBackGuard } from '@/lib/use-root-back-guard';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';
import { getStylistStrings } from '@/lib/stylist-strings';
import { stylistTheme } from '@/lib/stylist-theme';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { uploadModelPhoto } from '@/lib/wardrobe-api';
import {
  fetchStylistAccess,
  fetchStylistThread,
  fetchStylistHistory,
  sendStylistMessage,
  fetchStylistThreads,
  startStylistThread,
  deleteStylistThread,
  clearStylistHistory,
  type StylistThread,
  rateStylistAnswer,
  saveStylistOutfit,
  importStylistReference,
  waitForItemReady,
  type StylistOutfitCard,
  FEEDBACK_REASONS,
  type FeedbackReason,
  type StylistMessage,
  type StylistAnswer,
  fetchStyleProfile,
  streamStylistMessage,
  StreamUnsupportedError,
  StylistTimeoutError,
} from '@/lib/stylist';

/**
 * Чат с AI-стилистом «Nur».
 *
 * Доступ проверяется на сервере при каждом запросе, но экран проверяет его и на входе:
 * без этого пользователь, зашедший по прямой ссылке, упёрся бы в 403 уже после отправки
 * сообщения — хуже, чем честный отказ сразу.
 */

/**
 * Убирает markdown, который модель ставит несмотря на просьбу: без рендерера
 * `**жирный**` показывался пользователю звёздочками.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)\*(?!\s)(.+?)\*(?=\s|$)/g, '$1$2')
    .replace(/^#{1,6}\s+/gm, '');
}

/** Кусок ответа: обычный текст либо группа вариантов выбора. */
type AnswerBlock = { kind: 'text'; text: string } | { kind: 'options'; options: string[] };

/**
 * Разбирает ответ на текст и варианты выбора.
 *
 * Варианты становятся кнопками НА СВОЁМ МЕСТЕ внутри текста, а не отдельным блоком
 * снизу: так это сделано в Claude и ChatGPT, и так не возникает дубля — раньше список
 * оставался в тексте и повторялся кнопками под ним.
 *
 * Что считается вариантом: подряд идущие короткие строки с тире, без двоеточий и
 * завершающей точки. Описания вещей в образе тоже начинаются с тире, но они длиннее
 * и обычно содержат пояснение — поэтому длина ограничена, а группа должна быть
 * не меньше двух и не больше восьми строк.
 */
function parseAnswer(text: string): AnswerBlock[] {
  const lines = text.split('\n');
  const blocks: AnswerBlock[] = [];
  let buffer: string[] = [];
  let options: string[] = [];

  const flushText = () => {
    const t = buffer.join('\n').trim();
    if (t) blocks.push({ kind: 'text', text: t });
    buffer = [];
  };
  const flushOptions = () => {
    // Одиночная строка с тире — это не выбор, а пункт перечисления: возвращаем в текст.
    if (options.length >= 2 && options.length <= 8) {
      blocks.push({ kind: 'options', options: [...options] });
    } else {
      buffer.push(...options.map((o) => `— ${o}`));
    }
    options = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^[—–-]\s*(.{2,40})$/);
    // Скобка почти всегда означает пометку вроде «(есть в гардеробе)» — это перечисление
    // вещей образа, а не вариант ответа. Раньше такие строки становились кнопками, и тап
    // отправлял в чат «Белая рубашка (есть)».
    const isOption =
      !!m && !m[1].includes(':') && !/[()]/.test(m[1]) && !/[.!?]$/.test(m[1]);
    if (isOption) {
      if (options.length === 0) flushText();
      options.push(m![1].trim());
      continue;
    }
    if (options.length > 0) flushOptions();
    buffer.push(raw);
  }
  if (options.length > 0) flushOptions();
  flushText();
  return blocks;
}


/**
 * Вопрос предполагает конкретную вещь («к этим брюкам», «эту блузку»)?
 *
 * <p>Тап по такому чипу без фото вёл в тупик: Nur по правилам просила прислать снимок,
 * и человек делал лишний круг. Теперь такой чип сразу открывает выбор фото, а текст
 * ложится в поле ввода — отправка одним касанием после выбора.
 */
/**
 * Какой разговор открыт — переживает перезагрузку вебвью.
 *
 * <p>Раньше после F5 открывался «активный» тред сервера — самый свежий, а не тот, где
 * человек только что был. Хранилище может быть недоступно (приватный режим, запрет
 * данных сайта), поэтому каждое обращение в try: без него чат просто откроет свежий тред.
 */
const THREAD_KEY = 'nur_thread_id';

function rememberThread(id: string | null) {
  try {
    if (id) localStorage.setItem(THREAD_KEY, id);
    else localStorage.removeItem(THREAD_KEY);
  } catch {
    // Хранилище недоступно — теряем только удобство, не данные.
  }
}

function rememberedThread(): string | null {
  try {
    return localStorage.getItem(THREAD_KEY);
  } catch {
    return null;
  }
}

function chipNeedsPhoto(text: string): boolean {
  // Три языка: на узбекском чип «Shu kiyim atrofida obraz yig'» уходил текстом без фото,
  // и Nur собирала образ вокруг вещи, которой не видела.
  return (
    /\bэт(?:а|у|о|и|ой|им|ому|ими|их)\b|скинь фото|мой образ\b/i.test(text) ||
    /\b(?:shu|bu)\s+(?:kiyim|obraz|yubka|ko[’'`ʼ]?ylak)|suratini yubor|rasm(?:ini)? yubor|mening obrazim/i.test(text) ||
    /\b(?:this|these)\s+(?:piece|item|outfit|look|dress|skirt|shirt|blouse|trousers|jeans|shoes)\b|send a .* photo|my outfit\b/i.test(text)
  );
}


/**
 * Когда был разговор — в привычном для списка чатов виде: сегодняшний показывает время,
 * вчерашний так и называется, старше — дату. Абсолютная дата у каждого разговора
 * позволяет отличить два похожих начала друг от друга.
 */
function threadStamp(iso: string | null, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const loc = locale === 'uz' ? 'uz-UZ' : locale === 'en' ? 'en-US' : 'ru-RU';
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days === 0) return time;
  if (days === 1) return `${YESTERDAY[loc] ?? 'вчера'}, ${time}`;
  return `${d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })}, ${time}`;
}

const YESTERDAY: Record<string, string> = {
  'ru-RU': 'вчера',
  'uz-UZ': 'kecha',
  'en-US': 'yesterday',
};

export default function StylistPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { locale } = useI18n();
  const S = getStylistStrings(locale);
  // Один перевод кода ошибки на оба пути отправки: путь с фото показывал общее
  // «не получилось» даже на нехватку монет и перегрузку. StylistHttpError несёт тело
  // ответа в response.data — так же, как axios, поэтому разбор общий.
  const errorText = (e: unknown): string => {
    if (e instanceof StylistTimeoutError || (e as { code?: string })?.code === 'ECONNABORTED') {
      return S.errorTimeout;
    }
    const data = (e as { response?: { data?: { code?: string; error?: { code?: string } } } })
      ?.response?.data;
    const code = data?.error?.code ?? data?.code;
    if (code === 'INSUFFICIENT_COINS') return S.errorCoins;
    if (code === 'STYLIST_BUSY') return S.errorBusy;
    if (code === 'STYLIST_CONTENT_FILTERED') return S.errorFiltered;
    return S.errorGeneric;
  };
  const dark = theme === 'dark';

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [beta, setBeta] = useState(false);

  const [threadId, setThreadId] = useState<string | null>(null);
  // Локальные поля поверх серверного типа: превью прикреплённых фото живёт только
  // на клиенте (сервер отдаёт ключи, а не картинки), follow-up приходит с ответом.
  type ChatMessage = StylistMessage & {
    previews?: string[];
    followups?: string[];
    constraints?: string | null;
    /** Nur ждёт фото или выбор вещи: пока ждёт, подсказки с другими темами прячем. */
    awaitingItem?: boolean;
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  /** Отказ сохранения по конкретной карточке: показывается под её кнопкой. */
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  /** Какое из показанных фото человек выбрал для слота: ключ «сообщение-образ-слот». */
  const [pickedRef, setPickedRef] = useState<Record<string, string>>({});
  /** Слоты, вещь для которых сейчас скачивается и обрабатывается. */
  const [importingSlot, setImportingSlot] = useState<Record<string, boolean>>({});
  const [importErrors, setImportErrors] = useState<Record<string, string>>({});
  /** Картинка, открытая на весь экран: превью 44×44 не разглядеть. */
  const [zoomed, setZoomed] = useState<string | null>(null);
  /** Знакомство с Nur вместо пустого чата при первом заходе. null — ещё не решили. */
  const [needsIntro, setNeedsIntro] = useState<boolean | null>(null);

  // Оценки: id сообщения → вердикт. Тоже локально — чтобы не тянуть историю
  // после каждого тапа и не дать оценить дважды.
  const [rated, setRated] = useState<Record<string, 'UP' | 'DOWN'>>({});
  const [reasonFor, setReasonFor] = useState<string | null>(null);

  // Панель разговоров: список грузим только когда открыли — на входе в чат он не нужен.
  const [showThreads, setShowThreads] = useState(false);
  const [threads, setThreads] = useState<StylistThread[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [refundNote, setRefundNote] = useState<Record<string, string>>({});
  /** Подсказки после 👎: тап превращает оценку в запрет, а не оставляет её в статистике. */
  const [refusalHints, setRefusalHints] = useState<Record<string, string[]>>({});

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // ── Режим вкладки ────────────────────────────────────────────────────────
  // Эта страница — вкладка «Nur» нижнего бара нового приложения (/stylist?nav=tab):
  // стрелки «назад» нет (она увела бы вебвью вкладки на /closet), системный Back
  // перехватывается, чтобы оболочка переключила вкладку, а не вышла из вебвью, и
  // экрану «недоступно» некуда возвращаться. Флаг живёт в sessionStorage вебвью,
  // поэтому переход в /stylist/profile и обратно его не теряет.
  const [tabMode, setTabMode] = useState(false);
  useEffect(() => { setTabMode(isShellTab()); }, []);
  useRootBackGuard(tabMode);
  // Оверлеи закрываются системным Back вместо переключения вкладки.
  useOverlayBackClose(showThreads, () => setShowThreads(false));
  useOverlayBackClose(zoomed !== null, () => setZoomed(null));

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

      // isShellTab() напрямую: state из эффекта выше это замыкание ещё не видит.
      logAnalyticsEvent(Events.STYLIST_CHAT_OPENED, {
        [Params.SOURCE]: isShellTab() ? 'nav_tab' : 'closet_fab',
      });
      let hasHistory = false;
      try {
        // Сначала тот разговор, где человек был; серверный «активный» — только если
        // своего нет или он удалён с другого устройства.
        let id: string | null = rememberedThread();
        let history: Awaited<ReturnType<typeof fetchStylistHistory>> | null = null;
        if (id) {
          try {
            history = await fetchStylistHistory(id);
          } catch {
            id = null;
          }
        }
        if (!id) {
          id = await fetchStylistThread();
          history = await fetchStylistHistory(id);
        }
        if (cancelled) return;
        setThreadId(id);
        if (!cancelled) setMessages(history ?? []);
        hasHistory = (history ?? []).length > 0;
      } catch {
        // История не критична: пустой тред — рабочее состояние, чат откроется чистым.
      }

      // Знакомство — только тем, кто ещё ничего о себе не рассказал. Переписка или
      // заполненный профиль означают, что человек уже здесь был: показывать ему
      // приветствие заново — назойливость.
      if (cancelled) return;
      if (hasHistory) {
        setNeedsIntro(false);
        return;
      }
      try {
        const profile = await fetchStyleProfile();
        if (!cancelled) setNeedsIntro(profile.completeness === 0);
      } catch {
        if (!cancelled) setNeedsIntro(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  /** Открывает панель и подтягивает список разговоров. */
  const openThreads = useCallback(async () => {
    setShowThreads(true);
    setConfirmClear(false);
    try {
      setThreads(await fetchStylistThreads());
    } catch {
      setThreads([]);
    }
  }, []);

  /** Переключиться на существующий разговор. */
  const openThread = useCallback(async (id: string) => {
    setShowThreads(false);
    setThreadId(id);
    setMessages([]);
    try {
      setMessages(await fetchStylistHistory(id));
    } catch {
      /* пустой разговор — рабочее состояние */
    }
  }, []);

  /** Новый разговор. Старые остаются: к прежней теме можно вернуться. */
  const newThread = useCallback(async () => {
    try {
      const id = await startStylistThread();
      setThreadId(id);
      setMessages([]);
      setShowThreads(false);
    } catch {
      setError(S.errorGeneric);
    }
  }, [S]);

  // Открытый разговор переживает перезагрузку. Пустое значение не пишем: эффект
  // срабатывает и на первом рендере, когда тред ещё не загружен, и стёр бы
  // запомненный раньше, чем его успеют прочитать.
  useEffect(() => {
    if (threadId) rememberThread(threadId);
  }, [threadId]);

  /**
   * Тред для отправки. Пустой threadId значит «новый разговор» — и его надо создать.
   *
   * <p>Раньше пустой уходил на сервер как есть, а сервер без threadId берёт самый
   * свежий тред пользователя. После удаления открытого чата следующее сообщение падало
   * в чужой, давно закрытый разговор — вместе с его историей в контексте модели.
   */
  const ensureThread = useCallback(async (): Promise<string | undefined> => {
    if (threadId) return threadId;
    try {
      const id = await startStylistThread();
      setThreadId(id);
      return id;
    } catch {
      // Не создался — отправляем без треда: сервер откроет свой, как было раньше.
      return undefined;
    }
  }, [threadId]);

  const removeThread = useCallback(
    async (id: string) => {
      try {
        await deleteStylistThread(id);
        setThreads((prev) => prev.filter((t) => t.id !== id));
        // Удалили тот, что открыт — показываем пустой чат, а не чужую переписку.
        if (id === threadId) {
          setThreadId(null);
          rememberThread(null);
          setMessages([]);
        }
      } catch {
        setError(S.errorGeneric);
      }
    },
    [threadId, S],
  );

  const clearAll = useCallback(async () => {
    try {
      await clearStylistHistory();
      setThreads([]);
      setThreadId(null);
      rememberThread(null);
      setMessages([]);
      setConfirmClear(false);
      setShowThreads(false);
    } catch {
      setError(S.errorGeneric);
    }
  }, [S]);

  /**
   * Забрать выбранный пример из интернета в гардероб.
   *
   * <p>Раньше эти позиции нельзя было ни выбрать, ни сохранить: доска состоит из вещей
   * пользователя, и каталожный слот при сохранении просто исчезал. Теперь фото скачивается
   * к нам, проходит обычную обработку вещи и встаёт в тот же слот — образ сохраняется целиком.
   *
   * <p>Ждём готовности здесь, а не после нажатия «Сохранить образ»: доска не примет вещь,
   * пока пайплайн не закончил, и человек получил бы отказ на ровном месте.
   */
  const takeReference = useCallback(
    async (messageId: string, outfitIndex: number, slotIndex: number, imageUrl: string) => {
      const key = `${messageId}-${outfitIndex}-${slotIndex}`;
      setImportingSlot((prev) => ({ ...prev, [key]: true }));
      setImportErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      try {
        const { uploadJobId } = await importStylistReference(messageId, outfitIndex, slotIndex, imageUrl);
        const ready = await waitForItemReady(uploadJobId);
        if (!ready) {
          setImportErrors((prev) => ({ ...prev, [key]: S.itemAddFailed }));
          return false;
        }
        // Слот перерисовываем сами: история не перезапрашивается, а метка «есть у тебя»
        // должна появиться сразу — иначе выглядит, будто ничего не произошло.
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId || !m.outfits) return m;
            return {
              ...m,
              outfits: m.outfits.map((o, oi) =>
                oi !== outfitIndex
                  ? o
                  : {
                      ...o,
                      slots: o.slots.map((sl, si) =>
                        si !== slotIndex ? sl : { ...sl, source: 'WARDROBE' as const, imageUrl },
                      ),
                    },
              ),
            };
          }),
        );
        return true;
      } catch (e: unknown) {
        const data = (e as { response?: { data?: { code?: string; error?: { code?: string } } } })
          ?.response?.data;
        const code = data?.error?.code ?? data?.code;
        setImportErrors((prev) => ({
          ...prev,
          [key]: code === 'QUOTA_EXCEEDED' ? S.itemQuotaFull : S.itemAddFailed,
        }));
        return false;
      } finally {
        setImportingSlot((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [S],
  );

  /**
   * Сохранить образ в гардероб. После успеха кнопка меняется на переход к доскам —
   * там образ живёт как обычный и оттуда же запускается примерка.
   */
  /** Текст отказа по коду бэкенда: каждый барьер канваса чинится по-своему. */
  const saveErrorText = useCallback(
    (code?: string) => {
      if (code === 'OUTFIT_HAS_NO_WARDROBE_ITEMS') return S.errorNoWardrobeItems;
      if (code === 'INVALID_OUTFIT_COMPOSITION') return S.errorOutfitNeedsClothing;
      if (code === 'WARDROBE_ITEM_NOT_READY') return S.errorItemNotReady;
      return S.errorSaveOutfit;
    },
    [S],
  );

  const saveOutfit = useCallback(
    async (messageId: string, index: number, outfit: StylistOutfitCard) => {
      const key = `${messageId}-${index}`;
      setSavingOutfit(key);
      setSaveErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      try {
        // Интернет-позиции доска не принимает — она состоит из вещей человека. Раньше
        // это кончалось отказом «в образе нет твоих вещей», и человек оставался с
        // подсказкой про кнопку, которую ещё надо найти. Теперь такие вещи забираем
        // сами: одна кнопка «Сохранить образ» делает всё, что нужно.
        const missing = outfit.slots
          .map((sl, si) => ({ sl, si }))
          .filter(({ sl }) => sl.source === 'CATALOG' && (sl.references?.length ?? 0) > 0);

        for (const { sl, si } of missing) {
          const chosen = pickedRef[`${messageId}-${index}-${si}`] || sl.references?.[0]?.thumbnailUrl;
          if (!chosen) continue;
          const ok = await takeReference(messageId, index, si, chosen);
          // Одна не добралась — не повод терять остальные: сохраняем что получилось.
          if (!ok) break;
        }

        const canvasId = await saveStylistOutfit(messageId, index, outfit.title);
        setSavedOutfits((prev) => ({ ...prev, [key]: canvasId }));
        logAnalyticsEvent(Events.STYLIST_OUTFIT_SAVED, { [Params.SOURCE]: 'chat' });
      } catch (e: unknown) {
        // Бэкенд заворачивает ошибку в {"error":{"code":...}} — чтение data.code
        // всегда давало undefined, и вместо причины показывался общий текст.
        const data = (e as { response?: { data?: { code?: string; error?: { code?: string } } } })
          ?.response?.data;
        const code = data?.error?.code ?? data?.code;
        // Ошибку кладём к самой карточке: общий баннер печатался в конце ленты, куда
        // после нажатия никто не смотрит, и отказ выглядел как «кнопка не работает».
        setSaveErrors((prev) => ({ ...prev, [key]: saveErrorText(code) }));
      } finally {
        setSavingOutfit(null);
      }
    },
    [saveErrorText, takeReference, pickedRef],
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
      if (res.refusalHints && res.refusalHints.length > 0) {
        setRefusalHints((prev) => ({ ...prev, [messageId]: res.refusalHints as string[] }));
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
      const previews = attachments.map((a) => a.preview);
      setAttachments([]);

      // Оптимистично показываем свою реплику: ждать ответа модели молча — плохой UX.
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'USER',
        action: null,
        content: body,
        previews,
        coinsSpent: 0,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      logAnalyticsEvent(Events.STYLIST_MESSAGE_SENT, { [Params.HAS_PHOTO]: keys.length > 0 });

      // Черновик потокового ответа: пока идут куски, сообщение живёт под этим id
      // и переписывается на месте, а по «done» заменяется финальной версией.
      const streamId = `stream-${Date.now()}`;

      try {
        const tid = await ensureThread();
        let answer: StylistAnswer;
        // Поток пробуем только для текста: у сборки образа и списка покупок ответ —
        // структура, её нечем показывать по кускам, и бэкенд отвечает на такое 409.
        if (keys.length === 0 && body) {
          try {
            let acc = '';
            answer = await streamStylistMessage(
              { text: body, locale, threadId: tid },
              (piece) => {
                acc += piece;
                setMessages((prev) => {
                  const next = [...prev];
                  const at = next.findIndex((m) => m.id === streamId);
                  const draftMsg: ChatMessage = {
                    id: streamId,
                    role: 'ASSISTANT',
                    action: null,
                    content: acc,
                    coinsSpent: 0,
                    createdAt: new Date().toISOString(),
                  };
                  if (at === -1) next.push(draftMsg);
                  else next[at] = draftMsg;
                  return next;
                });
              },
            );
            // Черновик убираем: ниже добавится финальное сообщение с настоящим id,
            // оценкой и follow-up. Оставить оба — значит показать ответ дважды.
            setMessages((prev) => prev.filter((m) => m.id !== streamId));
          } catch (streamError) {
            setMessages((prev) => prev.filter((m) => m.id !== streamId));
            if (!(streamError instanceof StreamUnsupportedError)) throw streamError;
            answer = await sendStylistMessage({ text: body, locale, threadId: tid });
          }
        } else {
          answer = await sendStylistMessage({
            // Ни текста, ни действия за пользователя не подставляем. Раньше любое фото без
            // подписи объявлялось сборкой образа — и фото в полный рост уходило в сценарий
            // «собери образ вокруг этой вещи». Что на снимке, разбирает бэкенд.
            text: body || undefined,
            imageKeys: keys.length > 0 ? keys : undefined,
            // Nur обязана отвечать на языке приложения: узбекоязычному пользователю
            // русский ответ бесполезен.
            locale,
            threadId: tid,
          });
        }
        setThreadId(answer.threadId);
        setMessages((prev) => [
          ...prev,
          {
            id: answer.messageId,
            role: 'ASSISTANT',
            action: null,
            content: answer.answer ?? '',
            outfits: answer.outfits ?? [],
            shopping: answer.shopping ?? [],
            followups: answer.followups ?? [],
            constraints: answer.constraints ?? null,
            awaitingItem: answer.awaitingItem ?? false,
            coinsSpent: answer.coinsSpent,
            createdAt: new Date().toISOString(),
          },
        ]);
        logAnalyticsEvent(Events.STYLIST_ANSWER_SHOWN, { [Params.SOURCE]: answer.chargedSource });
      } catch (e: unknown) {
        // На сервере реплики нет: при сбое генерации транзакция откатывается целиком,
        // чтобы в истории не оседали вопросы без ответов. Единственная копия написанного —
        // у нас, поэтому возвращаем её в поле ввода вместе с фото: одно нажатие — и
        // повтор. Раньше поле очищалось до отправки, и текст приходилось набирать заново.
        setError(errorText(e));
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(body);
        setAttachments(keys.map((key, i) => ({ key, preview: previews[i] })));
      } finally {
        setSending(false);
      }
    },
    [sending, attachments, locale, S, ensureThread],
  );

  /**
   * Отправить фото, полученное в знакомстве.
   *
   * <p>Отдельный путь, а не `send`: тот берёт снимки из `attachments`, а здесь ключ уже
   * загружен на предыдущем экране. Текста нет намеренно — сценарий бэкенд определяет
   * по самому снимку.
   */
  const sendWithPhoto = useCallback(
    async (key: string) => {
      setSending(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: 'USER',
          action: null,
          content: '',
          coinsSpent: 0,
          createdAt: new Date().toISOString(),
        },
      ]);
      try {
        const tid = await ensureThread();
        const answer = await sendStylistMessage({ imageKeys: [key], locale, threadId: tid });
        setThreadId(answer.threadId);
        setMessages((prev) => [
          ...prev,
          {
            id: answer.messageId,
            role: 'ASSISTANT',
            action: null,
            content: answer.answer ?? '',
            outfits: answer.outfits ?? [],
            shopping: answer.shopping ?? [],
            followups: answer.followups ?? [],
            constraints: answer.constraints ?? null,
            awaitingItem: answer.awaitingItem ?? false,
            coinsSpent: answer.coinsSpent,
            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (e: unknown) {
        setError(errorText(e));
      } finally {
        setSending(false);
      }
    },
    [locale, S, ensureThread],
  );

  const { bg, ink, muted, card, line, accent, accentWash, accentInk, accentGradient } =
    stylistTheme(dark);
  // Send is the page's primary action, so it carries the pink the app gives
  // every primary action; greyed out while there is nothing to send.
  const canSend =
    (draft.trim().length > 0 || attachments.length > 0) && !sending && !uploading;

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: bg }}>
        <Loader2 size={22} className="animate-spin" style={{ color: muted }} />
      </div>
    );
  }

  // Знакомство идёт до чата: без него человек попадает в пустое поле ввода и
  // разговаривает с ассистентом, который о нём ничего не знает.
  if (allowed && needsIntro) {
    return (
      <NurOnboarding
        S={S}
        dark={dark}
        onFinish={(photoKey) => {
          setNeedsIntro(false);
          // Фото уходит первым сообщением: разбирает его тот же путь, что и обычно,
          // и ответ Nur сразу оказывается персональным.
          if (photoKey) sendWithPhoto(photoKey);
        }}
      />
    );
  }

  if (!allowed) {
    // «Скоро»: вкладка Nur видна всем, а сервер открыл стилиста не каждому —
    // экран должен выглядеть как анонс, а не как ошибка. В режиме вкладки
    // возвращаться некуда, поэтому кнопки нет.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center" style={{ background: bg }}>
        {/* Same pink gradient tile the closet uses for its AI moments, so the
            announcement reads as part of the app rather than a stray screen. */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: accentGradient, boxShadow: '0 8px 24px rgba(243,112,167,0.28)' }}
        >
          <NurMark size={30} color="#fff" />
        </div>
        <span
          className="mt-4 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{ background: accentWash, color: accentInk, letterSpacing: '0.5px' }}
        >
          {S.comingSoon}
        </span>
        <p className="mt-3 text-[17px] font-bold" style={{ color: ink }}>
          {S.unavailableTitle}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: muted }}>
          {S.unavailableText}
        </p>
        {!tabMode && (
          <button
            onClick={() => router.push('/closet')}
            className="mt-6 px-5 h-10 rounded-full text-[13px] font-bold"
            style={{ background: ink, color: bg }}
          >
            {S.goBack}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: bg }}>
      {/* Шапка. Та же форма, что у Гардероба / Ленты / Маркета: без рамки и
          подложки, крупный заголовок слева, голые иконки справа. Sticky —
          лента уезжает под неё, фон непрозрачный. */}
      <header
        className="sticky top-0 z-10 flex items-center gap-2.5 px-4 pb-2"
        style={{ background: bg, paddingTop: 'calc(12px + var(--safe-top))' }}
      >
        {/* push, а не back(): внутри WebView история может быть пустой — тогда back()
            молча ничего не делает, и кнопка выглядит сломанной. Во вкладке стрелки
            нет: она увела бы вебвью вкладки Nur на гардероб. */}
        {!tabMode && (
          <button
            onClick={() => router.push('/closet')}
            aria-label={S.goBack}
            className="shrink-0 active:opacity-60 transition-opacity"
          >
            <ArrowLeft size={22} style={{ color: ink }} />
          </button>
        )}
        <div className="flex items-baseline gap-2 min-w-0">
          <h1
            className="text-[26px] font-bold tracking-[-0.5px] truncate"
            style={{ color: ink }}
          >
            {S.title}
          </h1>
          {beta && (
            <span
              className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
              style={{ background: accentWash, color: accentInk, letterSpacing: '0.5px' }}
            >
              {S.beta}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={newThread}
            aria-label={S.newChat}
            title={S.newChat}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center active:opacity-60 transition-opacity"
            style={{ color: ink }}
          >
            <MessageSquarePlus size={22} strokeWidth={1.9} />
          </button>
          <button
            onClick={openThreads}
            aria-label={S.chatList}
            title={S.chatList}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center active:opacity-60 transition-opacity"
            style={{ color: ink }}
          >
            <History size={22} strokeWidth={1.9} />
          </button>
          {/* Вход в профиль — по ТЗ 3.4 он живёт в шапке чата: онбординга нет, и это
              единственное место, где видно, что Nur о тебе знает. */}
          <button
            onClick={() => router.push('/stylist/profile')}
            aria-label={S.profileTitle}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center active:opacity-60 transition-opacity"
            style={{ color: ink }}
          >
            <UserRound size={22} strokeWidth={1.9} />
          </button>
        </div>
      </header>

      {/* Панель разговоров. Оверлеем, а не отдельной страницей: переключение между
          темами — короткое действие, ради него уходить с экрана чата незачем. */}
      {showThreads && (
        <div className="fixed inset-0 z-30 flex flex-col" style={{ background: bg }}>
          <div
            className="flex items-center gap-3 px-4 h-14 shrink-0"
            style={{ borderBottom: `1px solid ${line}` }}
          >
            <button onClick={() => setShowThreads(false)} aria-label={S.goBack}>
              <ArrowLeft size={22} style={{ color: ink }} />
            </button>
            <span className="text-[20px] font-bold tracking-[-0.3px]" style={{ color: ink }}>
              {S.chatList}
            </span>
            <button
              onClick={newThread}
              className="ml-auto flex items-center gap-1.5 px-3 h-8 rounded-full text-[13px] font-bold"
              style={{ background: ink, color: bg }}
            >
              <MessageSquarePlus size={14} />
              {S.newChat}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {threads.length === 0 && (
              <p className="text-[14px]" style={{ color: muted }}>
                {S.noChats}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {threads.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{
                    background: t.id === threadId ? card : 'transparent',
                    border: `1px solid ${line}`,
                  }}
                >
                  <button onClick={() => openThread(t.id)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline gap-2">
                      <p className="text-[14px] font-semibold truncate flex-1" style={{ color: ink }}>
                        {t.title ?? S.emptyChat}
                      </p>
                      <span
                        className="text-[11px] shrink-0 tabular-nums"
                        style={{ color: muted }}
                        title={t.lastMessageAt ?? t.createdAt}
                      >
                        {threadStamp(t.lastMessageAt ?? t.createdAt, locale)}
                      </span>
                    </div>
                    {t.preview && (
                      <p className="text-[12px] truncate mt-0.5" style={{ color: muted }}>
                        {t.preview}
                      </p>
                    )}
                  </button>
                  <button
                    onClick={() => removeThread(t.id)}
                    aria-label={S.deleteChat}
                    className="shrink-0 p-2 rounded-full"
                    style={{ color: muted }}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Очистка — внизу и с подтверждением: действие необратимое. */}
          <div className="px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${line}` }}>
            {confirmClear ? (
              <div className="flex flex-col gap-2">
                <p className="text-[13px]" style={{ color: ink }}>
                  {S.clearHistoryConfirm}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={clearAll}
                    className="flex-1 h-10 rounded-full text-[13px] font-bold"
                    style={{ background: '#8B1A1A', color: '#fff' }}
                  >
                    {S.clearHistory}
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 h-10 rounded-full text-[13px] font-bold"
                    style={{ background: card, color: ink, border: `1px solid ${line}` }}
                  >
                    {S.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={threads.length === 0}
                className="flex items-center gap-2 text-[13px] disabled:opacity-40"
                style={{ color: '#8B1A1A' }}
              >
                <Trash2 size={14} />
                {S.clearHistory}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Лента */}
      <main className="flex-1 px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="mt-4">
            <p className="text-[17px] font-bold tracking-[-0.2px]" style={{ color: ink }}>
              {S.greeting}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: muted }}>
              {S.greetingHint}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {S.starters.map((chip, chipIndex) => (
                <button
                  key={chip}
                  onClick={() => {
                    // Номер, а не текст: текст чипа на трёх языках разный, и одна
                    // подсказка распадалась в дашборде на три строки.
                    logAnalyticsEvent(Events.STYLIST_STARTER_CHIP_TAPPED, {
                      [Params.SOURCE]: `starter_${chipIndex}`,
                    });
                    if (chipNeedsPhoto(chip)) {
                      setDraft(chip);
                      fileRef.current?.click();
                    } else {
                      send(chip);
                    }
                  }}
                  className="text-left px-4 py-3.5 rounded-2xl text-[14px] font-medium active:scale-[0.99] transition-transform"
                  style={{ background: card, color: ink }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'USER' ? 'self-end' : 'self-start'} max-w-[85%]`}>
            {/* Прикреплённые фото показываем в самом сообщении: раньше вместо снимка
                стояла подпись «📷 Фото», и человек не видел, что именно отправил. */}
            {/* Локальное превью живёт только до ответа; после перезахода снимок приходит
                из истории подписанной ссылкой — иначе переписка теряет то, что человек
                прислал, и разговор перестаёт читаться. */}
            {(m.previews ?? m.attachments ?? []).length > 0 && (
              <div className="flex gap-2 mb-1.5 self-end">
                {(m.previews ?? m.attachments ?? []).map((src) => (
                  <button key={src} onClick={() => setZoomed(src)} aria-label="Открыть фото">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt="Отправленное фото"
                      className="w-28 h-36 rounded-2xl object-cover"
                      style={{ border: `1px solid ${line}` }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Текст показываем, только когда карточек нет: при сборке образа
                вся информация уже в них, и абзац рядом был бы дублем. */}
            {(!m.outfits || m.outfits.length === 0) &&
              (!m.shopping || m.shopping.length === 0) &&
              m.content && (
              <div
                className="px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed"
                style={
                  m.role === 'USER'
                    ? { background: ink, color: bg }
                    : { background: card, color: ink, border: `1px solid ${line}` }
                }
              >
                {m.role === 'USER' ? (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                ) : (
                  parseAnswer(stripMarkdown(m.content)).map((block, bi) =>
                    block.kind === 'text' ? (
                      <p key={bi} className="whitespace-pre-wrap">
                        {block.text}
                      </p>
                    ) : (
                      // Варианты — кнопками прямо в тексте, на своём месте.
                      <div key={bi} className="flex flex-col gap-1.5 my-2">
                        {block.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => send(opt)}
                            disabled={sending}
                            className="text-left px-3.5 py-2 rounded-xl text-[14px] font-medium active:scale-[0.99] transition-transform disabled:opacity-50"
                            style={{ background: bg, color: ink, border: `1px solid ${line}` }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ),
                  )
                )}
              </div>
            )}

            {/* Follow-up чипы только под ПОСЛЕДНИМ ответом и только если разговор
                действительно закончен. Под «жду фото юбки» они звали в другие темы —
                человек ещё не сделал начатое, а ему уже предлагают три новых вопроса.
                Под карточками их тоже нет: там своё действие — «Сохранить образ». */}
            {m.role === 'ASSISTANT' &&
              m.id === messages[messages.length - 1]?.id &&
              !m.awaitingItem &&
              (!m.outfits || m.outfits.length === 0) &&
              (!m.shopping || m.shopping.length === 0) &&
              parseAnswer(stripMarkdown(m.content ?? '')).every((b) => b.kind === 'text') &&
              m.followups &&
              m.followups.length > 0 &&
              !sending && (
              <div className="flex flex-wrap gap-2 mt-2">
                {m.followups.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      if (chipNeedsPhoto(f)) {
                        setDraft(f);
                        fileRef.current?.click();
                      } else {
                        send(f);
                      }
                    }}
                    className="px-3.5 py-2 rounded-full text-[13px] active:scale-[0.97] transition-transform"
                    style={{ background: card, color: ink, border: `1px solid ${line}` }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Список покупок: карточки с фото вместо шести абзацев «купи брюки». */}
            {m.shopping && m.shopping.length > 0 && (
              <div
                className="mb-2 rounded-2xl overflow-hidden"
                style={{ background: card, border: `1px solid ${line}` }}
              >
                <div className="px-4 pt-3 pb-2">
                  <p className="text-[15px] font-semibold" style={{ color: ink }}>
                    {S.shoppingTitle}
                  </p>
                </div>
                {m.shopping.map((item, ii) => (
                  <div key={ii} style={{ borderTop: `1px solid ${line}` }}>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold leading-snug" style={{ color: ink }}>
                          {ii + 1}. {item.title}
                        </p>
                        {item.why && (
                          <p className="text-[12px] leading-snug mt-0.5" style={{ color: muted }}>
                            {item.why}
                          </p>
                        )}
                      </div>
                    </div>
                    {item.references && item.references.length > 0 && (
                      <div className="px-4 pb-3">
                        <div className="flex gap-2 overflow-x-auto">
                          {item.references.map((img) => (
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
                                alt={item.title}
                                className="w-24 h-32 rounded-lg object-cover"
                                style={{ background: bg, border: `1px solid ${line}` }}
                                onError={(e) => {
                                  const a = e.currentTarget.closest('a');
                                  if (a) a.style.display = 'none';
                                }}
                              />
                              <span
                                className="block mt-1 text-[9px] leading-tight truncate"
                                style={{ color: muted }}
                              >
                                {img.creator ?? img.provider ?? ''}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Что учтено из отказов. Без этой строки запрет молча убирал вещи
                из образов, и человек видел меньше своего гардероба без объяснений. */}
            {m.constraints && m.outfits && m.outfits.length > 0 && (
              <button
                onClick={() => router.push('/stylist/profile')}
                className="self-start mb-2 px-3 py-1.5 rounded-full text-[11px] text-left active:scale-[0.98] transition-transform"
                style={{ background: card, color: muted, border: `1px solid ${line}` }}
              >
                {S.constraintsApplied(m.constraints)}
              </button>
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
                  {outfit.slots.map((slot, si) => {
                    // Примеры видны сразу: раньше они прятались за тапом по «подобрать»,
                    // и о них никто не догадывался — кнопка выглядела неработающей.
                    const hasRefs = !!slot.references && slot.references.length > 0;
                    const slotKey = `${m.id}-${idx}-${si}`;
                    const picked = pickedRef[slotKey];
                    const busy = !!importingSlot[slotKey];
                    return (
                    <div key={si} style={{ borderTop: `1px solid ${line}` }}>
                      <div className="flex items-center gap-3 px-4 py-2">
                      {slot.imageUrl ? (
                        // Превью 44×44 вещь не показывает — по тапу открываем целиком.
                        <button
                          onClick={() => setZoomed(slot.imageUrl)}
                          className="shrink-0"
                          aria-label={`Посмотреть: ${slot.description}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slot.imageUrl}
                            alt={slot.description}
                            className="w-11 h-11 rounded-lg object-cover"
                            style={{ background: bg }}
                          />
                        </button>
                      ) : (
                        <div
                          className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center text-[16px]"
                          style={{ background: bg, border: `1px dashed ${line}` }}
                        >
                          {slot.source === 'ATTACHED' ? '📷' : '🔵'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[10px] font-bold uppercase"
                          style={{ color: muted, letterSpacing: '0.5px' }}
                        >
                          {S.slotLabels[slot.role] ?? slot.role}
                        </p>
                        <p className="text-[13px] leading-snug" style={{ color: ink }}>
                          {slot.description}
                        </p>
                      </div>
                      {slot.source === 'WARDROBE' && (
                        <span className="text-[11px] font-semibold shrink-0" style={{ color: '#2D6A4F' }}>
                          {S.inWardrobe}
                        </span>
                      )}
                      {/* Присланную вещь не предлагаем искать: человек только что её показал,
                          и кнопка «подобрать» здесь читалась бы как «купи своё». */}
                      {slot.source === 'ATTACHED' && (
                        <span className="text-[11px] font-semibold shrink-0" style={{ color: muted }}>
                          {S.yourItem}
                        </span>
                      )}
                      {/* У каталожного слота метки нет намеренно: примеры под ним уже
                          показывают вещь, а кнопка вела в каталог, который к описанию
                          стилиста почти ничего не находит — путь в никуда. */}
                      </div>

                      {hasRefs && (
                        <div className="px-4 pb-3">
                          {/* Референсы из открытых источников. Это не рекомендация: на снимке
                              другой человек. Атрибуция обязательна по лицензии CC — автор,
                              лицензия и ссылка на оригинал видны и кликабельны. */}
                          <p
                            className="text-[10px] font-bold uppercase mb-2"
                            style={{ color: muted, letterSpacing: '0.5px' }}
                          >
                            {S.howWorn}
                          </p>
                          <div className="flex gap-2 overflow-x-auto">
                                {(slot.references ?? []).map((img) => (
                                  // Тап выбирает фото, а не уводит на сайт: выбранное можно
                                  // забрать в гардероб, и тогда образ сохранится целиком.
                                  // Ссылка на источник осталась отдельной строкой ниже.
                                  <div
                                    key={img.thumbnailUrl}
                                    className="shrink-0 w-24"
                                    // Битая миниатюра прячется целиком: рамка с alt-текстом
                                    // выглядит хуже, чем на одну картинку меньше.
                                  >
                                    <button
                                      onClick={() =>
                                        setPickedRef((prev) => ({
                                          ...prev,
                                          [slotKey]: prev[slotKey] === img.thumbnailUrl ? '' : img.thumbnailUrl,
                                        }))
                                      }
                                      disabled={busy}
                                      className="block w-full"
                                      aria-pressed={picked === img.thumbnailUrl}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={img.thumbnailUrl}
                                        alt={`Референс, автор ${img.creator ?? 'неизвестен'}`}
                                        className="w-24 h-32 rounded-lg object-cover"
                                        style={{
                                          background: bg,
                                          border:
                                            picked === img.thumbnailUrl
                                              ? `2px solid ${ink}`
                                              : `1px solid ${line}`,
                                        }}
                                        onError={(e) => {
                                          const box = e.currentTarget.closest('div');
                                          if (box) box.style.display = 'none';
                                        }}
                                      />
                                    </button>
                                    <a
                                      href={img.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block mt-1 text-[9px] leading-tight underline"
                                      style={{ color: muted }}
                                    >
                                      {/* Веб-картинка подписывается источником: у поисковой
                                          выдачи нет лицензии, есть сайт, откуда фото. */}
                                      {img.license === 'web'
                                        ? img.creator ?? S.openSource
                                        : `${img.creator ?? 'неизвестный автор'} · ${img.license.toUpperCase()}`}
                                    </a>
                                  </div>
                                ))}
                          </div>

                          {/* Кнопка видна сразу. Раньше она появлялась только после тапа
                              по фото, и человек читал подсказку «выбери фото и нажми
                              „Взять эту вещь“», не видя никакой кнопки. Без выбора берём
                              первое фото — оно же первое и по релевантности. */}
                          <button
                              onClick={() =>
                                takeReference(
                                  m.id,
                                  idx,
                                  si,
                                  picked || (slot.references ?? [])[0]?.thumbnailUrl || '',
                                )
                              }
                              disabled={busy}
                              className="mt-2 w-full h-9 rounded-full text-[13px] font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
                              style={{ background: ink, color: bg }}
                            >
                              {busy ? S.addingItem : S.takeThisItem}
                          </button>
                          {importErrors[slotKey] && (
                            <p className="mt-1.5 text-[12px] leading-snug" style={{ color: '#B4443C' }}>
                              {importErrors[slotKey]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>

                {outfit.why && (
                  <p className="px-4 py-2.5 text-[12px] leading-snug" style={{ color: muted, borderTop: `1px solid ${line}` }}>
                    {outfit.why}
                  </p>
                )}

                <div className="px-4 py-3" style={{ borderTop: `1px solid ${line}` }}>
                  {/* Доска состоит из вещей гардероба: чужое фото с сайта в неё не положить,
                      это ссылка на чужой ресурс, а не наш файл. Раньше такие позиции просто
                      исчезали при сохранении, и образ на доске оказывался неполным. */}
                  {outfit.slots.some((sl) => sl.source === 'CATALOG') && (
                    <p className="mb-2 text-[12px] leading-snug" style={{ color: muted }}>
                      {S.savePartial(outfit.slots.filter((sl) => sl.source === 'CATALOG').length)}
                    </p>
                  )}
                  {savedOutfits[`${m.id}-${idx}`] ? (
                    <button
                      onClick={() => router.push('/closet?tab=boards')}
                      className="w-full h-9 rounded-full text-[13px] font-bold active:scale-[0.98] transition-transform"
                      style={{ background: '#2D6A4F', color: '#fff' }}
                    >
                      {S.openInCloset}
                    </button>
                  ) : (
                    <button
                      onClick={() => saveOutfit(m.id, idx, outfit)}
                      disabled={savingOutfit === `${m.id}-${idx}`}
                      className="w-full h-9 rounded-full text-[13px] font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                      style={{ background: ink, color: bg }}
                    >
                      {savingOutfit === `${m.id}-${idx}`
                        ? // Добор вещей из интернета занимает секунды — говорим, что
                          // именно происходит, иначе «Сохраняю…» выглядит зависшим.
                          Object.keys(importingSlot).some((k) => k.startsWith(`${m.id}-${idx}-`))
                          ? S.addingItem
                          : S.saving
                        : S.saveOutfit}
                    </button>
                  )}
                  {/* Отказ — здесь же, под кнопкой: в конце ленты его никто не видел. */}
                  {saveErrors[`${m.id}-${idx}`] && (
                    <p className="mt-2 text-[12px] leading-snug text-center" style={{ color: '#B4443C' }}>
                      {saveErrors[`${m.id}-${idx}`]}
                    </p>
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

            {/* После причины «некрасиво» предлагаем сказать, что именно не подошло:
                тап отправляет «не люблю чёрное», и запрет уходит в профиль. Без этого
                оценка оставалась в статистике и на подбор не влияла. */}
            {refusalHints[m.id] && refusalHints[m.id].length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[12px] w-full" style={{ color: muted }}>
                  {S.whatWasWrong}
                </span>
                {refusalHints[m.id].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => {
                      setRefusalHints((prev) => {
                        const next = { ...prev };
                        delete next[m.id];
                        return next;
                      });
                      send(hint);
                    }}
                    className="px-3 py-1.5 rounded-full text-[13px] active:scale-[0.97] transition-transform"
                    style={{ background: card, color: ink, border: `1px solid ${line}` }}
                  >
                    {hint}
                  </button>
                ))}
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
          // Точки, а не фраза: «Работаю над этим…» читалось как готовый ответ,
          // и человек не понимал, что Nur ещё думает.
          <div
            className="self-start px-4 py-3 rounded-2xl flex items-center gap-1.5"
            aria-label={S.thinking}
            style={{ background: card, border: `1px solid ${line}` }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: muted, animationDelay: `${i * 150}ms` }}
              />
            ))}
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
            className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: card, color: ink }}
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
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
            className="flex-1 resize-none px-4 py-3 rounded-2xl text-[14px] outline-none placeholder:opacity-60"
            style={{ background: card, color: ink, maxHeight: 120 }}
          />
          <button
            onClick={() => send(draft)}
            disabled={!canSend}
            aria-label={S.send}
            className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 active:scale-95 transition-transform"
            style={{
              background: canSend ? accent : card,
              color: canSend ? '#fff' : muted,
            }}
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </footer>

      {/* Фото на весь экран. Превью в слоте 44×44 и присланный снимок в ленте вещь
          не показывают — по ним нельзя понять, ту ли вещь нашёл стилист. */}
      {zoomed && (
        <div
          onClick={() => setZoomed(null)}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomed} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
          <button
            onClick={() => setZoomed(null)}
            aria-label={S.close}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
