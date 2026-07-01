import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { formatCount } from '@/lib/feed-format';
import Avatar from '@/components/feed/Avatar';
import type { FeedProfile } from '@/types/feed';

interface Props {
  profile: FeedProfile;
  onEdit?: () => void;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onToggleFollow?: () => void;
  onMessage?: () => void;
  followBusy?: boolean;
  messageBusy?: boolean;
}

/** Profile header: avatar, name, @username, phone, counters (incl. followers /
 *  following), and the action row — Edit (own profile), Follow (others'), or
 *  Following + Message once you follow them. */
export default function ProfileHeader({ profile, onEdit, onFollowersClick, onFollowingClick, onToggleFollow, onMessage, followBusy, messageBusy }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center px-5 pt-5 pb-4 text-center">
      <Avatar url={profile.avatarUrl} name={profile.displayName || profile.username} size={84} />
      <h2 className="text-[18px] font-bold text-black dark:text-white mt-3">{profile.displayName || profile.username}</h2>
      <p className="text-[13px] text-black/45 dark:text-white/45">@{profile.username}</p>
      {profile.isOwn && profile.phoneNumber && (
        <p className="text-[13px] text-black/45 dark:text-white/45 mt-0.5">{profile.phoneNumber}</p>
      )}
      {profile.bio && <p className="text-[13.5px] text-black/70 dark:text-white/70 mt-2 max-w-[280px]">{profile.bio}</p>}

      <div className="flex items-center gap-6 mt-4">
        <div>
          <div className="text-[18px] font-bold text-black dark:text-white">{formatCount(profile.postsCount)}</div>
          <div className="text-[12px] text-black/45 dark:text-white/45">{t.feed_profile_posts}</div>
        </div>
        <div>
          <div className="text-[18px] font-bold text-black dark:text-white">{formatCount(profile.likesTotal)}</div>
          <div className="text-[12px] text-black/45 dark:text-white/45">{t.feed_profile_likes}</div>
        </div>
        <button onClick={onFollowersClick} className="active:opacity-60" aria-label={t.feed_followers_title}>
          <div className="text-[18px] font-bold text-black dark:text-white">{formatCount(profile.followersCount)}</div>
          <div className="text-[12px] text-black/45 dark:text-white/45">{t.feed_profile_followers}</div>
        </button>
        <button onClick={onFollowingClick} className="active:opacity-60" aria-label={t.feed_following_title}>
          <div className="text-[18px] font-bold text-black dark:text-white">{formatCount(profile.followingCount)}</div>
          <div className="text-[12px] text-black/45 dark:text-white/45">{t.feed_profile_following}</div>
        </button>
      </div>

      {profile.isOwn ? (
        onEdit && (
          <button
            onClick={onEdit}
            className="mt-4 w-full max-w-[320px] py-2.5 rounded-xl font-semibold text-[14px] text-black dark:text-white bg-black/5 dark:bg-white/10"
          >
            {t.feed_edit_profile}
          </button>
        )
      ) : profile.isFollowing ? (
        // Following → offer to unfollow AND to open a direct chat (Instagram-style).
        <div className="mt-4 w-full max-w-[320px] flex gap-2">
          <button
            onClick={onToggleFollow}
            disabled={followBusy}
            className="flex-1 py-2.5 rounded-xl font-semibold text-[14px] text-black dark:text-white bg-black/5 dark:bg-white/10 disabled:opacity-50"
          >
            {t.feed_following}
          </button>
          <button
            onClick={onMessage}
            disabled={messageBusy}
            className="flex-1 py-2.5 rounded-xl font-semibold text-[14px] text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: '#F370A7' }}
          >
            <MessageCircle size={15} strokeWidth={2.2} />
            {t.feed_message}
          </button>
        </div>
      ) : (
        <button
          onClick={onToggleFollow}
          disabled={followBusy}
          className="mt-4 w-full max-w-[320px] py-2.5 rounded-xl font-semibold text-[14px] text-white disabled:opacity-50"
          style={{ background: '#F370A7' }}
        >
          {t.feed_follow}
        </button>
      )}
    </div>
  );
}
