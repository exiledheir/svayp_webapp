import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getPhotoTips, type PhotoTipsKind } from '@/lib/photo-tips';

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
 * Full-screen "how to take the perfect photo" guide. Each section is a heading,
 * a short explanation and example photo(s). Content differs per flow (item vs
 * listing — see lib/photo-tips.ts) and is localized to the active locale.
 */
export default function PhotoTipsSheet({ open, kind, onClose, position = 'absolute' }: Props) {
  const { locale } = useI18n();

  if (!open) return null;
  const c = getPhotoTips(kind, locale);

  return (
    <div className={`${position} inset-0 z-[90] flex flex-col bg-white dark:bg-[#111111]`}>
      {/* Header — back arrow + (truncated) title */}
      <header
        className="shrink-0 flex items-center gap-1 px-2 border-b border-black/5 dark:border-white/10"
        style={{ paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))', paddingBottom: 8 }}
      >
        <button
          onClick={onClose}
          aria-label={c.closeLabel}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full active:scale-[0.95] transition-transform"
        >
          <ArrowLeft size={22} className="text-black dark:text-white" />
        </button>
        <span className="text-[15px] font-bold text-black dark:text-white truncate">{c.title}</span>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}>
        <h1 className="text-[25px] font-extrabold tracking-tight text-black dark:text-white leading-tight mt-4">{c.title}</h1>

        <div className="mt-6 flex flex-col gap-7">
          {c.tips.map((tip, i) => {
            const multi = (tip.images?.length ?? 0) > 1;
            return (
              <section key={i}>
                <h2 className="text-[18px] font-extrabold text-black dark:text-white">{tip.title}</h2>
                <p className="text-[14.5px] leading-relaxed text-black/60 dark:text-white/55 mt-1.5">{tip.desc}</p>
                {tip.images && tip.images.length > 0 && (
                  <div className={`mt-3 grid gap-2.5 ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {tip.images.map((src, k) => (
                      <TipImage key={k} src={src} alt={tip.title} aspect={multi ? '1 / 1' : '4 / 3'} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90"
          style={{ background: '#F370A7' }}
        >
          {c.done}
        </button>
      </div>
    </div>
  );
}

/** A framed example photo that hides itself if the file can't be loaded. */
function TipImage({ src, alt, aspect }: { src: string; alt: string; aspect: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    // Light frame so cut-out product shots (incl. dark garments) stay visible in
    // both themes.
    <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#f3f4f6', aspectRatio: aspect }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setOk(false)}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}
