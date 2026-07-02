import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus, User, Heart, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getFeed } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import type { FeedPost } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import FeedCard from '@/components/feed/FeedCard';
import CommentsSheet from '@/components/feed/CommentsSheet';

const PAGE_SIZE = 10;
// Bottom inset so content / FAB clear the native Flutter navbar (this page is a
// WebView tab in the shell — like Closet/Market, it does not render the web
// BottomNav, which would otherwise double up with the native bar).
const NAV_INSET = 'calc(84px + env(safe-area-inset-bottom, 0px))';
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

  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [fetchingMore, setFetchingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  // Comments sheet is owned here (not inside FeedCard) so it overlays the whole
  // screen — the feed list is wrapped in a transform for pull-to-refresh, which
  // would otherwise become the sheet's positioning context.
  const [commentsPost, setCommentsPost] = React.useState<FeedPost | null>(null);

  React.useEffect(() => {
    logAnalyticsEvent(Events.FEED_VIEWED);
    getFeed(0, PAGE_SIZE)
      .then((res) => {
        setPosts(res.content);
        setHasMore(res.content.length === PAGE_SIZE);
      })
      .catch(() => setHasMore(false)) // backend may not be live yet → empty state
      .finally(() => setLoading(false));
  }, []);

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

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 800) loadMore();

    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable > 0) {
      const pct = ((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100;
      for (const threshold of [25, 50, 75, 100]) {
        if (pct >= threshold && !scrollDepthRef.current.has(threshold)) {
          scrollDepthRef.current.add(threshold);
          logAnalyticsEvent(Events.FEED_SCROLL_DEPTH, { [Params.DEPTH]: threshold });
        }
      }
    }
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

  function handleLikeChange(postId: string, next: { isLiked: boolean; likesCount: number }) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isLiked: next.isLiked, likesCount: next.likesCount } : p)));
  }

  return (
    <>
      <Head>
        <title>{t.feed_title} · LIBΛS</title>
      </Head>
      <div className="phone-container flex flex-col bg-[#fafafa] dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="flex items-center px-4 py-3 shrink-0 bg-white dark:bg-[#1c1c1e] border-b border-black/5 dark:border-white/10">
          <h1 className="text-[18px] font-extrabold text-black dark:text-white">
            LIB<span style={{ color: '#F370A7' }}>Λ</span>S · {t.feed_title}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => router.push('/feed/liked')}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 text-black dark:text-white"
              aria-label={t.feed_activity_title}
            >
              <Heart size={18} />
            </button>
            <button
              onClick={() => router.push('/feed/me')}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 text-black dark:text-white"
              aria-label={t.feed_go_to_profile}
            >
              <User size={18} />
            </button>
          </div>
        </div>

        {/* Feed list (pull down from the top to refresh) */}
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
              {loading ? (
                <div className="flex flex-col gap-2 p-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" style={{ height: 360 }} />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center px-10" style={{ minHeight: '60%' }}>
                  <p className="text-[15px] text-black/55 dark:text-white/55 mt-20">{t.feed_empty}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2" style={{ paddingBottom: NAV_INSET }}>
                  {posts.map((post) => (
                    <FeedCard key={post.id} post={post} onLikeChange={handleLikeChange} onOpenComments={setCommentsPost} />
                  ))}
                  {fetchingMore && (
                    <div className="py-4 text-center text-[13px] text-black/40 dark:text-white/40">…</div>
                  )}
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

        {commentsPost && (
          <CommentsSheet
            postId={commentsPost.id}
            onClose={() => setCommentsPost(null)}
            onCountChange={(n) =>
              setPosts((prev) => prev.map((p) => (p.id === commentsPost.id ? { ...p, commentsCount: n } : p)))
            }
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
