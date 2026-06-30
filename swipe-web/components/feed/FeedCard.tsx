import React from 'react';
import { useRouter } from 'next/router';
import { MoreHorizontal } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { timeAgo } from '@/lib/feed-format';
import Avatar from '@/components/feed/Avatar';
import ImageCarousel from '@/components/feed/ImageCarousel';
import LikeButton from '@/components/feed/LikeButton';
import PostActionsSheet from '@/components/feed/PostActionsSheet';
import type { FeedPost } from '@/types/feed';

interface Props {
  post: FeedPost;
  onLikeChange?: (postId: string, next: { isLiked: boolean; likesCount: number }) => void;
  onHidden?: (userId: string) => void;
  onDeleted?: (postId: string) => void;
}

/** A single post in the feed: author row, image carousel, like + caption. */
export default function FeedCard({ post, onLikeChange, onHidden, onDeleted }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const openProfile = () => router.push(`/feed/${post.author.username}`);
  const openPost = () => router.push(`/feed/p/${post.id}`);

  return (
    <div className="bg-white dark:bg-[#1c1c1e]">
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
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px] text-black/40 dark:text-white/40">{timeAgo(post.createdAt, locale)}</span>
          <button onClick={() => setSheetOpen(true)} aria-label="More" className="text-black/60 dark:text-white/60 p-1">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Images */}
      <ImageCarousel images={post.images} alt={post.caption ?? 'outfit'} onClick={openPost} />

      {/* Actions + caption */}
      <div className="px-3.5 pt-2.5 pb-3.5">
        <LikeButton
          postId={post.id}
          liked={post.isLiked}
          count={post.likesCount}
          onChange={(next) => onLikeChange?.(post.id, next)}
        />
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
      </div>

      {sheetOpen && (
        <PostActionsSheet
          post={post}
          onClose={() => setSheetOpen(false)}
          onHidden={onHidden}
          onDeleted={onDeleted}
          onReported={() => undefined}
        />
      )}
    </div>
  );
}
