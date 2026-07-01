import React from 'react';
import { useRouter } from 'next/router';
import { useI18n } from '@/lib/i18n';
import type { FeedPost } from '@/types/feed';

interface Props {
  posts: FeedPost[];
  emptyHint?: string;
}

/** 3-column grid of post covers (image[0]); tap opens the post detail. */
export default function PostGrid({ posts, emptyHint }: Props) {
  const router = useRouter();
  const { t } = useI18n();

  if (posts.length === 0) {
    return <p className="text-center text-[14px] text-black/45 dark:text-white/45 py-12">{emptyHint ?? t.feed_profile_empty}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((post) => {
        const cover = post.images[0]?.imageUrl;
        return (
          <button
            key={post.id}
            onClick={() => router.push(`/feed/p/${post.id}?from=${encodeURIComponent(router.asPath)}`)}
            className="relative"
            style={{ aspectRatio: '3/4', background: '#F7F7F8' }}
          >
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="w-full h-full object-cover" />
            )}
            {post.images.length > 1 && (
              <span className="absolute top-1 right-1 text-white text-[10px] font-bold px-1 rounded" style={{ background: 'rgba(0,0,0,0.45)' }}>
                {post.images.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
