import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ChevronLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { isAuthenticated } from '@/lib/auth';
import { fetchClosetItems, type ClosetItem } from '@/lib/closet-storage';
import { getOutfitCanvases, getTryOnJobHistory } from '@/lib/wardrobe-api';
import { type CanvasGroup, type SavedCanvasLayout } from '@/lib/closet-types';
import { publishPost, FeedPublishError, type SelectedSource } from '@/lib/feed-publish';
import { getMyProfile as getFeedProfile, fileToCompressedDataUrl } from '@/lib/feed-api';
import { loadCached, clearCache } from '@/lib/feed-cache';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import type { FeedPost } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import SourcePicker, { type SourcePickerHandle } from '@/components/feed/SourcePicker';
import ComposeSheet from '@/components/feed/ComposeSheet';

const PICK = 0, COMPOSE = 1, PUBLISHED = 2;

// Source-list cache keys (7-day TTL — see lib/feed-cache.ts).
const K_ITEMS = 'feed_src_items_v1';
const K_BOARDS = 'feed_src_boards_v1';
const K_TRYONS = 'feed_src_tryons_v1';
// User-uploaded library photos (persisted as data URLs, newest first, capped).
const LIB_KEY = 'feed_library_photos_v1';
const LIB_CAP = 12;

type BoardContent = Awaited<ReturnType<typeof getOutfitCanvases>>['content'];
type TryonContent = Awaited<ReturnType<typeof getTryOnJobHistory>>['content'];

// Blob image URLs come back from the backend with encoded slashes (%2F) in the
// path, which the origin 404s. Restore real slashes — but ONLY in the path, so a
// SAS token's signature (which legitimately contains %2F) is left untouched.
const normalizeBlobUrl = (u?: string | null): string => {
  if (!u) return '';
  const q = u.indexOf('?');
  return q === -1 ? u.replace(/%2F/gi, '/') : u.slice(0, q).replace(/%2F/gi, '/') + u.slice(q);
};

interface LibPhoto {
  id: string;
  dataUrl: string;
}
function readLibrary(): LibPhoto[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LIB_KEY) || '[]') as LibPhoto[];
  } catch {
    return [];
  }
}
function writeLibrary(arr: LibPhoto[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(arr.slice(0, LIB_CAP)));
  } catch {
    /* quota — best effort */
  }
}
function libToSources(arr: LibPhoto[]): SelectedSource[] {
  return arr.map((p) => ({
    key: `library:${p.id}`,
    sourceType: 'library',
    sourceRefId: `library:${p.id}`,
    previewUrl: p.dataUrl,
  }));
}

function CreateFeedPost() {
  const router = useRouter();
  const { t } = useI18n();

  const [step, setStep] = React.useState(PICK);
  const [loading, setLoading] = React.useState(true);
  const [sources, setSources] = React.useState<{ board: SelectedSource[]; tryon: SelectedSource[]; library: SelectedSource[] }>({
    board: [],
    tryon: [],
    library: [],
  });
  const [allItems, setAllItems] = React.useState<ClosetItem[]>([]);
  const [selected, setSelected] = React.useState<SelectedSource[]>([]);
  const [caption, setCaption] = React.useState('');
  const [publishing, setPublishing] = React.useState(false);
  // Synchronous guard: React state updates are async, so a fast double-tap could
  // re-enter handlePublish before `publishing` re-renders and creates two posts.
  const publishingRef = React.useRef(false);
  const [showTryonPrompt, setShowTryonPrompt] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [published, setPublished] = React.useState<FeedPost | null>(null);
  const pickerRef = React.useRef<SourcePickerHandle>(null);

  // Auth gate (FeedGuard handles the feature flag; this handles sign-in).
  React.useEffect(() => {
    if (!isAuthenticated()) router.replace('/closet');
  }, [router]);

  // Load boards + outfits + wardrobe items (cached 7 days; `force` re-fetches).
  // Library photos come from localStorage (user-uploaded).
  const reqIdRef = React.useRef(0);
  const buildAndSet = React.useCallback(
    async (opts: { force?: boolean; applySeed?: boolean } = {}) => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      try {
        // Wardrobe items are fetched FRESH every open (not cached): board images
        // resolve only against this list via signed URLs, and a stale/empty
        // cache would silently leave every board blank. `.catch` keeps a failed
        // wardrobe load from blocking the rest of the picker. Boards/try-ons are
        // cached (they change rarely). All three run in parallel.
        const [items, boardsC, tryonsC] = await Promise.all([
          fetchClosetItems().catch(() => [] as ClosetItem[]),
          loadCached<BoardContent>(K_BOARDS, () => getOutfitCanvases({ size: 50 }).then((r) => r.content), [], opts.force),
          loadCached<TryonContent>(K_TRYONS, () => getTryOnJobHistory({ size: 50, status: 'COMPLETED' }).then((r) => r.content), [], opts.force),
        ]);
        if (reqIdRef.current !== myReq) return; // superseded by a newer load

        const wardrobeById = new Map(items.map((i) => [i.id, i]));
        const boardSources: SelectedSource[] = boardsC.map((c) => {
          const layout: SavedCanvasLayout = c.items.map((it) => ({
            id: it.wardrobeItemId,
            x: it.x,
            y: it.y,
            scale: it.scale,
            zIndex: it.zIndex,
            group: (it.itemGroup as CanvasGroup) ?? 'acc',
          }));
          // Snapshot resolves images from this list. Prefer the wardrobe item's
          // clean URL (same one the closet renders); fall back to the canvas URL
          // (normalized) so boards referencing deleted items still show.
          const canvasItems: ClosetItem[] = c.items.map((it) => {
            const wardrobe = it.wardrobeItemId ? wardrobeById.get(it.wardrobeItemId) : undefined;
            return {
              id: it.wardrobeItemId,
              category: 'tops',
              // Matched wardrobe item → use its URL verbatim (byte-identical to
              // how the closet canvas renders it). Only the unmatched fallback
              // (a deleted item's canvas URL) gets slash-normalized.
              imageData: wardrobe?.imageData || normalizeBlobUrl(it.imageUrl),
              createdAt: c.createdAt,
            };
          });
          return {
            key: `board:${c.id}`,
            sourceType: 'board',
            sourceRefId: c.id,
            previewUrl: normalizeBlobUrl(c.thumbnailUrl),
            layout,
            items: canvasItems,
          };
        });

        const tryonSources: SelectedSource[] = tryonsC
          .filter((j) => j.resultImageUrl)
          .map((j) => ({
            key: `tryon:${j.id}`,
            sourceType: 'tryon',
            sourceRefId: j.id,
            previewUrl: j.resultImageUrl,
            resultImageUrl: j.resultImageUrl as string,
          }));

        const librarySources = libToSources(readLibrary());

        setAllItems(items);
        setSources({ board: boardSources, tryon: tryonSources, library: librarySources });

        // Seed from a closet deep-link (?seed=board:<id> etc.) → pre-select + COMPOSE.
        if (opts.applySeed) {
          const seed = typeof router.query.seed === 'string' ? router.query.seed : null;
          if (seed) {
            const all = [...boardSources, ...tryonSources, ...librarySources];
            const match = all.find((s) => s.key === seed);
            if (match) {
              setSelected([match]);
              setStep(COMPOSE);
            }
          }
        }
      } finally {
        if (reqIdRef.current === myReq) setLoading(false);
      }
    },
    [router.query.seed],
  );

  React.useEffect(() => {
    logAnalyticsEvent(Events.FEED_POST_CREATE_STARTED);
    buildAndSet({ applySeed: true });
  }, [buildAndSet]);

  function refresh() {
    if (loading) return;
    clearCache(K_ITEMS, K_BOARDS, K_TRYONS);
    buildAndSet({ force: true });
  }

  async function handleAddLibraryPhoto(file: File) {
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const photo: LibPhoto = { id: `${Date.now()}_${Math.round(Math.random() * 1e6)}`, dataUrl };
      const arr = [photo, ...readLibrary()].slice(0, LIB_CAP);
      writeLibrary(arr);
      const libSources = libToSources(arr);
      setSources((prev) => ({ ...prev, library: libSources }));
      // Auto-select the just-added photo so it lands in the post.
      const added = libSources[0];
      setSelected((prev) => (prev.some((p) => p.key === added.key) ? prev : [...prev, added]));
      logAnalyticsEvent(Events.FEED_SOURCE_SELECTED, { [Params.FEED_SOURCE_TYPE]: 'library' });
    } catch {
      /* ignore unreadable image */
    }
  }

  function toggle(s: SelectedSource) {
    setSelected((prev) => {
      const exists = prev.some((p) => p.key === s.key);
      if (exists) return prev.filter((p) => p.key !== s.key);
      logAnalyticsEvent(Events.FEED_SOURCE_SELECTED, { [Params.FEED_SOURCE_TYPE]: s.sourceType });
      return [...prev, s];
    });
  }

  function removeSelected(key: string) {
    setSelected((prev) => prev.filter((p) => p.key !== key));
  }

  function reorder(key: string, dir: -1 | 1) {
    setSelected((prev) => {
      const i = prev.findIndex((p) => p.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function goCompose() {
    if (selected.length === 0) return;
    logAnalyticsEvent(Events.FEED_COMPOSE_VIEWED, { [Params.FEED_IMAGE_COUNT]: selected.length });
    setStep(COMPOSE);
  }

  // Next from the picker. If a board is selected without a try-on, nudge (but
  // don't force) the user to add their try-on result first.
  function handleNext() {
    if (selected.length === 0) return;
    const hasBoard = selected.some((s) => s.sourceType === 'board');
    const hasTryon = selected.some((s) => s.sourceType === 'tryon');
    if (hasBoard && !hasTryon && sources.tryon.length > 0) {
      setShowTryonPrompt(true);
      return;
    }
    goCompose();
  }

  async function handlePublish() {
    if (publishingRef.current || publishing || selected.length === 0) return;
    publishingRef.current = true;
    setError(null);
    setPublishing(true);
    try {
      // Best-effort username gate: a post needs a public profile. If the feed
      // profile has no username yet, send the user to set one first.
      try {
        const prof = await getFeedProfile();
        if (!prof.username) {
          router.push('/feed/me?setup=1');
          return;
        }
      } catch {
        // Profile endpoint unavailable — proceed and let the server validate.
      }

      const post = await publishPost(selected, caption, allItems);
      logAnalyticsEvent(Events.FEED_POST_PUBLISHED, {
        [Params.FEED_IMAGE_COUNT]: selected.length,
        [Params.FEED_HAS_REAL_PHOTO]: selected.some((s) => s.sourceType === 'tryon'),
      });
      setPublished(post);
      setStep(PUBLISHED);
    } catch (e) {
      const code = e instanceof FeedPublishError ? e.code : 'unknown';
      logAnalyticsEvent(Events.FEED_POST_PUBLISH_FAILED, { [Params.ERROR_CODE]: code });
      setError(code === 'nsfw_blocked' ? t.feed_nsfw_blocked : t.feed_publish_error);
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  }

  return (
    <>
      <Head>
        <title>{t.feed_publish_short} · LIBΛS</title>
      </Head>
      <div className="phone-container relative flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 shrink-0 border-b border-black/5 dark:border-white/10">
          <button
            onClick={() => (step === COMPOSE ? setStep(PICK) : router.back())}
            className="text-black dark:text-white p-1"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-[16px] font-bold text-black dark:text-white">
            {step === COMPOSE ? t.feed_compose_title : t.feed_pick_sources_title}
          </h1>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl text-[13px] text-center" style={{ background: 'rgba(229,72,77,0.12)', color: '#E5484D' }}>
            {error}
          </div>
        )}

        {step === PICK && (
          <>
            <div className="flex-1 min-h-0">
              <SourcePicker
                ref={pickerRef}
                boards={sources.board}
                outfits={sources.tryon}
                library={sources.library}
                selectedKeys={selected.map((s) => s.key)}
                onToggle={toggle}
                onAddLibraryPhoto={handleAddLibraryPhoto}
                onRefresh={refresh}
                items={allItems}
                loading={loading}
              />
            </div>
            <div className="px-4 pt-2 pb-6 shrink-0 border-t border-black/5 dark:border-white/10" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
              <p className="text-center text-[12.5px] text-black/45 dark:text-white/45 mt-2 mb-2">{t.feed_select_hint}</p>
              <button
                onClick={handleNext}
                disabled={selected.length === 0}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90 disabled:opacity-40"
                style={{ background: '#F370A7' }}
              >
                {t.feed_next}{selected.length > 0 ? ` · ${selected.length}` : ''}
              </button>
            </div>
          </>
        )}

        {step === COMPOSE && (
          <div className="flex-1 min-h-0">
            <ComposeSheet
              sources={selected}
              items={allItems}
              caption={caption}
              onCaptionChange={setCaption}
              onRemove={removeSelected}
              onReorder={reorder}
              onAddMore={() => setStep(PICK)}
              onPublish={handlePublish}
              publishing={publishing}
            />
          </div>
        )}

        {step === PUBLISHED && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(243,112,167,0.15)' }}>
              <span style={{ fontSize: 30 }}>🎉</span>
            </div>
            <h2 className="text-[20px] font-bold text-black dark:text-white">{t.feed_published_title}</h2>
            <p className="text-[14px] text-black/55 dark:text-white/55 mt-1">{t.feed_published_body}</p>
            <div className="flex flex-col gap-2.5 w-full mt-7">
              <button
                onClick={() => router.replace('/feed')}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px]"
                style={{ background: '#F370A7' }}
              >
                {t.feed_go_to_feed}
              </button>
              <button
                onClick={() => router.replace('/feed/me')}
                className="w-full py-3.5 rounded-2xl font-semibold text-[15px] text-black dark:text-white bg-black/5 dark:bg-white/10"
              >
                {t.feed_go_to_profile}
              </button>
            </div>
          </div>
        )}

        {/* Nudge to add a try-on when only a board is selected */}
        {showTryonPrompt && (
          <div className="absolute inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowTryonPrompt(false)} />
            <div
              className="relative w-full bg-white dark:bg-[#1c1c1e] rounded-t-3xl p-5"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
            >
              <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mx-auto mb-4" />
              <h3 className="text-[17px] font-bold text-black dark:text-white">{t.feed_add_tryon_title}</h3>
              <p className="text-[13.5px] text-black/55 dark:text-white/55 mt-1.5 leading-snug">{t.feed_add_tryon_body}</p>
              <button
                onClick={() => {
                  setShowTryonPrompt(false);
                  pickerRef.current?.focusOutfits();
                }}
                className="w-full mt-5 py-3.5 rounded-2xl text-white font-semibold text-[15px]"
                style={{ background: '#F370A7' }}
              >
                {t.feed_add_tryon_cta}
              </button>
              <button
                onClick={() => {
                  setShowTryonPrompt(false);
                  goCompose();
                }}
                className="w-full mt-2.5 py-3.5 rounded-2xl font-semibold text-[15px] text-black dark:text-white bg-black/5 dark:bg-white/10"
              >
                {t.feed_add_tryon_skip}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function CreateFeedPostPage() {
  return (
    <FeedGuard>
      <CreateFeedPost />
    </FeedGuard>
  );
}
