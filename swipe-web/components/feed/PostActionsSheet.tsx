import React from 'react';
import { Flag, EyeOff, Trash2, ChevronLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { reportPost, hideUserPosts, deletePost } from '@/lib/feed-api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';
import type { FeedPost, FeedReportReason } from '@/types/feed';

interface Props {
  post: FeedPost;
  onReported?: () => void;
  onHidden?: (userId: string) => void;
  onDeleted?: (postId: string) => void;
  onClose: () => void;
}

const REASONS: FeedReportReason[] = ['inappropriate', 'spam', 'not_fashion', 'copyright', 'other'];

/**
 * Overflow (⋮) action sheet for a feed post. Owners see "Delete"; everyone else
 * sees "Report" (→ reason list) and "Hide this user's posts". Mirrors the market
 * OptionSheet styling.
 */
export default function PostActionsSheet({ post, onReported, onHidden, onDeleted, onClose }: Props) {
  const { t } = useI18n();
  // Hardware Back closes the sheet instead of navigating the page away.
  useOverlayBackClose(true, onClose);
  const [view, setView] = React.useState<'menu' | 'report' | 'confirmDelete'>('menu');
  const [reason, setReason] = React.useState<FeedReportReason | null>(null);
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const reasonLabel: Record<FeedReportReason, string> = {
    inappropriate: t.feed_reason_inappropriate,
    spam: t.feed_reason_spam,
    not_fashion: t.feed_reason_not_fashion,
    copyright: t.feed_reason_copyright,
    other: t.feed_reason_other,
  };

  async function submitReport() {
    if (!reason || busy) return;
    setBusy(true);
    try {
      await reportPost(post.id, reason, message.trim() || undefined);
      logAnalyticsEvent(Events.FEED_POST_REPORTED, { [Params.FEED_REPORT_REASON]: reason });
      onReported?.();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function doHide() {
    if (busy) return;
    setBusy(true);
    try {
      await hideUserPosts(post.author.id);
      logAnalyticsEvent(Events.FEED_USER_HIDDEN);
      onHidden?.(post.author.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await deletePost(post.id);
      logAnalyticsEvent(Events.FEED_POST_DELETED);
      onDeleted?.(post.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-[70] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-white dark:bg-[#1c1c1e]"
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '78vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="w-9 h-1 rounded-full mx-auto mb-3" style={{ background: 'rgba(128,128,128,0.4)' }} />
          {view === 'report' ? (
            <div className="flex items-center justify-center relative">
              <button className="absolute left-0 text-black dark:text-white" onClick={() => setView('menu')} aria-label="Back">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-[16px] font-bold text-center text-black dark:text-white">{t.feed_report_title}</h2>
            </div>
          ) : (
            <h2 className="text-[16px] font-bold text-center text-black dark:text-white">
              {view === 'confirmDelete' ? t.feed_delete_confirm_title : ''}
            </h2>
          )}
        </div>

        <div className="px-5 pb-2 overflow-y-auto flex-1">
          {view === 'menu' && !post.isOwner && (
            <>
              <button
                className="w-full flex items-center gap-3 py-3.5 border-b border-black/5 dark:border-white/10 text-left text-black dark:text-white"
                onClick={() => setView('report')}
              >
                <Flag size={18} /> <span className="text-[15px]">{t.feed_report}</span>
              </button>
              <button
                className="w-full flex items-center gap-3 py-3.5 text-left text-black dark:text-white"
                onClick={doHide}
                disabled={busy}
              >
                <EyeOff size={18} /> <span className="text-[15px]">{t.feed_hide_user}</span>
              </button>
            </>
          )}

          {view === 'menu' && post.isOwner && (
            <button
              className="w-full flex items-center gap-3 py-3.5 text-left"
              style={{ color: '#E5484D' }}
              onClick={() => setView('confirmDelete')}
            >
              <Trash2 size={18} /> <span className="text-[15px]">{t.feed_delete}</span>
            </button>
          )}

          {view === 'report' && (
            <>
              {REASONS.map((r) => (
                <button
                  key={r}
                  className="w-full flex items-center gap-3 py-3.5 border-b border-black/5 dark:border-white/10 text-left"
                  onClick={() => setReason(r)}
                >
                  <span className={`flex-1 text-[15px] ${reason === r ? 'font-bold' : ''} text-black dark:text-white`}>
                    {reasonLabel[r]}
                  </span>
                  <span
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ border: reason === r ? 'none' : '1.5px solid rgba(128,128,128,0.4)', background: reason === r ? '#F370A7' : 'transparent' }}
                  />
                </button>
              ))}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.feed_report_message_placeholder}
                maxLength={500}
                rows={3}
                className="w-full mt-3 p-3 rounded-xl text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white resize-none outline-none"
              />
            </>
          )}

          {view === 'confirmDelete' && (
            <p className="text-[14px] text-center text-black/60 dark:text-white/60 py-2">{t.feed_delete_confirm_body}</p>
          )}
        </div>

        <div className="px-5 pt-3 pb-6 shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
          {view === 'report' && (
            <button
              onClick={submitReport}
              disabled={!reason || busy}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90 disabled:opacity-40"
              style={{ background: '#F370A7' }}
            >
              {t.feed_report_submit}
            </button>
          )}
          {view === 'confirmDelete' && (
            <button
              onClick={doDelete}
              disabled={busy}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90 disabled:opacity-50"
              style={{ background: '#E5484D' }}
            >
              {t.feed_delete}
            </button>
          )}
          {view === 'menu' && (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-semibold text-[15px] text-black dark:text-white bg-black/5 dark:bg-white/10"
            >
              {t.feed_cancel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
