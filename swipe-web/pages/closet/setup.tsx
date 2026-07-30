import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Check, Loader2, Shirt, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useRootBackGuard } from '@/lib/use-root-back-guard';
import {
  addClosetItemAutoDetect, fetchClosetItems, getClosetItemById, mapApiItemToClosetItem,
  type ClosetItem,
} from '@/lib/closet-storage';
import { addWardrobeItemFromCatalog, createBeautifyJob, watchBeautifyUntilDone } from '@/lib/wardrobe-api';
import { isInsufficientCoins, describeApiError } from '@/lib/api';
import { compressImageForUpload } from '@/lib/image-utils';
import { taxLabel } from '@/lib/wardrobe-taxonomy';
import {
  clearSetupEntered, detectMode, findSlotItem, isSetupSatisfied, markSetupDone, markSetupEntered,
  slotForCategory, slotsForMode, type SetupMode, type SlotKey,
} from '@/lib/closet-setup';
import { SU } from '@/lib/setup-theme';
import SetupAddSheet from '@/components/closet/SetupAddSheet';
import SetupBeautifySheet from '@/components/closet/SetupBeautifySheet';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import type { Product } from '@/types';

type Source = 'camera' | 'gallery' | 'shop';
type SlotItems = Partial<Record<SlotKey, ClosetItem>>;

/** Photos processed in one pass — matches the "pick up to 10 at once" promise. */
const MAX_BATCH = 10;

/** How long setup waits for a usable item before carrying on regardless. */
const UPLOAD_WAIT_MS = 45_000;

/** Beautify start retries — the item is handed over mid-pipeline, so the first
 *  attempts can land before the backend considers it beautifiable. */
const BEAUTIFY_TRIES = 6;
const BEAUTIFY_RETRY_MS = 2500;

/**
 * Start a Beautify job, retrying while the backend still refuses the item.
 * Never retries a 402: that answer will not change, and every extra POST is a
 * chance to charge for a job the user was never offered.
 */
async function startBeautify(itemId: string) {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= BEAUTIFY_TRIES; attempt++) {
    try {
      return await createBeautifyJob(itemId);
    } catch (err) {
      if (isInsufficientCoins(err)) throw err;
      lastErr = err;
      console.warn(`setup beautify: start attempt ${attempt}/${BEAUTIFY_TRIES} failed —`, describeApiError(err));
      if (attempt < BEAUTIFY_TRIES) await new Promise((r) => setTimeout(r, BEAUTIFY_RETRY_MS));
    }
  }
  throw lastErr;
}

/**
 * Upload a photo with no category hint and resolve as soon as the AI knows what
 * it is. The pipeline reports ANALYZE well before COMPLETED, and by then the
 * background is already removed — so Beautify can start straight away.
 *
 * Do NOT hold out for the terminal status: the watcher falls back to a
 * 15-minute poll and that final event is the slowest, least reliable part of
 * the chain. Waiting on it is what stalled the whole screen on "Cutting out
 * the background…". Anything the early record is missing (its cut-out URL) is
 * picked up with one refetch once Beautify is done.
 */
function uploadAndDetect(file: File, onProgress?: (pct: number) => void): Promise<ClosetItem> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let itemId: string | null = null;
    let capTimer: ReturnType<typeof setTimeout> | null = null;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (capTimer) clearTimeout(capTimer);
      fn();
    };

    const attempt = async (id: string, isFinal: boolean) => {
      if (settled) return;
      try {
        const item = await getClosetItemById(id);
        // No subcategory yet means ANALYZE hasn't written the category — wait
        // for a later callback unless this is the final one.
        if (!item.subcategory && !isFinal) return;
        settle(() => resolve(item));
      } catch (err) {
        if (isFinal) settle(() => reject(err));
      }
    };

    // Backstop for a pipeline that never reports ANALYZE at all: once an item
    // id exists, take the record as it stands rather than waiting out the
    // watcher's 15-minute fallback.
    capTimer = setTimeout(() => {
      if (settled) return;
      console.warn('setup: no ANALYZE after', UPLOAD_WAIT_MS, 'ms — taking the item as it stands');
      if (itemId) void attempt(itemId, true);
      else settle(() => reject(new Error('upload timed out')));
    }, UPLOAD_WAIT_MS);

    addClosetItemAutoDetect(file, (status) => {
      if (typeof status.progressPercent === 'number') onProgress?.(status.progressPercent);
      if (!status.wardrobeItemId) return;
      itemId = status.wardrobeItemId;
      if (status.status === 'ANALYZE' || status.status === 'EMBED') void attempt(status.wardrobeItemId, false);
    })
      .then((status) => {
        const id = status.wardrobeItemId ?? itemId;
        if (!id) { settle(() => reject(new Error('upload returned no item'))); return; }
        void attempt(id, true);
      })
      .catch((err) => settle(() => reject(err)));
  });
}

/**
 * First-run closet setup — a blocking, full-screen screen whose only job is
 * getting two garments into the closet.
 *
 * Replaces the old empty-Closet first run, where the only real action sat below
 * the fold under an education carousel: session recordings showed new users
 * swiping the page instead of adding anything, and the one item they did add
 * was never shown back to them. Here the goal is drawn rather than described —
 * two literal slots, exactly one pulsing — and every upload returns as the
 * user's own cut-out photo.
 */
export default function ClosetSetupPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  useRootBackGuard();

  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<SetupMode>('pair');
  const [slotItems, setSlotItems] = useState<SlotItems>({});
  const [sheetSlot, setSheetSlot] = useState<SlotKey | null>(null);
  const [busySlots, setBusySlots] = useState<Set<SlotKey>>(new Set());
  const [catalogSlot, setCatalogSlot] = useState<SlotKey | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [finished, setFinished] = useState(false);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  /** Beautify running on a just-added garment, shown inside its own slot. */
  const [polish, setPolish] = useState<{ slot: SlotKey; item: ClosetItem } | null>(null);
  /** Beautify finished — the user picks which version to keep before setup moves on. */
  const [choice, setChoice] = useState<{ item: ClosetItem; jobId: string; beautifiedUrl: string } | null>(null);
  /**
   * One 0–100 bar spanning both stages of a photo: upload/background removal
   * fills the first half, Beautify the second.
   */
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const targetSlotRef = useRef<SlotKey>('top');
  const sourceRef = useRef<Source>('gallery');
  const retryFilesRef = useRef<File[] | null>(null);
  const progressRef = useRef(0);
  const shownAtRef = useRef(0);
  const hasAnyItemRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** A photo is being processed — upload/background removal, or Beautify. */
  const busy = busySlots.size > 0 || !!polish;

  const [slotA, slotB] = slotsForMode(mode);
  const itemA = slotItems[slotA];
  const itemB = slotItems[slotB];
  const addedCount = (itemA ? 1 : 0) + (itemB ? 1 : 0);
  const nextSlot: SlotKey | null = !itemA ? slotA : !itemB ? slotB : null;

  const SLOT_TITLE: Record<SlotKey, string> = {
    top: t.su_slot_top_title, bottom: t.su_slot_bottom_title,
    dress: t.su_slot_dress_title, shoes: t.su_slot_shoes_title,
  };
  const SLOT_DESC: Record<SlotKey, string> = {
    top: t.su_slot_top_desc, bottom: t.su_slot_bottom_desc,
    dress: t.su_slot_dress_desc, shoes: t.su_slot_shoes_desc,
  };
  const SLOT_SLUG: Record<SlotKey, string> = {
    top: t.su_slug_top, bottom: t.su_slug_bottom,
    dress: t.su_slug_dress, shoes: t.su_slug_shoes,
  };
  const SLOT_NEEDED: Record<SlotKey, string> = {
    top: t.su_toast_need_top, bottom: t.su_toast_need_bottom,
    dress: t.su_toast_need_dress, shoes: t.su_toast_need_shoes,
  };

  const SLOT_NOUN: Record<SlotKey, string> = {
    top: t.su_noun_top, bottom: t.su_noun_bottom,
    dress: t.su_noun_dress, shoes: t.su_noun_shoes,
  };

  /**
   * Human name for a garment. The backend only returns a label when the user
   * set one, so we fall back to the localized singular noun for its slot —
   * `colorPrimary` is a raw English/AI string and would read as mixed-language
   * in ru/uz, and the taxonomy labels are plural section names.
   */
  const nameOf = useCallback((item: ClosetItem): string => {
    if (item.displayName?.trim()) return item.displayName.trim();
    const slot = slotForCategory(item.category);
    return slot ? SLOT_NOUN[slot] : taxLabel(item.subcategory, locale);
  }, [locale, t]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The bar only ever moves forward — backend stages report percentages that
   *  reset between the upload job and the Beautify job. */
  function bumpProgress(next: number) {
    const capped = Math.max(0, Math.min(99, next));
    if (capped <= progressRef.current) return;
    progressRef.current = capped;
    setProgress(capped);
  }

  function resetProgress() {
    progressRef.current = 0;
    setProgress(0);
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }

  // ── Mount: resume from the closet, not from local state ─────────────────────
  useEffect(() => {
    markSetupEntered();
    shownAtRef.current = Date.now();
    let alive = true;
    (async () => {
      let items: ClosetItem[] = [];
      try { items = await fetchClosetItems(); } catch { /* offline — start empty */ }
      if (!alive) return;
      if (isSetupSatisfied(items)) {
        // Already has a wearable pair (e.g. finished on another device) — never
        // trap them here.
        markSetupDone();
        router.replace('/closet');
        return;
      }
      setAddedProductIds(new Set(items.map((i) => i.sourceProductId).filter(Boolean) as string[]));
      setMode(detectMode(items));
      setSlotItems({
        top: findSlotItem(items, 'top') ?? undefined,
        bottom: findSlotItem(items, 'bottom') ?? undefined,
        dress: findSlotItem(items, 'dress') ?? undefined,
        shoes: findSlotItem(items, 'shoes') ?? undefined,
      });
      hasAnyItemRef.current = items.length > 0;
      setReady(true);
      logAnalyticsEvent(Events.SETUP_SHOWN, { [Params.ITEM_COUNT]: items.length });
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // ── Completion ──────────────────────────────────────────────────────────────
  // Both slots full is not enough: if Beautify is still running, or the user
  // hasn't picked which photo to keep, the Done screen would cover the choice.
  useEffect(() => {
    if (!ready || finished || !itemA || !itemB || polish || choice) return;
    setFinished(true);
    markSetupDone();
    logAnalyticsEvent(Events.SETUP_COMPLETED, {
      [Params.MS_SINCE_SHOWN]: Date.now() - shownAtRef.current,
      [Params.ITEM_COUNT]: 2,
      [Params.MODE]: mode,
    });
  }, [ready, finished, itemA, itemB, mode, polish, choice]);

  // Backend stages report progress in jumps and can go quiet for seconds at a
  // time, which reads as a hung bar. Ease it forward on a timer between reports
  // — never past the current stage, so it can't finish ahead of the work.
  useEffect(() => {
    if (!busy) return;
    const ceiling = polish ? 97 : 48;
    const id = setInterval(() => {
      const now = progressRef.current;
      if (now >= ceiling) return;
      bumpProgress(Math.min(ceiling, now + Math.max(0.35, (ceiling - now) * 0.05)));
    }, 400);
    return () => clearInterval(id);
  }, [busy, polish]);

  // ── Mode toggle ─────────────────────────────────────────────────────────────
  // Switching never clears anything: `slotItems` holds all four slots, so each
  // mode simply shows whatever the closet already has for its two. Switching
  // back restores what was there, and nothing needs confirming.
  function applyMode(next: SetupMode) {
    if (next === mode) return;
    setMode(next);
    logAnalyticsEvent(Events.SETUP_MODE_SWITCHED, { [Params.MODE]: next });
  }

  // ── Picker ──────────────────────────────────────────────────────────────────
  function openPicker(slot: SlotKey, fromSlotCard: boolean) {
    if (busySlots.size || polish || catalogSlot) return;
    targetSlotRef.current = slot;
    if (fromSlotCard) logAnalyticsEvent(Events.SETUP_SLOT_TAPPED, { [Params.SLOT]: slot, [Params.MODE]: mode });
    logAnalyticsEvent(Events.SETUP_PICKER_OPENED, { [Params.SLOT]: slot, [Params.MODE]: mode });
    setSheetSlot(slot);
  }

  function chooseSource(source: Source) {
    sourceRef.current = source;
    logAnalyticsEvent(Events.SETUP_PICKER_SOURCE_CHOSEN, {
      [Params.SOURCE]: source, [Params.SLOT]: targetSlotRef.current, [Params.MODE]: mode,
    });
    setSheetSlot(null);
    if (source === 'camera') cameraInputRef.current?.click();
    else fileInputRef.current?.click();
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_BATCH);
    e.target.value = '';
    if (!files.length) return;
    retryFilesRef.current = files;
    void processFiles(files);
  }

  async function processFiles(files: File[]) {
    setFailed(false);
    // Work is shown INSIDE the slot being filled, not behind a full-screen
    // scrim — the user needs to keep seeing where the garment is going. With a
    // multi-photo batch any empty slot can receive one, so all of them wait.
    const [a, b] = slotsForMode(mode);
    const target = targetSlotRef.current;
    const working = files.length > 1
      ? new Set<SlotKey>([a, b].filter((s) => !slotItems[s] || s === target))
      : new Set<SlotKey>([target]);
    setBusySlots(working);
    resetProgress();

    const startedAt = Date.now();
    logAnalyticsEvent(Events.SETUP_ITEM_PROCESSING_STARTED, {
      [Params.SOURCE]: sourceRef.current, [Params.MODE]: mode, [Params.ITEM_COUNT]: files.length,
    });
    // Capped concurrency — a 10-photo batch on a phone network shouldn't open
    // ten simultaneous blob uploads.
    const queue = [...files];
    const added: ClosetItem[] = [];
    const worker = async () => {
      for (let file = queue.shift(); file; file = queue.shift()) {
        try {
          // The upload owns the first half of the bar; Beautify fills the rest.
          added.push(await uploadAndDetect(await compressImageForUpload(file), (pct) => bumpProgress(pct / 2)));
        } catch (err) {
          console.error('setup upload failed:', err);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
    setBusySlots(new Set());
    if (!added.length) {
      logAnalyticsEvent(Events.SETUP_ITEM_FAILED, {
        [Params.REASON]: 'upload_failed', [Params.SOURCE]: sourceRef.current, [Params.MODE]: mode,
      });
      setFailed(true);
      resetProgress();
      return;
    }
    applyAdded(added, sourceRef.current, Date.now() - startedAt);
  }

  /**
   * Beautify, unprompted. The user never asks for it and is never quoted a
   * price for it here — it starts the moment the background is off and the only
   * thing that comes back is the before/after choice. If it can't run (flag off,
   * job failed, or the account can't pay) setup carries on with the cut-out
   * photo, silently: a brand-new user must never meet a paywall in first run.
   */
  async function runAutoBeautify(item: ClosetItem, slot: SlotKey) {
    setPolish({ slot, item });
    logAnalyticsEvent(Events.SETUP_BEAUTIFY_STARTED, { [Params.SLOT]: slot, [Params.MODE]: mode });
    try {
      const job = await startBeautify(item.id);
      const done = await watchBeautifyUntilDone(item.id, job.beautifyJobId, (j) =>
        bumpProgress(50 + (j.progressPercent ?? 0) / 2),
      );
      if (done.status === 'COMPLETED' && done.beautifiedUrl) {
        logAnalyticsEvent(Events.SETUP_BEAUTIFY_COMPLETED, { [Params.SLOT]: slot });
        // Beautify started from the mid-pipeline record, which can still point
        // at the raw camera shot. Refetch now so "Original photo" in the
        // comparison is the cut-out the user is actually choosing between.
        const fresh = await getClosetItemById(item.id).catch(() => item);
        setSlotItems((prev) => (prev[slot]?.id === fresh.id ? { ...prev, [slot]: fresh } : prev));
        setPolish(null);
        resetProgress();
        setChoice({ item: fresh, jobId: job.beautifyJobId, beautifiedUrl: done.beautifiedUrl });
        return;
      }
      console.warn('setup beautify did not complete:', done.status, done.failureReason);
      logAnalyticsEvent(Events.SETUP_BEAUTIFY_FAILED, { [Params.REASON]: done.failureReason ?? done.status });
    } catch (err) {
      // 402 lands here on purpose: an account that can't pay is treated exactly
      // like an outage, with nothing said about it. Logged all the same — this
      // step is invisible by design, so the console is the only way to tell a
      // silent skip apart from a bug.
      console.warn('setup beautify gave up:', describeApiError(err));
      logAnalyticsEvent(Events.SETUP_BEAUTIFY_FAILED, {
        [Params.REASON]: isInsufficientCoins(err) ? 'insufficient_coins' : 'unavailable',
      });
    }
    // Nothing to choose between — the cut-out photo is already in the slot, and
    // the user decides for themselves when to add the next one.
    setPolish(null);
    resetProgress();
  }

  /**
   * Route freshly added garments into the slots. A garment matching a slot
   * always takes it (so "Replace" works, and a second top replaces the first
   * rather than silently doing nothing); anything else just lands in the closet.
   */
  function applyAdded(added: ClosetItem[], source: Source, ms: number) {
    const wasFirst = !hasAnyItemRef.current;
    hasAnyItemRef.current = true;

    const next: SlotItems = { ...slotItems };
    let filledAny = false;
    for (const item of added) {
      const slot = slotForCategory(item.category);
      if (!slot) continue;
      next[slot] = item;
      filledAny = true;
      logAnalyticsEvent(Events.SETUP_ITEM_ADDED, {
        [Params.SLOT]: slot, [Params.SOURCE]: source, [Params.MODE]: mode, [Params.DURATION_MS]: ms,
      });
    }
    setSlotItems(next);

    // Follow the garment. A dress shot while "Top + bottom" is showing fills a
    // slot the user can't see, so the upload looks like it did nothing. Switch
    // whenever THIS batch landed only in the other mode's slots — judging by
    // what is already in the slots instead would keep a user who has a top
    // stuck on the pair tab after photographing a dress.
    let activeMode = mode;
    const landed = added.map((item) => slotForCategory(item.category)).filter(Boolean) as SlotKey[];
    const [a, b] = slotsForMode(mode);
    if (landed.length > 0 && !landed.some((s) => s === a || s === b)) {
      const other: SetupMode = mode === 'pair' ? 'dress' : 'pair';
      const [c, d] = slotsForMode(other);
      if (landed.some((s) => s === c || s === d)) {
        activeMode = other;
        setMode(other);
        logAnalyticsEvent(Events.SETUP_MODE_SWITCHED, {
          [Params.MODE]: other, [Params.REASON]: 'followed_upload',
        });
      }
    }

    if (wasFirst && filledAny) logAnalyticsEvent(Events.SETUP_FIRST_ITEM_ADDED, { [Params.SOURCE]: source, [Params.MODE]: activeMode });

    const [x, y] = slotsForMode(activeMode);
    const stillEmpty: SlotKey | null = !next[x] ? x : !next[y] ? y : null;
    const last = added[added.length - 1];
    if (stillEmpty) {
      const matched = added.some((item) => { const s = slotForCategory(item.category); return s === x || s === y; });
      if (matched) setAnnouncement(t.su_a11y_added_more.replace('{name}', nameOf(last)));
      else showToast(SLOT_NEEDED[stillEmpty]);
    } else {
      setAnnouncement(t.su_a11y_added_done.replace('{name}', nameOf(last)));
    }

    // Straight into Beautify — no offer, no question. Shop adds skip it: the
    // catalogue already ships studio shots.
    if (source === 'shop') { resetProgress(); return; }
    // Beautify whatever landed in a slot; if nothing did (a bag, a scarf), the
    // newest item still gets it — it is the photo the user is looking at.
    //
    // Deliberately NOT gated on FEATURES.beautifyEnabled: that flag defaults to
    // off, so a deploy that forgets NEXT_PUBLIC_FF_BEAUTIFY would silently drop
    // this step with nothing to show for it. The endpoint decides instead — if
    // it isn't there, the attempt fails and setup carries on exactly the same.
    const first = added.find((item) => slotForCategory(item.category)) ?? last;
    const firstSlot = slotForCategory(first.category) ?? targetSlotRef.current;
    void runAutoBeautify(first, firstSlot);
  }

  /** One-tap add of a catalogue item the user already bought — no photo, no overlay. */
  async function pickProduct(product: Product) {
    const slot = targetSlotRef.current;
    setSheetSlot(null);
    setCatalogSlot(slot);
    try {
      const created = mapApiItemToClosetItem(await addWardrobeItemFromCatalog(product.id));
      setAddedProductIds((prev) => new Set(prev).add(product.id));
      applyAdded([created], 'shop', 0);
    } catch (err) {
      console.error('setup catalog add failed:', err);
      logAnalyticsEvent(Events.SETUP_ITEM_FAILED, { [Params.REASON]: 'catalog_failed', [Params.SOURCE]: 'shop' });
      showToast(t.su_photo_failed);
    } finally {
      setCatalogSlot(null);
    }
  }

  function leaveSetup(generate: boolean, opts?: { tryOn?: boolean }) {
    clearSetupEntered();
    if (!generate) { router.replace('/closet?tab=boards'); return; }
    logAnalyticsEvent(Events.SETUP_FIRST_OUTFIT_GENERATED, { [Params.MODE]: mode });
    if (opts?.tryOn) {
      // The closet owns the try-on flow (person photo, coins, polling) — arm it
      // there so it opens on the outfit the first generation produces.
      logAnalyticsEvent(Events.SETUP_TRYON_TAPPED, { [Params.MODE]: mode });
      router.replace('/closet?tab=boards&firstOutfit=1&tryOn=1');
      return;
    }
    router.replace('/closet?tab=boards&firstOutfit=1');
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!ready) return <div className="phone-container" style={{ height: '100dvh', background: '#fff' }} />;

  const ctaLabel = nextSlot ? `＋ ${SLOT_TITLE[nextSlot]}` : `✦ ${t.su_generate}`;

  function renderSlot(slot: SlotKey, isNext: boolean) {
    const item = slotItems[slot];
    const adding = catalogSlot === slot;
    const polishing = polish?.slot === slot;

    // Work in progress, shown in place of the slot it will fill so the user can
    // see exactly where their garment is going. Both stages — background
    // removal, then Beautify — run here. This covers Replace too: `busySlots`
    // only ever holds slots this batch can land in, so a filled slot being
    // replaced must show the work rather than sit on the outgoing photo.
    if (polishing || busySlots.has(slot)) {
      // Whatever picture exists right now — the cut-out mid-Beautify, or the
      // photo being replaced — sits behind the spinner so the card never blinks
      // back to an empty placeholder.
      const behind = polishing ? polish.item.imageData : item?.imageData;
      return (
        <div
          key={slot}
          aria-live="polite"
          aria-busy="true"
          className="flex items-center gap-[15px]"
          style={{
            height: 150, borderRadius: 22, border: `2px dashed ${SU.pinkBorder}`,
            background: SU.pinkTint, padding: '0 16px',
          }}
        >
          <span
            className="relative flex-none flex items-center justify-center"
            style={{ width: 88, height: 114, borderRadius: 13, background: behind ? '#fff' : SU.ghost }}
          >
            {behind && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={behind}
                alt=""
                className="absolute inset-0"
                style={{ width: '100%', height: '100%', borderRadius: 13, objectFit: 'contain', padding: 4 }}
              />
            )}
            <span
              className="relative flex items-center justify-center"
              style={behind
                ? { width: 38, height: 38, borderRadius: 999, background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 8px rgba(16,16,20,0.14)' }
                : undefined}
            >
              <span
                className="su-spin block"
                style={{ width: 30, height: 30, borderRadius: 999, border: `3px solid ${SU.pinkSoftBorder}`, borderTopColor: SU.pink }}
              />
            </span>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block" style={{ font: '700 16px/1.25 Roboto, system-ui', color: SU.ink }}>
              {polishing ? t.su_polishing : t.su_cutting}
            </span>
            {/* One bar across both stages — no time estimate to be wrong about. */}
            <span
              className="block"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ marginTop: 11, height: 6, borderRadius: 99, background: SU.pinkSoftBorder, overflow: 'hidden' }}
            >
              <span
                className="block"
                style={{
                  width: `${Math.max(4, progress)}%`, height: '100%', borderRadius: 99,
                  background: SU.pink, transition: 'width 0.45s ease-out',
                }}
              />
            </span>
          </span>
        </div>
      );
    }

    if (item) {
      const other = slot === slotA ? itemB : itemA;
      return (
        // The whole card is the tap target, not just the Replace chip.
        <div
          key={slot}
          role="button"
          tabIndex={0}
          aria-label={t.su_a11y_filled.replace('{name}', nameOf(item))}
          onClick={() => openPicker(slot, true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(slot, true); } }}
          className="su-rise flex items-center gap-[15px] cursor-pointer active:scale-[0.985] transition-transform"
          style={{
            height: 150, borderRadius: 22, border: `2px solid ${SU.success}`,
            background: SU.successBg, padding: '0 16px',
          }}
        >
          <div className="relative flex-none" style={{ width: 88, height: 114 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageData}
              alt=""
              style={{ width: 88, height: 114, borderRadius: 13, objectFit: 'contain', background: '#fff' }}
            />
            <span
              className="absolute flex items-center justify-center text-white"
              style={{ top: -6, right: -6, width: 26, height: 26, borderRadius: 999, background: SU.success }}
            >
              <Check size={14} strokeWidth={3.4} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ font: '600 11px/1 Roboto, system-ui', color: SU.success, letterSpacing: '0.06em' }}>
              {other ? t.su_ready : t.su_more_to_go}
            </div>
            <div className="truncate" style={{ marginTop: 6, font: '700 18px/1.2 Roboto, system-ui', color: SU.ink }}>
              {nameOf(item)}
            </div>
            <span
              aria-hidden="true"
              className="inline-flex items-center"
              style={{
                marginTop: 12, height: 32, padding: '0 13px', borderRadius: 999, background: '#fff',
                border: `1px solid ${SU.successBorder}`, color: SU.successChipText,
                font: '600 12.5px/1 Roboto, system-ui', whiteSpace: 'nowrap',
              }}
            >
              {t.su_replace}
            </span>
          </div>
        </div>
      );
    }

    return (
      <button
        key={slot}
        onClick={() => openPicker(slot, true)}
        aria-label={t.su_a11y_empty.replace('{title}', SLOT_TITLE[slot])}
        className={`w-full text-left flex items-center gap-[15px] active:scale-[0.985] transition-transform${isNext && !adding ? ' su-pulse' : ''}`}
        style={{
          height: 150, borderRadius: 22, border: `2px dashed ${SU.pinkBorder}`,
          background: SU.pinkTint, padding: '0 16px',
        }}
      >
        <span
          className="flex-none flex items-end justify-center"
          style={{
            width: 88, height: 114, borderRadius: 13, background: SU.ghost, paddingBottom: 9,
            font: '600 8.5px/1 ui-monospace, monospace', color: SU.ghostText, letterSpacing: '0.1em',
          }}
        >
          {SLOT_SLUG[slot]}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ font: '700 19px/1.2 Roboto, system-ui', color: SU.ink }}>{SLOT_TITLE[slot]}</span>
          <span className="block" style={{ marginTop: 4, font: '400 13px/1.35 Roboto, system-ui', color: SU.mutedOnTint }}>
            {SLOT_DESC[slot]}
          </span>
          <span
            className="inline-flex items-center gap-[7px]"
            style={{
              marginTop: 11, height: 36, padding: '0 15px', borderRadius: 999, background: SU.pink,
              color: '#fff', font: '700 13.5px/1 Roboto, system-ui', whiteSpace: 'nowrap',
            }}
          >
            {adding ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <span style={{ fontSize: 17, lineHeight: 1 }}>＋</span>
            )}
            {t.su_photo}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="phone-container flex flex-col" style={{ height: '100dvh', background: '#fff', color: SU.ink }}>
      <span aria-live="polite" className="sr-only">{announcement}</span>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-lg text-center"
          style={{ top: 'calc(12px + env(safe-area-inset-top, 0px))', background: '#101014', maxWidth: '90vw' }}
        >
          {toast}
        </div>
      )}

      {/* ── Scrolling body ── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto flex flex-col"
        style={{ padding: 'calc(6px + env(safe-area-inset-top, 0px)) 20px 0' }}
      >
        <h1 style={{ font: '900 28px/1.12 Roboto, system-ui', letterSpacing: '-0.6px', textWrap: 'pretty' }}>
          {t.su_title}
        </h1>
        <p style={{ marginTop: 9, font: '400 15px/1.45 Roboto, system-ui', color: SU.sub, textWrap: 'pretty' }}>
          {t.su_subtitle}
        </p>

        {/* Mode toggle — replaces the old "add a top and a bottom, or a dress
            and shoes" sentence with a choice the user can actually make. */}
        <div
          role="tablist"
          className="flex gap-1.5"
          style={{ marginTop: 16, padding: 4, background: SU.surface, borderRadius: 999 }}
        >
          {(['pair', 'dress'] as SetupMode[]).map((m) => {
            const on = mode === m;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={on}
                onClick={() => applyMode(m)}
                className="flex-1 flex items-center justify-center active:scale-[0.98] transition-transform"
                style={{
                  height: 38, borderRadius: 999, whiteSpace: 'nowrap',
                  font: '700 13.5px/1 Roboto, system-ui',
                  background: on ? '#fff' : 'transparent',
                  color: on ? SU.ink : SU.sub,
                  boxShadow: on ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
                }}
              >
                {m === 'pair' ? t.su_mode_pair : t.su_mode_dress}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-[11px]" style={{ marginTop: 14 }}>
          {renderSlot(slotA, nextSlot === slotA)}
          {renderSlot(slotB, nextSlot === slotB)}
        </div>

        <div style={{ marginTop: 'auto', height: 8 }} />
      </div>

      {/* ── Sticky footer ── */}
      <div
        className="flex-none"
        style={{
          padding: '14px 20px calc(22px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(180deg,rgba(255,255,255,0) 0,#fff 22px)',
        }}
      >
        <div className="flex items-center justify-between gap-3" style={{ marginBottom: 10 }}>
          <div style={{ font: '600 12.5px/1 Roboto, system-ui', color: SU.sub }}>
            {t.su_progress.replace('{n}', String(addedCount))}
          </div>
          <div className="flex gap-[5px] flex-none">
            {[0, 1].map((i) => (
              <span key={i} style={{ width: 22, height: 5, borderRadius: 99, background: addedCount > i ? SU.pink : SU.hairline }} />
            ))}
          </div>
        </div>
        <button
          onClick={() => (nextSlot ? openPicker(nextSlot, false) : leaveSetup(true))}
          disabled={busy}
          className="w-full flex items-center justify-center active:scale-[0.99] transition-transform"
          style={{
            height: 56, borderRadius: 999, background: SU.pink, color: '#fff',
            font: '700 17px/1 Roboto, system-ui', whiteSpace: 'nowrap',
            boxShadow: '0 8px 22px rgba(237,61,142,0.28)',
            opacity: busy ? 0.55 : 1,
          }}
        >
          {ctaLabel}
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />

      {/* ── Add sheet ── */}
      {sheetSlot && (
        <SetupAddSheet
          slot={sheetSlot}
          addedProductIds={addedProductIds}
          onClose={() => setSheetSlot(null)}
          onCamera={() => chooseSource('camera')}
          onGallery={() => chooseSource('gallery')}
          onPickProduct={pickProduct}
        />
      )}

      {/* ── Upload failure: keep the slot empty, offer a retry ── */}
      {failed && (
        <div className="fixed inset-x-0 z-[89] flex justify-center px-5" style={{ bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
          <div
            className="w-full max-w-[420px] flex items-center gap-3"
            style={{ background: '#101014', borderRadius: 18, padding: '12px 14px' }}
          >
            <span className="flex-1" style={{ font: '500 13px/1.35 Roboto, system-ui', color: '#fff' }}>{t.su_photo_failed}</span>
            <button
              onClick={() => { const files = retryFilesRef.current; setFailed(false); if (files?.length) void processFiles(files); else fileInputRef.current?.click(); }}
              className="flex-none active:scale-[0.97] transition-transform"
              style={{ height: 32, padding: '0 14px', borderRadius: 999, background: SU.pink, color: '#fff', font: '700 12.5px/1 Roboto, system-ui', whiteSpace: 'nowrap' }}
            >
              {t.su_try_again}
            </button>
          </div>
        </div>
      )}

      {/* ── Beautify finished: the one question setup asks ── */}
      {choice && (
        <SetupBeautifySheet
          item={choice.item}
          jobId={choice.jobId}
          beautifiedUrl={choice.beautifiedUrl}
          onCommitted={(imageUrl) => {
            const { item } = choice;
            setSlotItems((prev) => {
              const next: SlotItems = { ...prev };
              for (const key of Object.keys(next) as SlotKey[]) {
                const it = next[key];
                if (it?.id === item.id) next[key] = { ...it, imageData: imageUrl, fullImage: imageUrl };
              }
              return next;
            });
            // Nothing opens on its own — the user taps the next slot when ready.
            setChoice(null);
          }}
        />
      )}

      {/* ── Success ── */}
      {finished && (
        <div
          className="fixed inset-0 z-[86] flex flex-col su-rise"
          style={{ background: '#fff', padding: 'calc(52px + env(safe-area-inset-top, 0px)) 20px calc(24px + env(safe-area-inset-bottom, 0px))' }}
        >
          <h2 style={{ font: '900 27px/1.14 Roboto, system-ui', letterSpacing: '-0.5px', color: SU.ink }}>{t.su_done_title}</h2>
          <p style={{ marginTop: 9, font: '400 15px/1.45 Roboto, system-ui', color: SU.sub }}>{t.su_done_body}</p>
          <div
            className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2"
            style={{ marginTop: 22, borderRadius: 24, background: 'linear-gradient(180deg,#FFF6FA 0,#FDFDFE 100%)', border: '1px solid #F7E3EE' }}
          >
            {[itemA, itemB].map((item, i) => item && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={item.imageData}
                alt=""
                style={{ width: i === 0 ? 120 : 130, maxHeight: '40%', borderRadius: 14, objectFit: 'contain' }}
              />
            ))}
          </div>
          <button
            onClick={() => leaveSetup(true)}
            className="w-full flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            style={{
              marginTop: 18, height: 56, borderRadius: 999, background: SU.pink, color: '#fff',
              font: '700 17px/1 Roboto, system-ui', whiteSpace: 'nowrap',
              boxShadow: '0 8px 22px rgba(237,61,142,0.28)',
            }}
          >
            <Sparkles size={18} strokeWidth={2.4} />
            {t.su_generate}
          </button>
          <button
            onClick={() => leaveSetup(true, { tryOn: true })}
            className="w-full flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            style={{
              marginTop: 10, height: 52, borderRadius: 999, background: '#fff',
              border: `1.5px solid ${SU.pinkBorder}`, color: SU.pink,
              font: '700 15.5px/1 Roboto, system-ui', whiteSpace: 'nowrap',
            }}
          >
            <Shirt size={17} strokeWidth={2.3} />
            {t.su_tryon}
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes suPulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(237, 61, 142, 0.35); }
          70%  { box-shadow: 0 0 0 14px rgba(237, 61, 142, 0); }
          100% { box-shadow: 0 0 0 0 rgba(237, 61, 142, 0); }
        }
        @keyframes suRiseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes suSpin { to { transform: rotate(360deg); } }
        @keyframes suSheetUp { from { transform: translateY(100%); } to { transform: none; } }
        .su-pulse { animation: suPulseRing 2.6s infinite; }
        .su-rise  { animation: suRiseIn 0.32s ease-out; }
        .su-spin  { animation: suSpin 0.8s linear infinite; }
        .su-sheet { animation: suSheetUp 0.26s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @media (prefers-reduced-motion: reduce) {
          .su-pulse, .su-rise, .su-sheet { animation: none; }
        }
      `}</style>
    </div>
  );
}
