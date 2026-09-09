import React from 'react';
import { useI18n } from '@/lib/i18n';
import { toggleSave } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

interface Props {
  postId: string;
  saved: boolean;
  /** Notify parent so the post detail stays in sync. */
  onChange?: (next: { isSaved: boolean }) => void;
}

/**
 * Pinterest-style "Save" pill — the primary action on a post. Optimistic
 * toggle: flips immediately, calls the API, reconciles, reverts on failure
 * (same pattern as LikeButton). Pink when unsaved, neutral "Saved" when saved.
 */
export default function SaveButton({ postId, saved, onChange }: Props) {
  const { t } = useI18n();
  const [isSaved, setIsSaved] = React.useState(saved);
  const busy = React.useRef(false);

  React.useEffect(() => {
    setIsSaved(saved);
  }, [saved]);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy.current) return;
    busy.current = true;

    const optimistic = !isSaved;
    setIsSaved(optimistic);
    onChange?.({ isSaved: optimistic });

    try {
      const res = await toggleSave(postId);
      setIsSaved(res.isSaved);
      onChange?.(res);
      logAnalyticsEvent(Events.FEED_POST_SAVED, { [Params.POST_ID]: postId, saved: res.isSaved });
    } catch {
      setIsSaved(saved); // revert to the props snapshot
      onChange?.({ isSaved: saved });
    } finally {
      busy.current = false;
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSaved}
      className={`h-10 px-5 rounded-full text-[14px] font-semibold transition-colors active:scale-95 ${
        isSaved ? 'bg-black/5 dark:bg-white/10 text-black dark:text-white' : 'text-white'
      }`}
      style={isSaved ? undefined : { background: '#F370A7' }}
    >
      {isSaved ? t.feed_saved : t.feed_save_post}
    </button>
  );
}
