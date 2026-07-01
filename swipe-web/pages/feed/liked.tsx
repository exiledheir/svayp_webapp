import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ChevronLeft, Heart, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getLikedPosts, getCommentedPosts } from '@/lib/feed-api';
import type { FeedPost } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import PostGrid from '@/components/feed/PostGrid';

type Tab = 'liked' | 'commented';

function FeedLiked() {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = React.useState<Tab>('liked');
  const [liked, setLiked] = React.useState<FeedPost[] | null>(null);
  const [commented, setCommented] = React.useState<FeedPost[] | null>(null);

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
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-black/5 dark:bg-white/10 animate-pulse" style={{ aspectRatio: '3/4' }} />
              ))}
            </div>
          ) : (
            <PostGrid posts={posts ?? []} emptyHint={tab === 'liked' ? t.feed_liked_empty : t.feed_commented_empty} />
          )}
        </div>
      </div>
    </>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[14px] font-semibold border-b-2 transition-colors ${
        active ? 'text-black dark:text-white' : 'text-black/40 dark:text-white/40 border-transparent'
      }`}
      style={active ? { borderColor: '#F370A7' } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

export default function FeedLikedPage() {
  return (
    <FeedGuard>
      <FeedLiked />
    </FeedGuard>
  );
}
