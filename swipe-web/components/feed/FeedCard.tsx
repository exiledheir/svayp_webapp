import React from 'react';
import { useRouter } from 'next/router';
import { MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toggleLike } from '@/lib/feed-api';
import { timeAgo, formatCount } from '@/lib/feed-format';
import Avatar from '@/components/feed/Avatar';
import ImageCarousel from '@/components/feed/ImageCarousel';
import LikeButton from '@/components/feed/LikeButton';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import type { FeedPost } from '@/types/feed';

// Дедуп показов постов в рамках визита страницы (общий для всех карточек).
const seenPostImpressions = new Set<string>();

interface Props {
  post: FeedPost;
  onLikeChange?: (postId: string, next: { isLiked: boolean; likesCount: number }) => void;
  /** Open the comments sheet. Owned by the page (rendered outside the scrolling,
   *  transformed feed list) so it overlays the whole screen correctly. */
  onOpenComments?: (post: FeedPost) => void;
}

/** A single post in the feed: author row, image carousel, like + comment, caption. */
export default function FeedCard({ post, onLikeChange, onOpenComments }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = React.useState(false);

  const openProfile = () => router.push(`/feed/${post.author.username}?from=${encodeURIComponent(router.asPath)}`);

  // Показ поста: карточка видна >=50% площади не меньше 1 секунды, один раз
  // за визит — иначе воронка ленты не отличает «открыл ленту» от «реально видел посты».
  const cardRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = cardRef.current;
    if (!el || seenPostImpressions.has(post.id) || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            if (!seenPostImpressions.has(post.id)) {
              seenPostImpressions.add(post.id);
              logAnalyticsEvent(Events.FEED_POST_IMPRESSION, { [Params.POST_ID]: post.id });
            }
            observer.disconnect();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [post.id]);

  // Double-tap to like (Instagram): likes only when not already liked; the heart
  // burst animation plays either way (handled inside ImageCarousel).
  const likeBusy = React.useRef(false);
  async function handleDoubleTapLike() {
    if (post.isLiked || likeBusy.current) return;
    likeBusy.current = true;
    onLikeChange?.(post.id, { isLiked: true, likesCount: post.likesCount + 1 }); // optimistic
    try {
      const res = await toggleLike(post.id);
      onLikeChange?.(post.id, res);
    } catch {
      onLikeChange?.(post.id, { isLiked: post.isLiked, likesCount: post.likesCount }); // revert
    } finally {
      likeBusy.current = false;
    }
  }

  return (
    <div ref={cardRef} className="bg-white dark:bg-[#1c1c1e]">
      {/* Author row */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <button className="flex items-center gap-2.5 min-w-0" onClick={openProfile}>
          <Avatar url={post.author.avatarUrl} name={post.author.displayName || post.author.username} size={36} />
          <div className="min-w-0 text-left">
            <p className="text-[14px] font-semibold leading-tight text-black dark:text-white truncate">
              {post.author.displayName || post.author.username}
            </p>
            <p className="text-[12px] leading-tight text-black/45 dark:text-white/45 truncate">@{post.author.username}</p>
          </div>
        </button>
        <span className="ml-auto text-[12px] text-black/40 dark:text-white/40">{timeAgo(post.createdAt, locale)}</span>
      </div>

      {/* Images */}
      <ImageCarousel images={post.images} alt={post.caption ?? 'outfit'} onDoubleTapLike={handleDoubleTapLike} />

      {/* Actions + caption */}
      <div className="px-3.5 pt-2.5 pb-3.5">
        <div className="flex items-center gap-4">
          <LikeButton
            postId={post.id}
            liked={post.isLiked}
            count={post.likesCount}
            onChange={(next) => onLikeChange?.(post.id, next)}
          />
          <button className="flex items-center gap-1.5" onClick={() => onOpenComments?.(post)} aria-label={t.feed_comments_title}>
            <MessageCircle size={23} strokeWidth={2} className="text-black dark:text-white" />
            {post.commentsCount > 0 && (
              <span className="text-[14px] font-semibold text-black dark:text-white tabular-nums">{formatCount(post.commentsCount)}</span>
            )}
          </button>
        </div>

        {post.caption && (
          <p className="text-[14px] leading-snug mt-2 text-black dark:text-[#e8e8e8]">
            <span className="font-semibold mr-1.5">{post.author.username}</span>
            <span
              style={
                expanded
                  ? undefined
                  : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }
              }
            >
              {post.caption}
            </span>
            {!expanded && post.caption.length > 90 && (
              <button className="text-black/45 dark:text-white/45 ml-1" onClick={() => setExpanded(true)}>
                …{locale === 'en' ? 'more' : locale === 'uz' ? 'ko‘proq' : 'ещё'}
              </button>
            )}
          </p>
        )}

        {post.commentsCount > 0 && (
          <button
            className="block text-[13px] text-black/45 dark:text-white/45 mt-1.5"
            onClick={() => onOpenComments?.(post)}
          >
            {t.feed_view_comments.replace('{n}', String(post.commentsCount))}
          </button>
        )}
      </div>
    </div>
  );
}
