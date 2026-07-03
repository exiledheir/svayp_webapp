import React from 'react';
import { useRouter } from 'next/router';
import { Share2, Send } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';

interface Props {
  /** Called when the user picks "share to other apps" (system share sheet). */
  onExternal: () => void;
  onClose: () => void;
}

/**
 * Small share chooser: publish INTO the app (opens the feed composer, where the
 * user's boards / try-ons / closet items are available as sources) or hand the
 * image to the system share sheet for external apps.
 */
export default function ShareSheet({ onExternal, onClose }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  // Hardware Back closes the chooser instead of navigating the page away.
  useOverlayBackClose(true, onClose);
  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white dark:bg-[#1c1c1e] px-5 pt-3"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mx-auto mb-2" />
        <button
          onClick={() => {
            onClose();
            router.push('/feed/create');
          }}
          className="w-full flex items-center gap-3 py-3.5 text-[15px] font-semibold text-black dark:text-white"
        >
          <Send size={18} style={{ color: '#F370A7' }} />
          {t.shareToFeed}
        </button>
        <button
          onClick={() => {
            onClose();
            onExternal();
          }}
          className="w-full flex items-center gap-3 py-3.5 text-[15px] font-semibold text-black dark:text-white"
        >
          <Share2 size={18} style={{ color: '#F370A7' }} />
          {t.shareExternal}
        </button>
      </div>
    </div>
  );
}
