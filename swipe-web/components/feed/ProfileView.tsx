import React from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft } from 'lucide-react';
import type { FeedPost, FeedProfile } from '@/types/feed';
import ProfileHeader from '@/components/feed/ProfileHeader';
import PostGrid from '@/components/feed/PostGrid';
import ProfileEditSheet from '@/components/feed/ProfileEditSheet';

interface Props {
  profile: FeedProfile;
  posts: FeedPost[];
  loading: boolean;
  /** Open the editor immediately on mount (e.g. first-time username setup). */
  startEditing?: boolean;
  onProfileUpdated?: (p: FeedProfile) => void;
}

/** Shared profile screen used by /feed/[username] and /feed/me. */
export default function ProfileView({ profile, posts, loading, startEditing, onProfileUpdated }: Props) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(!!startEditing && profile.isOwn);

  return (
    <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-2 px-3 py-3 shrink-0 border-b border-black/5 dark:border-white/10">
        {/* Return to the feed directly — NOT router.back(): inside the native
            WebView the about:blank→url load inflates history.length, so back()
            steps to a blank entry and the button appears dead (see /feed/create). */}
        <button onClick={() => router.push('/feed')} className="text-black dark:text-white p-1" aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-[16px] font-bold text-black dark:text-white truncate">@{profile.username}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <ProfileHeader profile={profile} onEdit={() => setEditing(true)} />
        <div className="mt-1">
          {loading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-black/5 dark:bg-white/10 animate-pulse" style={{ aspectRatio: '3/4' }} />
              ))}
            </div>
          ) : (
            <PostGrid posts={posts} />
          )}
        </div>
      </div>

      {editing && profile.isOwn && (
        <ProfileEditSheet
          profile={profile}
          onSaved={(p) => onProfileUpdated?.(p)}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
