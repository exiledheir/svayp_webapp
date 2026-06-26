import React from 'react';
import {
  X, Square, Shirt, Frame, Sun, Maximize2, Sparkles, Images, Eye, Tag, Camera,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { getPhotoTips, type PhotoTipsKind, type PhotoTip } from '@/lib/photo-tips';

const ICONS: Record<PhotoTip['icon'], LucideIcon> = {
  square: Square, shirt: Shirt, frame: Frame, sun: Sun, maximize: Maximize2,
  sparkles: Sparkles, images: Images, eye: Eye, tag: Tag, camera: Camera,
};

interface Props {
  open: boolean;
  /** Which tip set to show — wardrobe item vs market listing. */
  kind: PhotoTipsKind;
  onClose: () => void;
  /**
   * `fixed` when overlaying the whole page (closet add flow); `absolute` when
   * inside a phone-sized container (market create wizard).
   */
  position?: 'fixed' | 'absolute';
}

/**
 * Bottom-sheet of "how to take the perfect photo" tips. Content differs per
 * flow (see lib/photo-tips.ts) and is localized to the active locale.
 */
export default function PhotoTipsSheet({ open, kind, onClose, position = 'absolute' }: Props) {
  const { locale } = useI18n();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  if (!open) return null;
  const c = getPhotoTips(kind, locale);

  return (
    <div
      className={`${position} inset-0 z-[90] flex flex-col justify-end`}
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-white dark:bg-[#1c1c1e]"
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-1 shrink-0" style={{ background: 'rgba(128,128,128,0.4)' }} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[18px] font-extrabold text-black dark:text-white leading-tight">{c.title}</h2>
            <p className="text-[12.5px] text-black/50 dark:text-white/50 mt-1 leading-snug">{c.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={c.closeLabel}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
            style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
          >
            <X size={18} className="text-black dark:text-white" />
          </button>
        </div>

        {/* Tips list */}
        <div className="flex-1 overflow-y-auto px-5">
          <div className="flex flex-col gap-2.5">
            {c.tips.map((tip, i) => {
              const Icon = ICONS[tip.icon];
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <span className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(243,112,167,0.12)' }}>
                    <Icon size={17} className="text-[#F370A7]" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[14px] font-bold text-black dark:text-white leading-snug">{tip.title}</p>
                    <p className="text-[12.5px] text-black/55 dark:text-white/55 leading-snug mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Done CTA */}
        <div className="px-5 pt-3 shrink-0" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90"
            style={{ background: '#F370A7' }}
          >
            {c.done}
          </button>
        </div>
      </div>
    </div>
  );
}
