import React from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, LayoutGrid, Bookmark } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toggleFollow, getSavedPosts } from '@/lib/feed-api';
import { openDirectChat } from '@/lib/direct-chat';
import { NAV_INSET } from '@/lib/feed-layout';
import type { FeedPost, FeedProfile } from '@/types/feed';
import ProfileHeader from '@/components/feed/ProfileHeader';
import MasonryGrid from '@/components/feed/MasonryGrid';
import TabButton from '@/components/feed/TabButton';
import PostActionsSheet from '@/components/feed/PostActionsSheet';
import ProfileEditSheet from '@/components/feed/ProfileEditSheet';
import FollowersSheet from '@/components/feed/FollowersSheet';

type ProfileTab = 'posts' | 'saved';

interface Props {
  profile: FeedProfile;
  posts: FeedPost[];
  loading: boolean;
  /** Open the editor immediately on mount (e.g. first-time username setup). */
  startEditing?: boolean;
  onProfileUpdated?: (p: FeedProfile) => void;
  /** A post was deleted from the ⋯ sheet (own profile). */
  onPostDeleted?: (postId: string) => void;
  /** The viewer hid this profile's author from the ⋯ sheet. */
  onUserHidden?: (userId: string) => void;
}

/** Shared profile screen used by /feed/[username] and /feed/me. Own profile
 *  gets a Pinterest-style Posts | Saved strip; others show just their posts. */
export default function ProfileView({ profile, posts, loading, startEditing, onProfileUpdated, onPostDeleted, onUserHidden }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  // Where "Back" returns to: the opener passes ?from=<path> (a post's author,
  // a followers row, …). Guarded to internal /feed routes; defaults to the feed.
  const backTo =
    typeof router.query.from === 'string' && router.query.from.startsWith('/feed') ? router.query.from : '/feed';
  const [editing, setEditing] = React.useState(!!startEditing && profile.isOwn);
  const [sheet, setSheet] = React.useState<null | 'followers' | 'following'>(null);
  const [followBusy, setFollowBusy] = React.useState(false);
  const [messageBusy, setMessageBusy] = React.useState(false);
  const [tab, setTab] = React.useState<ProfileTab>('posts');
  // Saved posts load lazily the first time the tab is opened (own profile only).
  const [saved, setSaved] = React.useState<FeedPost[] | null>(null);
  const [actionsPost, setActionsPost] = React.useState<FeedPost | null>(null);

  React.useEffect(() => {
    if (!profile.isOwn || tab !== 'saved' || saved !== null) return;
    let cancelled = false;
    getSavedPosts(0, 60)
      .then((r) => !cancelled && setSaved(r.content))
      .catch(() => !cancelled && setSaved([]));
    return () => {
      cancelled = true;
    };
  }, [profile.isOwn, tab, saved]);

  // Open a direct chat in the native Flutter chat module (falls back to
  // /chat/{id} in a plain browser). Only reachable once you follow the user.
  async function handleMessage() {
    if (messageBusy || profile.isOwn) return;
    setMessageBusy(true);
    try {
      await openDirectChat(router, profile.userId);
    } catch {
      /* backend unavailable — leave the button; no dead-end fallback for DMs */
    } finally {
      setMessageBusy(false);
    }
  }

  async function handleToggleFollow() {
    if (followBusy || profile.isOwn) return;
    setFollowBusy(true);
    const prev = profile;
    // Optimistic flip, then reconcile with the authoritative count (or revert).
    onProfileUpdated?.({
      ...prev,
      isFollowing: !prev.isFollowing,
      followersCount: prev.followersCount + (prev.isFollowing ? -1 : 1),
    });
    try {
      const res = await toggleFollow(prev.userId);
      onProfileUpdated?.({ ...prev, isFollowing: res.isFollowing, followersCount: res.followersCount });
    } catch {
      onProfileUpdated?.(prev);
    } finally {
      setFollowBusy(false);
    }
  }

  const openPost = (p: FeedPost) => router.push(`/feed/p/${p.id}?from=${encodeURIComponent(router.asPath)}`);
  const showSaved = profile.isOwn && tab === 'saved';

  return (
    <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-2 px-3 py-3 shrink-0 border-b border-black/5 dark:border-white/10">
        {/* Return to the opener via `from` — NOT router.back(): inside the native
            WebView the about:blank→url load inflates history.length, so back()
            steps to a blank entry and the button appears dead (see /feed/create). */}
        <button onClick={() => router.push(backTo)} className="text-black dark:text-white p-1" aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-[16px] font-bold text-black dark:text-white truncate">@{profile.username}</h1>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: NAV_INSET }}>
        <ProfileHeader
          profile={profile}
          onEdit={() => setEditing(true)}
          onFollowersClick={() => setSheet('followers')}
          onFollowingClick={() => setSheet('following')}
          onToggleFollow={handleToggleFollow}
          onMessage={handleMessage}
          followBusy={followBusy}
          messageBusy={messageBusy}
        />

        {profile.isOwn && (
          <div className="flex border-b border-black/5 dark:border-white/10">
            <TabButton icon={<LayoutGrid size={16} />} label={t.feed_tab_posts} active={tab === 'posts'} onClick={() => setTab('posts')} />
            <TabButton icon={<Bookmark size={16} />} label={t.feed_tab_saved} active={tab === 'saved'} onClick={() => setTab('saved')} />
          </div>
        )}

        <MasonryGrid
          className="pt-2"
          posts={showSaved ? saved ?? [] : posts}
          loading={showSaved ? saved === null : loading}
          onOpen={openPost}
          onMore={setActionsPost}
          emptyHint={showSaved ? t.feed_saved_empty : t.feed_profile_empty}
        />
      </div>

      {actionsPost && (
        <PostActionsSheet
          post={actionsPost}
          onClose={() => setActionsPost(null)}
          onDeleted={(postId) => {
            setSaved((s) => s?.filter((p) => p.id !== postId) ?? s);
            onPostDeleted?.(postId);
          }}
          onHidden={(userId) => {
            setSaved((s) => s?.filter((p) => p.author.id !== userId) ?? s);
            onUserHidden?.(userId);
          }}
        />
      )}

      {editing && profile.isOwn && (
        <ProfileEditSheet
          profile={profile}
          onSaved={(p) => onProfileUpdated?.(p)}
          onClose={() => setEditing(false)}
        />
      )}

      {sheet && (
        <FollowersSheet
          userId={profile.userId}
          mode={sheet}
          title={sheet === 'following' ? t.feed_following_title : t.feed_followers_title}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
