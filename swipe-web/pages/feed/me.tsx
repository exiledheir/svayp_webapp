import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { isAuthenticated } from '@/lib/auth';
import { getMyProfile, getMyPosts } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import type { FeedPost, FeedProfile } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import ProfileView from '@/components/feed/ProfileView';

function FeedMyProfile() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<FeedProfile | null>(null);
  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [loading, setLoading] = React.useState(true);

  // ?setup=1 → open the editor on mount (first-time username setup from publish).
  const startEditing = router.query.setup === '1';

  React.useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/closet');
      return;
    }
    let cancelled = false;
    setLoading(true);
    getMyProfile()
      .then(async (p) => {
        if (cancelled) return;
        setProfile({ ...p, isOwn: true });
        logAnalyticsEvent(Events.FEED_PROFILE_VIEWED);
        const res = await getMyPosts(0, 30).catch(() => ({ content: [] as FeedPost[] }));
        if (!cancelled) setPosts(res.content);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!profile) {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: '100dvh' }} />;
  }

  return (
    <>
      <Head>
        <title>{profile.username ? `@${profile.username}` : 'Профиль'} · LIBΛS</title>
      </Head>
      <ProfileView
        profile={profile}
        posts={posts}
        loading={loading}
        startEditing={startEditing || !profile.username}
        onProfileUpdated={(p) => setProfile({ ...p, isOwn: true })}
      />
    </>
  );
}

export default function FeedMyProfilePage() {
  return (
    <FeedGuard>
      <FeedMyProfile />
    </FeedGuard>
  );
}
