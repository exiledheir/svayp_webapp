import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus, User, Heart, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getFeed } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { useRootBackGuard } from '@/lib/use-root-back-guard';
import { isShellTab } from '@/lib/flutter-bridge';
import { NAV_INSET } from '@/lib/feed-layout';
import type { FeedPost } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import MasonryGrid from '@/components/feed/MasonryGrid';
import PostActionsSheet from '@/components/feed/PostActionsSheet';
import ClosetSectionTabs from '@/components/ClosetSectionTabs';
import NativeChatButton from '@/components/NativeChatButton';
import { getPageCache, setPageCache } from '@/lib/page-cache';

const PAGE_SIZE = 10;
// Restore the feed list on back-navigation instead of refetching page 0.
const FEED_CACHE_KEY = 'feed:posts';
const FEED_CACHE_TTL_MS = 3 * 60_000;
type FeedSnapshot = { posts: FeedPost[]; page: number; hasMore: boolean };
// Content bottom inset (NAV_INSET) clears the native Flutter navbar — this page
// is a WebView tab in the shell and, like Closet/Market, doesn't render the web
// BottomNav, which would otherwise double up with the native bar.
// Publish FAB sits lower than the content inset — nearer the bottom edge (still
// clears the phone's home-indicator safe area). Bump the px up to raise it.
const FAB_BOTTOM = 'calc(24px + env(safe-area-inset-bottom, 0px))';
// Pull-to-refresh tuning (mirrors the closet SourcePicker).
const PULL_MAX = 90;
const PULL_THRESHOLD = 60;
const PULL_RESISTANCE = 0.5;

function FeedHome() {
  const router = useRouter();
  const { t } = useI18n();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // Keep a history sentinel on this tab root so the Android system back is
  // handled as an in-page popstate instead of exiting the WebView (matches
  // Closet/Market). Prevents the black-screen-on-back at the feed root.
  useRootBackGuard();
  // Bottom-bar tab of the new native shell: the closet strip below the header
  // would steer THIS WebView to /closet (the closet has its own tab now), and
  // the header carries the chat entry point. Resolved after mount for hydration.
  const [shellTab, setShellTab] = React.useState(false);
  React.useEffect(() => { setShellTab(isShellTab()); }, []);

  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [fetchingMore, setFetchingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  // The ⋯ actions sheet is owned here (not inside the tile) so it overlays the
  // whole screen — the grid is wrapped in a transform for pull-to-refresh, which
  // would otherwise become the sheet's positioning context.
  const [actionsPost, setActionsPost] = React.useState<FeedPost | null>(null);

  React.useEffect(() => {
    logAnalyticsEvent(Events.FEED_VIEWED);
    const cached = getPageCache<FeedSnapshot>(FEED_CACHE_KEY, FEED_CACHE_TTL_MS);
    if (cached && cached.posts.length > 0) {
      setPosts(cached.posts);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setLoading(false);
      return;
    }
    getFeed(0, PAGE_SIZE)
      .then((res) => {
        setPosts(res.content);
        setHasMore(res.content.length === PAGE_SIZE);
      })
      .catch(() => setHasMore(false)) // backend may not be live yet → empty state
      .finally(() => setLoading(false));
  }, []);

  // Snapshot the list (incl. like toggles) so the next visit restores it as-is.
  React.useEffect(() => {
    if (!loading && posts.length > 0) {
      setPageCache(FEED_CACHE_KEY, { posts, page, hasMore } satisfies FeedSnapshot);
    }
  }, [posts, page, hasMore, loading]);

  const loadMore = React.useCallback(() => {
    if (fetchingMore || !hasMore) return;
    const next = page + 1;
    setFetchingMore(true);
    getFeed(next, PAGE_SIZE)
      .then((res) => {
        setPosts((prev) => [...prev, ...res.content]);
        setPage(next);
        setHasMore(res.content.length === PAGE_SIZE);
      })
      .catch(() => setHasMore(false))
      .finally(() => setFetchingMore(false));
  }, [page, hasMore, fetchingMore]);

  // Глубина скролла ленты (25/50/75/100%), каждый порог — один раз за визит.
  const scrollDepthRef = React.useRef<Set<number>>(new Set());
  // Coalesce scroll work into one rAF per frame: reading scroll geometry on every
  // native scroll event forces a synchronous reflow that stutters the momentum
  // scroll ("то быстро, то медленно"). Batching in rAF reads layout once/frame.
  const scrollTickingRef = React.useRef(false);

  function handleScroll() {
    if (scrollTickingRef.current) return;
    scrollTickingRef.current = true;
    requestAnimationFrame(() => {
      scrollTickingRef.current = false;
      const el = scrollRef.current;
      if (!el) return;
      const { scrollHeight, scrollTop, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 800) loadMore();

      const scrollable = scrollHeight - clientHeight;
      if (scrollable > 0) {
        const pct = ((scrollTop + clientHeight) / scrollHeight) * 100;
        for (const threshold of [25, 50, 75, 100]) {
          if (pct >= threshold && !scrollDepthRef.current.has(threshold)) {
            scrollDepthRef.current.add(threshold);
            logAnalyticsEvent(Events.FEED_SCROLL_DEPTH, { [Params.DEPTH]: threshold });
          }
        }
      }
    });
  }

  // ── Pull-to-refresh: drag down from the very top to reload the feed. ──
  const refresh = React.useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    getFeed(0, PAGE_SIZE)
      .then((res) => {
        setPosts(res.content);
        setPage(0);
        setHasMore(res.content.length === PAGE_SIZE);
      })
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [refreshing]);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && (scrollRef.current?.scrollTop ?? 0) <= 0) {
      setPull(Math.min(PULL_MAX, dy * PULL_RESISTANCE));
    } else {
      setPull(0);
    }
  }
  function onTouchEnd() {
    if (pull >= PULL_THRESHOLD && !refreshing) refresh();
    setPull(0);
    startY.current = null;
  }
  const offset = refreshing ? PULL_THRESHOLD : pull;

  const openPost = React.useCallback(
    (post: FeedPost) => router.push(`/feed/p/${post.id}?from=${encodeURIComponent(router.asPath)}`),
    [router],
  );

  return (
    <>
      <Head>
        <title>{t.feed_title} · LIBΛS</title>
      </Head>
      <div className="phone-container flex flex-col bg-[#fafafa] dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header — same shape as Closet / Market / Discover: flat (no bar, no
            border), big title on the left, bare icons on the right, chat last. */}
        <header
          className="shrink-0 flex items-center justify-between px-4 pb-2"
          style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
        >
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-black dark:text-white shrink-0">
            {t.feed_title}
          </h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => router.push('/feed/liked')}
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center active:opacity-60 transition-opacity text-black dark:text-white"
              aria-label={t.feed_activity_title}
            >
              <Heart size={22} strokeWidth={1.9} />
            </button>
            <button
              onClick={() => router.push('/feed/me')}
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center active:opacity-60 transition-opacity text-black dark:text-white"
              aria-label={t.feed_go_to_profile}
            >
              <User size={22} strokeWidth={1.9} />
            </button>
            {shellTab && <NativeChatButton />}
          </div>
        </header>

        {/* Sub-tabs (Boards · Outfits · Calendar · Feed) — same strip as the
            Closet page so the other tabs stay reachable while viewing the Feed;
            tapping one routes back to /closet on that tab. Not in the native
            shell: there the closet is its own bottom tab, and routing this
            WebView to /closet would show the closet inside the Feed tab. */}
        {!shellTab && (
          <div className="shrink-0 bg-white dark:bg-[#1c1c1e] border-b border-black/5 dark:border-white/10">
            <ClosetSectionTabs active="feed" className="px-4 py-2" />
          </div>
        )}

        {/* Feed grid (pull down from the top to refresh) */}
        <div className="relative flex-1 overflow-hidden">
          {/* Pull-to-refresh spinner, pinned to the visible top */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-end justify-center overflow-hidden"
            style={{ height: offset }}
          >
            <RefreshCw
              size={20}
              className={`mb-2 text-black/45 dark:text-white/45 ${refreshing ? 'animate-spin' : ''}`}
              style={refreshing ? undefined : { transform: `rotate(${(offset / PULL_THRESHOLD) * 180}deg)` }}
            />
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="h-full overflow-y-auto"
            style={{ overscrollBehaviorY: 'contain' }}
          >
            <div
              className="min-h-full"
              style={{ transform: `translateY(${offset}px)`, transition: pull > 0 ? 'none' : 'transform 0.2s ease' }}
            >
              {/* Pinterest-style masonry: image-first tiles, no author / like /
                  comment affordances on the grid (those live on the detail page). */}
              {!loading && posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center px-10" style={{ minHeight: '60%' }}>
                  <p className="text-[15px] text-black/55 dark:text-white/55 mt-20">{t.feed_empty}</p>
                </div>
              ) : (
                <div style={{ paddingBottom: NAV_INSET }}>
                  <MasonryGrid
                    className="pt-2"
                    posts={posts}
                    loading={loading}
                    trackImpressions
                    onOpen={openPost}
                    onMore={setActionsPost}
                    footer={
                      fetchingMore ? (
                        <div className="py-4 text-center text-[13px] text-black/40 dark:text-white/40">…</div>
                      ) : null
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Publish FAB — lowered toward the bottom edge (was at NAV_INSET). */}
        <button
          onClick={() => router.push('/feed/create')}
          className="absolute right-4 flex items-center justify-center rounded-full text-white shadow-lg active:opacity-90"
          style={{ width: 52, height: 52, background: '#F370A7', bottom: FAB_BOTTOM }}
          aria-label={t.feed_publish_short}
        >
          <Plus size={24} strokeWidth={2.6} />
        </button>

        {/* ⋯ sheet lives at page level — outside the pull-to-refresh transform.
            The snapshot effect above re-caches the filtered list automatically. */}
        {actionsPost && (
          <PostActionsSheet
            post={actionsPost}
            onClose={() => setActionsPost(null)}
            onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
            onHidden={(userId) => setPosts((prev) => prev.filter((p) => p.author.id !== userId))}
          />
        )}
      </div>
    </>
  );
}

export default function FeedPage() {
  return (
    <FeedGuard>
      <FeedHome />
    </FeedGuard>
  );
}
