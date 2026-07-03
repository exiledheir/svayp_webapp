import React from 'react';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getFollowers, getFollowing, toggleFollow } from '@/lib/feed-api';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';
import Avatar from '@/components/feed/Avatar';
import type { FeedFollowUser } from '@/types/feed';

interface Props {
  userId: string;
  mode: 'followers' | 'following';
  title: string;
  onClose: () => void;
}

/** Full-screen slide-up list of a profile's followers OR the accounts it
 *  follows (`mode`). Each row opens that user's profile; non-self rows carry a
 *  Follow / Following toggle. */
export default function FollowersSheet({ userId, mode, title, onClose }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  // Hardware Back closes the sheet instead of navigating the page away.
  useOverlayBackClose(true, onClose);
  const [rows, setRows] = React.useState<FeedFollowUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = mode === 'following' ? getFollowing : getFollowers;
    load(userId, 0, 100)
      .then((res) => !cancelled && setRows(res.content))
      .catch(() => !cancelled && setRows([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, mode]);

  async function handleToggle(row: FeedFollowUser) {
    if (busy) return;
    setBusy(row.userId);
    // Optimistic flip; reconcile with the authoritative result (or revert).
    setRows((prev) => prev.map((r) => (r.userId === row.userId ? { ...r, isFollowing: !r.isFollowing } : r)));
    try {
      const res = await toggleFollow(row.userId);
      setRows((prev) => prev.map((r) => (r.userId === row.userId ? { ...r, isFollowing: res.isFollowing } : r)));
    } catch {
      setRows((prev) => prev.map((r) => (r.userId === row.userId ? { ...r, isFollowing: row.isFollowing } : r)));
    } finally {
      setBusy(null);
    }
  }

  function openProfile(row: FeedFollowUser) {
    onClose();
    router.push(`/feed/${row.username}?from=${encodeURIComponent(router.asPath)}`);
  }

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-white dark:bg-[#1c1c1e]" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5 dark:border-white/10 shrink-0">
        <button onClick={onClose} className="text-black dark:text-white p-1" aria-label="Close">
          <X size={22} />
        </button>
        <h1 className="text-[16px] font-bold text-black dark:text-white">{title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-[14px] text-black/45 dark:text-white/45 py-16">
            {mode === 'following' ? t.feed_following_empty : t.feed_followers_empty}
          </p>
        ) : (
          <div className="flex flex-col">
            {rows.map((row) => (
              <div key={row.userId} className="flex items-center gap-3 px-4 py-2.5">
                <button className="flex items-center gap-3 min-w-0 flex-1" onClick={() => openProfile(row)}>
                  <Avatar url={row.avatarUrl} name={row.displayName || row.username} size={44} />
                  <div className="min-w-0 text-left">
                    <p className="text-[14px] font-semibold leading-tight text-black dark:text-white truncate">
                      {row.displayName || row.username}
                    </p>
                    <p className="text-[12px] leading-tight text-black/45 dark:text-white/45 truncate">@{row.username}</p>
                  </div>
                </button>
                {!row.isOwn && (
                  <button
                    onClick={() => handleToggle(row)}
                    disabled={busy === row.userId}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold disabled:opacity-50 ${
                      row.isFollowing ? 'text-black dark:text-white bg-black/5 dark:bg-white/10' : 'text-white'
                    }`}
                    style={row.isFollowing ? undefined : { background: '#F370A7' }}
                  >
                    {row.isFollowing ? t.feed_following : t.feed_follow}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
