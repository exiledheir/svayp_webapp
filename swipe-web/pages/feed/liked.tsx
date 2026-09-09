import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ChevronLeft, Heart, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getLikedPosts, getCommentedPosts } from '@/lib/feed-api';
import { NAV_INSET } from '@/lib/feed-layout';
import { clearPageCache } from '@/lib/page-cache';
import type { FeedPost } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import MasonryGrid from '@/components/feed/MasonryGrid';
import TabButton from '@/components/feed/TabButton';
import PostActionsSheet from '@/components/feed/PostActionsSheet';

type Tab = 'liked' | 'commented';

function FeedLiked() {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = React.useState<Tab>('liked');
  const [liked, setLiked] = React.useState<FeedPost[] | null>(null);
  const [commented, setCommented] = React.useState<FeedPost[] | null>(null);
  const [actionsPost, setActionsPost] = React.useState<FeedPost | null>(null);

  React.useEffect(() => {
    getLikedPosts(0, 60)
      .then((r) => setLiked(r.content))
      .catch(() => setLiked([]));
    getCommentedPosts(0, 60)
      .then((r) => setCommented(r.content))
      .catch(() => setCommented([]));
  }, []);

  const posts = tab === 'liked' ? liked : commented;
  const loading = posts === null;

  const openPost = (p: FeedPost) => router.push(`/feed/p/${p.id}?from=${encodeURIComponent(router.asPath)}`);
  // Drop a post from both lists (delete) or every post by an author (hide).
  function dropWhere(pred: (p: FeedPost) => boolean) {
    setLiked((l) => l?.filter((p) => !pred(p)) ?? l);
    setCommented((c) => c?.filter((p) => !pred(p)) ?? c);
    clearPageCache('feed:posts');
  }

  return (
    <>
      <Head>
        <title>{t.feed_activity_title} · LIBΛS</title>
      </Head>
      <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
        {/* Header — return to the feed directly (NOT router.back(); see /feed/create). */}
        <div className="flex items-center gap-2 px-3 py-3 shrink-0 border-b border-black/5 dark:border-white/10">
          <button onClick={() => router.push('/feed')} className="text-black dark:text-white p-1" aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-[16px] font-bold text-black dark:text-white">{t.feed_activity_title}</h1>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-black/5 dark:border-white/10">
          <TabButton icon={<Heart size={16} />} label={t.feed_tab_liked} active={tab === 'liked'} onClick={() => setTab('liked')} />
          <TabButton icon={<MessageCircle size={16} />} label={t.feed_tab_commented} active={tab === 'commented'} onClick={() => setTab('commented')} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: NAV_INSET }}>
          <MasonryGrid
            className="pt-2"
            posts={posts ?? []}
            loading={loading}
            onOpen={openPost}
            onMore={setActionsPost}
            emptyHint={tab === 'liked' ? t.feed_liked_empty : t.feed_commented_empty}
          />
        </div>

        {actionsPost && (
          <PostActionsSheet
            post={actionsPost}
            onClose={() => setActionsPost(null)}
            onDeleted={(postId) => dropWhere((p) => p.id === postId)}
            onHidden={(userId) => dropWhere((p) => p.author.id === userId)}
          />
        )}
      </div>
    </>
  );
}

export default function FeedLikedPage() {
  return (
    <FeedGuard>
      <FeedLiked />
    </FeedGuard>
  );
}
