import React from 'react';
import { useRouter } from 'next/router';
import { Share2, Send } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';

interface Props {
  /** Called when the user picks "share to other apps" (system share sheet). */
  onExternal: () => void;
  onClose: () => void;
  /** Deep-link seed for the composer, e.g. `tryon:<jobId>` — предвыбирает образ
   *  и открывает сразу подпись. Без него композер начнётся с выбора источника. */
  feedSeed?: string;
}

/**
 * Small share chooser: publish INTO the app (opens the feed composer, where the
 * user's boards / try-ons / closet items are available as sources) or hand the
 * image to the system share sheet for external apps.
 */
export default function ShareSheet({ onExternal, onClose, feedSeed }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  // Hardware Back closes the chooser instead of navigating the page away.
  useOverlayBackClose(true, onClose);

  const rowClass =
    'w-full flex items-center gap-3 h-14 px-2 rounded-2xl text-[15px] font-bold text-black dark:text-white active:bg-black/5 dark:active:bg-white/10';

  return (
    <div
      /* Выше всех оверлеев приложения (макс. z-[110] — полноэкранный просмотр
         образа и подтверждения): шторка открывается поверх них. */
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[28px] bg-white dark:bg-[#1c1c1e] px-4 pt-2.5"
        // Обычный отступ шторки (как у остальных: PhotoSourceSheet, OptionSheet).
        // Раньше здесь резервировалось 76px под плавающий навбар Flutter, но
        // WebView заканчивается ВЫШЕ навбара — отступ давал только пустую белую
        // полосу под кнопкой «Отмена».
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mx-auto mb-3" />
        <p className="text-center text-[12px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
          {t.share}
        </p>
        <button
          onClick={() => {
            onClose();
            router.push(feedSeed ? `/feed/create?seed=${feedSeed}` : '/feed/create');
          }}
          className={rowClass}
        >
          <span
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(243,112,167,0.12)' }}
          >
            <Send size={17} strokeWidth={2.3} style={{ color: '#F370A7' }} />
          </span>
          {t.shareToFeed}
        </button>
        <button
          onClick={() => {
            onClose();
            onExternal();
          }}
          className={rowClass}
        >
          <span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10">
            <Share2 size={17} strokeWidth={2.3} className="text-black/70 dark:text-white/70" />
          </span>
          {t.shareExternal}
        </button>
        <button
          onClick={onClose}
          className="w-full h-12 mt-1.5 rounded-full bg-black/5 dark:bg-white/10 text-[15px] font-semibold text-black dark:text-white active:opacity-80"
        >
          {t.tryOnCancel}
        </button>
      </div>
    </div>
  );
}
