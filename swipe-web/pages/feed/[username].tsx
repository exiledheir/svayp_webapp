import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getProfileByUsername, getUserPosts } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import type { FeedPost, FeedProfile } from '@/types/feed';
import FeedGuard from '@/components/feed/FeedGuard';
import ProfileView from '@/components/feed/ProfileView';

function FeedUserProfile() {
  const router = useRouter();
  const username = typeof router.query.username === 'string' ? router.query.username : '';
  const [profile, setProfile] = React.useState<FeedProfile | null>(null);
  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setLoading(true);
    getProfileByUsername(username)
      .then(async (p) => {
        if (cancelled) return;
        setProfile(p);
        logAnalyticsEvent(Events.FEED_PROFILE_VIEWED);
        const res = await getUserPosts(p.userId, 0, 30).catch(() => ({ content: [] as FeedPost[] }));
        if (!cancelled) setPosts(res.content);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (error || (!profile && !loading)) {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: '100dvh' }} />;
  }
  if (!profile) {
    return <div className="phone-container bg-white dark:bg-[#111111]" style={{ height: '100dvh' }} />;
  }

  return (
    <>
      <Head>
        <title>@{profile.username} · LIBΛS</title>
      </Head>
      <ProfileView
        profile={profile}
        posts={posts}
        loading={loading}
        onProfileUpdated={(p) => setProfile(p)}
      />
    </>
  );
}

export default function FeedUserProfilePage() {
  return (
    <FeedGuard>
      <FeedUserProfile />
    </FeedGuard>
  );
}
