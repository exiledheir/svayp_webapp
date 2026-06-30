import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Plus, User } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getFeed } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import type { FeedPost } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import FeedCard from '@/components/feed/FeedCard';

const PAGE_SIZE = 10;
// Bottom inset so content / FAB clear the native Flutter navbar (this page is a
// WebView tab in the shell — like Closet/Market, it does not render the web
// BottomNav, which would otherwise double up with the native bar).
const NAV_INSET = 'calc(84px + env(safe-area-inset-bottom, 0px))';

function FeedHome() {
  const router = useRouter();
  const { t } = useI18n();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [fetchingMore, setFetchingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

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

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 800) loadMore();
  }

  function handleLikeChange(postId: string, next: { isLiked: boolean; likesCount: number }) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isLiked: next.isLiked, likesCount: next.likesCount } : p)));
  }
  function handleHidden(userId: string) {
    setPosts((prev) => prev.filter((p) => p.author.id !== userId));
  }
  function handleDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
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
          <button
            onClick={() => router.push('/feed/me')}
            className="ml-auto w-9 h-9 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 text-black dark:text-white"
            aria-label={t.feed_go_to_profile}
          >
            <User size={18} />
          </button>
        </div>

        {/* Feed list */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
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
                <FeedCard
                  key={post.id}
                  post={post}
                  onLikeChange={handleLikeChange}
                  onHidden={handleHidden}
                  onDeleted={handleDeleted}
                />
              ))}
              {fetchingMore && (
                <div className="py-4 text-center text-[13px] text-black/40 dark:text-white/40">…</div>
              )}
            </div>
          )}
        </div>

        {/* Publish FAB — sits above the native Flutter navbar */}
        <button
          onClick={() => router.push('/feed/create')}
          className="absolute right-4 flex items-center justify-center rounded-full text-white shadow-lg active:opacity-90"
          style={{ width: 52, height: 52, background: '#F370A7', bottom: NAV_INSET }}
          aria-label={t.feed_publish_short}
        >
          <Plus size={24} strokeWidth={2.6} />
        </button>
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
