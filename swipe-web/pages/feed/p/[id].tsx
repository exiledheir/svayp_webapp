import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ChevronLeft, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getPost, getRelatedPosts, toggleLike } from '@/lib/feed-api';
import { timeAgo } from '@/lib/feed-format';
import { coverAspect, NAV_INSET } from '@/lib/feed-layout';
import { fetchImageBlob, shareImageBlob } from '@/lib/share-image';
import { clearPageCache } from '@/lib/page-cache';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import type { FeedPost } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import Avatar from '@/components/feed/Avatar';
import ImageCarousel from '@/components/feed/ImageCarousel';
import LikeButton from '@/components/feed/LikeButton';
import SaveButton from '@/components/feed/SaveButton';
import MasonryGrid from '@/components/feed/MasonryGrid';
import CommentsSheet from '@/components/feed/CommentsSheet';
import PostActionsSheet from '@/components/feed/PostActionsSheet';

// Floating back button sits over the image, below the status bar.
const BACK_TOP = 'calc(12px + var(--safe-top))';
// The hero carousel gets rounded bottom corners over the page background.
const HERO_RADIUS = '0 0 24px 24px';

/**
 * Pinterest-style pin page: hero image → action row (muted like, comments,
 * share, ⋯, primary **Save**) → author → caption → "More to explore" masonry.
 */
function FeedPostDetail({ id }: { id: string }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  // Where "Back" returns to: the opener passes ?from=<path> (feed grid, profile,
  // a previous post, …). Guarded to internal /feed routes; defaults to the feed.
  const backTo =
    typeof router.query.from === 'string' && router.query.from.startsWith('/feed') ? router.query.from : '/feed';

  const [post, setPost] = React.useState<FeedPost | null>(null);
  const [loading, setLoading] = React.useState(true);
  // null = still loading; [] = nothing related (section hidden).
  const [related, setRelated] = React.useState<FeedPost[] | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [relatedActionsPost, setRelatedActionsPost] = React.useState<FeedPost | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPost(id)
      .then((p) => {
        if (cancelled) return;
        setPost(p);
        logAnalyticsEvent(Events.FEED_POST_VIEWED, { [Params.POST_ID]: id });
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    getRelatedPosts(id, 20)
      .then((list) => !cancelled && setRelated(list))
      .catch(() => !cancelled && setRelated([]));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Double-tap to like (Instagram): likes only when not already liked.
  const likeBusy = React.useRef(false);
  async function handleDoubleTapLike() {
    if (!post || post.isLiked || likeBusy.current) return;
    likeBusy.current = true;
    const prevCount = post.likesCount;
    setPost((p) => (p ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p));
    try {
      const res = await toggleLike(post.id);
      setPost((p) => (p ? { ...p, isLiked: res.isLiked, likesCount: res.likesCount } : p));
    } catch {
      setPost((p) => (p ? { ...p, isLiked: false, likesCount: prevCount } : p));
    } finally {
      likeBusy.current = false;
    }
  }

  // Share the image currently visible in the carousel (native sheet in the app,
  // Web Share / download in a browser). Cancelling is a silent no-op.
  const shareBusy = React.useRef(false);
  async function handleShare() {
    if (!post || shareBusy.current) return;
    const url = post.images[idx]?.imageUrl ?? post.images[0]?.imageUrl;
    if (!url) return;
    shareBusy.current = true;
    try {
      await shareImageBlob(await fetchImageBlob(url), 'libas-look.jpg');
      logAnalyticsEvent(Events.FEED_POST_SHARED, { [Params.POST_ID]: post.id });
    } catch {
      /* image unavailable — nothing to share */
    } finally {
      shareBusy.current = false;
    }
  }

  // Related tile → its own detail page; `from` = this page so Back walks the chain.
  const openPost = (p: FeedPost) => router.push(`/feed/p/${p.id}?from=${encodeURIComponent(router.asPath)}`);

  const iconBtn = 'w-9 h-9 flex items-center justify-center text-black dark:text-white active:opacity-60';

  return (
    <>
      <Head>
        <title>{t.feed_title} · LIBΛS</title>
      </Head>
      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Floating back over the hero (no top bar). Return to the opener via
            `from` — NOT router.back(): inside the native WebView the
            about:blank→url load inflates history.length, so back() steps to a
            blank entry and the button appears dead (see /feed/create). */}
        <button
          onClick={() => router.push(backTo)}
          className="absolute left-3 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-[#1c1c1e] text-black dark:text-white shadow-md active:opacity-80"
          style={{ top: BACK_TOP }}
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>

        {loading ? (
          <div className="flex-1 overflow-hidden">
            <div className="bg-black/5 dark:bg-white/10 animate-pulse" style={{ aspectRatio: '4/5', borderRadius: HERO_RADIUS }} />
            <div className="flex items-center px-3 pt-3">
              <div className="h-6 w-28 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="ml-auto h-10 w-24 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
            </div>
            <div className="flex items-center gap-2.5 px-3.5 pt-4">
              <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="h-3.5 w-32 rounded bg-black/5 dark:bg-white/10 animate-pulse" />
            </div>
          </div>
        ) : !post ? (
          <div className="flex-1 flex items-center justify-center px-10 text-center text-[15px] text-black/55 dark:text-white/55">
            {t.feed_profile_empty}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: NAV_INSET }}>
            {/* Hero — shown at the cover's natural aspect so nothing is cropped. */}
            <ImageCarousel
              images={post.images}
              alt={post.caption ?? 'outfit'}
              aspectRatio={String(coverAspect(post))}
              frameStyle={{ borderRadius: HERO_RADIUS, overflow: 'hidden', isolation: 'isolate' }}
              onDoubleTapLike={handleDoubleTapLike}
              onIndexChange={setIdx}
            />

            {/* Action row: quiet like / comments / share / ⋯ … primary Save */}
            <div className="flex items-center gap-0.5 px-3 pt-3">
              <div className="px-1.5">
                <LikeButton
                  muted
                  postId={post.id}
                  liked={post.isLiked}
                  count={post.likesCount}
                  onChange={(next) => setPost((p) => (p ? { ...p, isLiked: next.isLiked, likesCount: next.likesCount } : p))}
                />
              </div>
              <button onClick={() => setCommentsOpen(true)} className={iconBtn} aria-label={t.feed_comments_title}>
                <MessageCircle size={22} strokeWidth={2} />
              </button>
              <button onClick={handleShare} className={iconBtn} aria-label={t.share}>
                <Share2 size={21} strokeWidth={2} />
              </button>
              <button onClick={() => setSheetOpen(true)} className={iconBtn} aria-label="More">
                <MoreHorizontal size={22} strokeWidth={2} />
              </button>
              <div className="ml-auto">
                <SaveButton
                  postId={post.id}
                  saved={post.isSaved}
                  onChange={(next) => setPost((p) => (p ? { ...p, isSaved: next.isSaved } : p))}
                />
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center gap-2.5 px-3.5 pt-4">
              <button
                className="flex items-center gap-2.5 min-w-0"
                onClick={() => router.push(`/feed/${post.author.username}?from=${encodeURIComponent(router.asPath)}`)}
              >
                <Avatar url={post.author.avatarUrl} name={post.author.displayName || post.author.username} size={36} />
                <div className="min-w-0 text-left">
                  <p className="text-[14px] font-semibold leading-tight text-black dark:text-white truncate">
                    {post.author.displayName || post.author.username}
                  </p>
                  <p className="text-[12px] leading-tight text-black/45 dark:text-white/45 truncate">@{post.author.username}</p>
                </div>
              </button>
              <span className="ml-auto shrink-0 text-[12px] text-black/40 dark:text-white/40">{timeAgo(post.createdAt, locale)}</span>
            </div>

            {post.caption && (
              <p className="px-3.5 pt-2.5 text-[14px] leading-snug text-black dark:text-[#e8e8e8]">{post.caption}</p>
            )}

            {/* More to explore — hidden once we know there's nothing related. */}
            {(related === null || related.length > 0) && (
              <>
                <h2 className="px-3.5 pt-6 pb-2 text-[15px] font-bold text-black dark:text-white">{t.feed_more_to_explore}</h2>
                <MasonryGrid posts={related ?? []} loading={related === null} onOpen={openPost} onMore={setRelatedActionsPost} />
              </>
            )}
          </div>
        )}

        {sheetOpen && post && (
          <PostActionsSheet
            post={post}
            onClose={() => setSheetOpen(false)}
            onDeleted={() => {
              clearPageCache('feed:posts');
              router.replace(backTo);
            }}
            onHidden={() => {
              clearPageCache('feed:posts');
              router.replace('/feed');
            }}
          />
        )}

        {relatedActionsPost && (
          <PostActionsSheet
            post={relatedActionsPost}
            onClose={() => setRelatedActionsPost(null)}
            onDeleted={(postId) => {
              clearPageCache('feed:posts');
              setRelated((r) => r?.filter((p) => p.id !== postId) ?? r);
            }}
            onHidden={(userId) => {
              clearPageCache('feed:posts');
              setRelated((r) => r?.filter((p) => p.author.id !== userId) ?? r);
            }}
          />
        )}

        {commentsOpen && post && (
          <CommentsSheet
            postId={post.id}
            onClose={() => setCommentsOpen(false)}
            onCountChange={(n) => setPost((p) => (p ? { ...p, commentsCount: n } : p))}
          />
        )}
      </div>
    </>
  );
}

export default function FeedPostDetailPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  return (
    <FeedGuard>
      {/* Keyed by id: navigating post → related post remounts with fresh state
          and a scroller at the top instead of reusing the previous instance. */}
      <FeedPostDetail key={id} id={id} />
    </FeedGuard>
  );
}
