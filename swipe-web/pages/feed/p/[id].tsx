import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getPost } from '@/lib/feed-api';
import { timeAgo } from '@/lib/feed-format';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import type { FeedPost } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import Avatar from '@/components/feed/Avatar';
import ImageCarousel from '@/components/feed/ImageCarousel';
import LikeButton from '@/components/feed/LikeButton';
import PostActionsSheet from '@/components/feed/PostActionsSheet';

function FeedPostDetail() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [post, setPost] = React.useState<FeedPost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPost(id)
      .then((p) => {
        if (cancelled) return;
        setPost(p);
        logAnalyticsEvent(Events.FEED_POST_VIEWED);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Head>
        <title>{t.feed_title} · LIBΛS</title>
      </Head>
      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        <div className="flex items-center gap-2 px-3 py-3 shrink-0 border-b border-black/5 dark:border-white/10">
          {/* Return to the feed directly — NOT router.back(): inside the native
              WebView the about:blank→url load inflates history.length, so back()
              steps to a blank entry and the button appears dead (see /feed/create). */}
          <button onClick={() => router.push('/feed')} className="text-black dark:text-white p-1" aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-[16px] font-bold text-black dark:text-white">{t.feed_title}</h1>
        </div>

        {loading || !post ? (
          <div className="flex-1 bg-black/5 dark:bg-white/10 animate-pulse" />
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Author */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <button className="flex items-center gap-2.5 min-w-0" onClick={() => router.push(`/feed/${post.author.username}`)}>
                <Avatar url={post.author.avatarUrl} name={post.author.displayName || post.author.username} size={36} />
                <div className="min-w-0 text-left">
                  <p className="text-[14px] font-semibold leading-tight text-black dark:text-white truncate">
                    {post.author.displayName || post.author.username}
                  </p>
                  <p className="text-[12px] leading-tight text-black/45 dark:text-white/45 truncate">@{post.author.username}</p>
                </div>
              </button>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[12px] text-black/40 dark:text-white/40">{timeAgo(post.createdAt, locale)}</span>
                <button onClick={() => setSheetOpen(true)} aria-label="More" className="text-black/60 dark:text-white/60 p-1">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            <ImageCarousel images={post.images} alt={post.caption ?? 'outfit'} />

            <div className="px-3.5 pt-3 pb-6">
              <LikeButton
                postId={post.id}
                liked={post.isLiked}
                count={post.likesCount}
                onChange={(next) => setPost((p) => (p ? { ...p, isLiked: next.isLiked, likesCount: next.likesCount } : p))}
              />
              {post.caption && (
                <p className="text-[14px] leading-snug mt-2 text-black dark:text-[#e8e8e8]">
                  <span className="font-semibold mr-1.5">{post.author.username}</span>
                  {post.caption}
                </p>
              )}
            </div>
          </div>
        )}

        {sheetOpen && post && (
          <PostActionsSheet
            post={post}
            onClose={() => setSheetOpen(false)}
            onDeleted={() => router.replace('/feed')}
            onHidden={() => router.replace('/feed')}
          />
        )}
      </div>
    </>
  );
}

export default function FeedPostDetailPage() {
  return (
    <FeedGuard>
      <FeedPostDetail />
    </FeedGuard>
  );
}
