import React from 'react';
import { Heart } from 'lucide-react';
import { toggleLike } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { formatCount } from '@/lib/feed-format';

interface Props {
  postId: string;
  liked: boolean;
  count: number;
  /** Notify parent so the post list/detail stays in sync. */
  onChange?: (next: { isLiked: boolean; likesCount: number }) => void;
  size?: number;
}

/**
 * Optimistic like toggle: flips immediately, calls the API, reconciles to the
 * server's authoritative count, reverts on failure.
 */
export default function LikeButton({ postId, liked, count, onChange, size = 24 }: Props) {
  const [state, setState] = React.useState({ liked, count });
  const busy = React.useRef(false);

  React.useEffect(() => {
    setState({ liked, count });
  }, [liked, count]);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy.current) return;
    busy.current = true;

    const optimistic = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) };
    setState(optimistic);
    onChange?.({ isLiked: optimistic.liked, likesCount: optimistic.count });

    try {
      const res = await toggleLike(postId);
      setState({ liked: res.isLiked, count: res.likesCount });
      onChange?.(res);
      logAnalyticsEvent(Events.FEED_LIKE_TOGGLED, { [Params.POST_ID]: postId, liked: res.isLiked });
    } catch {
      setState({ liked, count }); // revert to the props snapshot
      onChange?.({ isLiked: liked, likesCount: count });
    } finally {
      busy.current = false;
    }
  }

  return (
    <button className="flex items-center gap-1.5" onClick={handleClick} aria-label="Like">
      <Heart
        size={size}
        strokeWidth={2}
        fill={state.liked ? '#F370A7' : 'none'}
        color={state.liked ? '#F370A7' : 'currentColor'}
        className="text-black dark:text-white transition-transform active:scale-90"
      />
      {state.count > 0 && (
        <span className="text-[14px] font-semibold text-black dark:text-white tabular-nums">
          {formatCount(state.count)}
        </span>
      )}
    </button>
  );
}
