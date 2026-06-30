import React from 'react';
import { useI18n } from '@/lib/i18n';
import { formatCount } from '@/lib/feed-format';
import Avatar from '@/components/feed/Avatar';
import type { FeedProfile } from '@/types/feed';

interface Props {
  profile: FeedProfile;
  onEdit?: () => void;
}

/** Profile header: avatar, name, @username, bio, «Образов»/«Лайков» counters. */
export default function ProfileHeader({ profile, onEdit }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center px-5 pt-5 pb-4 text-center">
      <Avatar url={profile.avatarUrl} name={profile.displayName || profile.username} size={84} />
      <h2 className="text-[18px] font-bold text-black dark:text-white mt-3">{profile.displayName || profile.username}</h2>
      <p className="text-[13px] text-black/45 dark:text-white/45">@{profile.username}</p>
      {profile.bio && <p className="text-[13.5px] text-black/70 dark:text-white/70 mt-2 max-w-[280px]">{profile.bio}</p>}

      <div className="flex items-center gap-10 mt-4">
        <div>
          <div className="text-[18px] font-bold text-black dark:text-white">{formatCount(profile.postsCount)}</div>
          <div className="text-[12px] text-black/45 dark:text-white/45">{t.feed_profile_posts}</div>
        </div>
        <div>
          <div className="text-[18px] font-bold text-black dark:text-white">{formatCount(profile.likesTotal)}</div>
          <div className="text-[12px] text-black/45 dark:text-white/45">{t.feed_profile_likes}</div>
        </div>
      </div>

      {profile.isOwn && onEdit && (
        <button
          onClick={onEdit}
          className="mt-4 w-full max-w-[320px] py-2.5 rounded-xl font-semibold text-[14px] text-black dark:text-white bg-black/5 dark:bg-white/10"
        >
          {t.feed_edit_profile}
        </button>
      )}
    </div>
  );
}
