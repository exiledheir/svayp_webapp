import React from 'react';
import { useRouter } from 'next/router';
import { X, Send } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getComments, addComment, getMyProfile } from '@/lib/feed-api';
import { timeAgo } from '@/lib/feed-format';
import { useKeyboardInset } from '@/lib/use-keyboard-inset';
import Avatar from '@/components/feed/Avatar';
import ProfileEditSheet from '@/components/feed/ProfileEditSheet';
import type { FeedComment, FeedProfile } from '@/types/feed';

interface Props {
  postId: string;
  onClose: () => void;
  /** Report the new total so the card's comment count stays in sync. */
  onCountChange?: (count: number) => void;
}

// Snap heights (% of viewport). Opens compact; drag the handle up to expand.
const COLLAPSED_VH = 50;
const EXPANDED_VH = 92;
const CLOSE_VH = 28; // release below this → dismiss

/** Instagram-style comments sheet: a draggable bottom sheet (compact by default,
 *  drag the grab-handle up to expand / down to dismiss) with the composer pinned
 *  at the bottom. Slides up over the phone container (see PostActionsSheet). */
export default function CommentsSheet({ postId, onClose, onCountChange }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const kbInset = useKeyboardInset();
  const [comments, setComments] = React.useState<FeedComment[] | null>(null);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  // Commenting needs a username. If the user has none, open the username editor
  // as an overlay (the typed text stays in state) and post the comment on save.
  const [usernameGate, setUsernameGate] = React.useState<FeedProfile | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  // Draggable sheet height.
  const [heightVh, setHeightVh] = React.useState(COLLAPSED_VH);
  const [dragging, setDragging] = React.useState(false);
  const draggingRef = React.useRef(false);
  const dragStartY = React.useRef(0);
  const dragStartH = React.useRef(COLLAPSED_VH);
  const liveH = React.useRef(COLLAPSED_VH);

  function onHandleTouchStart(e: React.TouchEvent) {
    draggingRef.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragStartH.current = liveH.current;
    setDragging(true);
  }
  function onHandleTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current) return;
    const dy = dragStartY.current - e.touches[0].clientY; // drag up = positive
    const next = Math.max(15, Math.min(EXPANDED_VH, dragStartH.current + (dy / window.innerHeight) * 100));
    liveH.current = next;
    setHeightVh(next);
  }
  function onHandleTouchEnd() {
    draggingRef.current = false;
    setDragging(false);
    const h = liveH.current;
    if (h < CLOSE_VH) {
      onClose();
      return;
    }
    const snapped = Math.abs(h - EXPANDED_VH) < Math.abs(h - COLLAPSED_VH) ? EXPANDED_VH : COLLAPSED_VH;
    liveH.current = snapped;
    setHeightVh(snapped);
  }

  React.useEffect(() => {
    let cancelled = false;
    getComments(postId, 0, 100)
      .then((r) => !cancelled && setComments(r.content))
      .catch(() => !cancelled && setComments([]));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;

    // Username gate — a comment needs a public profile. If none yet, open the
    // username editor as an overlay (the typed text stays) and post on save.
    try {
      const prof = await getMyProfile();
      if (!prof.username) {
        setUsernameGate(prof);
        return;
      }
    } catch {
      // Profile endpoint unavailable — proceed and let the server validate.
    }

    await doSubmit();
  }

  async function doSubmit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const c = await addComment(postId, body);
      setComments((prev) => {
        const next = [...(prev ?? []), c];
        onCountChange?.(next.length);
        return next;
      });
      setText('');
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } catch {
      /* ignore — backend/local write failed */
    } finally {
      setSending(false);
    }
  }

  function openAuthor(c: FeedComment) {
    onClose();
    router.push(`/feed/${c.author.username}?from=${encodeURIComponent(router.asPath)}`);
  }

  const loading = comments === null;

  return (
    <div
      className="absolute inset-0 z-[75] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.4)', paddingBottom: kbInset }}
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-white dark:bg-[#1c1c1e]"
        style={{
          borderRadius: '20px 20px 0 0',
          height: `${heightVh}vh`,
          maxHeight: `calc(100dvh - ${kbInset}px)`,
          transition: dragging ? 'none' : 'height 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle + header (grab here to resize / dismiss) */}
        <div
          className="shrink-0 pt-2.5 select-none touch-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-10 h-1.5 rounded-full mx-auto" style={{ background: 'rgba(128,128,128,0.45)' }} />
          <div className="relative flex items-center justify-center px-5 py-2.5 border-b border-black/5 dark:border-white/10">
            <h2 className="text-[15px] font-bold text-black dark:text-white">{t.feed_comments_title}</h2>
            <button onClick={onClose} className="absolute right-4 text-black/50 dark:text-white/50" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ overscrollBehaviorY: 'contain' }}>
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : comments && comments.length === 0 ? (
            <p className="text-center text-[14px] text-black/45 dark:text-white/45 py-12">{t.feed_comments_empty}</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {comments?.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <button onClick={() => openAuthor(c)} className="shrink-0 mt-0.5">
                    <Avatar url={c.author.avatarUrl} name={c.author.displayName || c.author.username} size={32} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug text-black dark:text-[#e8e8e8]">
                      <button onClick={() => openAuthor(c)} className="font-semibold mr-1.5">
                        {c.author.username}
                      </button>
                      <span>{c.text}</span>
                    </p>
                    <span className="text-[11.5px] text-black/40 dark:text-white/40">{timeAgo(c.createdAt, locale)}</span>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-t border-black/5 dark:border-white/10"
          style={{ paddingBottom: kbInset > 0 ? '0.625rem' : 'max(0.625rem, env(safe-area-inset-bottom, 0.625rem))' }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 300))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t.feed_add_comment_ph}
            className="flex-1 px-3.5 py-2.5 rounded-full text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white outline-none"
          />
          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40"
            style={{ background: '#F370A7' }}
            aria-label={t.feed_comment_send}
          >
            <Send size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Username gate — overlay editor; on save we post the typed comment.
          stopPropagation is critical: the root div's onClick={onClose} would
          otherwise close the whole comments sheet on any tap inside the editor. */}
      {usernameGate && (
        <div onClick={(e) => e.stopPropagation()}>
          <ProfileEditSheet
            profile={usernameGate}
            onClose={() => setUsernameGate(null)}
            onSaved={(updated) => {
              setUsernameGate(null);
              if (updated.username) void doSubmit();
            }}
          />
        </div>
      )}
    </div>
  );
}
