import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { commitBeautify } from '@/lib/wardrobe-api';
import type { ClosetItem } from '@/lib/closet-storage';
import { SU } from '@/lib/setup-theme';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

/**
 * The one decision first-run setup asks for: which version of the photo to keep.
 *
 * Background removal and Beautify both run on their own as soon as a photo is
 * picked — the user is never asked to start either — so this sheet is the first
 * and only thing they see about it. There is no dismiss: setup continues once a
 * choice is made, which is also what pays the upload off (they finally see
 * their own garment come back).
 */
export default function SetupBeautifySheet({
  item,
  jobId,
  beautifiedUrl,
  onCommitted,
}: {
  /** The item as it stands now — background removed, not yet beautified. */
  item: ClosetItem;
  jobId: string;
  beautifiedUrl: string;
  /** Choice committed; `imageUrl` is the version to show in the slot. */
  onCommitted: (imageUrl: string) => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<'BEAUTIFIED' | 'ORIGINAL'>('BEAUTIFIED');
  const [committing, setCommitting] = useState(false);

  async function commit() {
    if (committing) return;
    setCommitting(true);
    try {
      await commitBeautify(item.id, jobId, selected);
    } catch {
      /* Best-effort — the UI still honours the choice the user just made. */
    }
    logAnalyticsEvent(Events.SETUP_BEAUTIFY_COMMITTED, { [Params.CHOICE]: selected });
    // No setCommitting(false): the sheet unmounts as setup moves on.
    onCommitted(selected === 'BEAUTIFIED' ? beautifiedUrl : item.imageData);
  }

  return (
    <div className="fixed inset-0 z-[87] flex items-end justify-center" style={{ background: 'rgba(16,16,20,0.42)' }}>
      <div
        className="w-full max-w-[460px] su-sheet"
        style={{
          background: '#fff', borderRadius: '26px 26px 0 0',
          padding: '10px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
        role="dialog"
        aria-label={t.cv_bt_title}
      >
        <div style={{ width: 38, height: 4, borderRadius: 99, background: '#E4E4EA', margin: '0 auto 14px' }} />

        <div className="text-center">
          <div style={{ font: '800 19px/1.25 Roboto, system-ui', color: SU.ink }}>{t.cv_bt_title}</div>
          <div style={{ marginTop: 6, font: '400 13.5px/1.4 Roboto, system-ui', color: SU.sub }}>{t.cv_bt_subtitle}</div>
        </div>

        <div className="flex items-stretch justify-center gap-3" style={{ marginTop: 16 }}>
          {([
            { key: 'BEAUTIFIED' as const, label: t.cv_bt_beautified, url: beautifiedUrl },
            { key: 'ORIGINAL' as const, label: t.cv_bt_original, url: item.imageData },
          ]).map((card) => {
            const on = selected === card.key;
            return (
              <button
                key={card.key}
                onClick={() => setSelected(card.key)}
                className="relative flex-1 min-w-0 active:scale-[0.98] transition-transform"
                style={{
                  height: 190, borderRadius: 18, background: '#fff',
                  border: `2px solid ${on ? SU.pink : SU.hairline}`,
                }}
              >
                {card.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.url} alt={card.label} className="w-full h-full object-contain" style={{ borderRadius: 16, padding: 8 }} />
                )}
                <span
                  className="absolute"
                  style={{
                    top: 8, left: 8, padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                    background: on ? SU.pink : 'rgba(255,255,255,0.92)', color: on ? '#fff' : SU.ink,
                    font: '700 10.5px/1 Roboto, system-ui',
                  }}
                >
                  {card.label}
                </span>
                {on && (
                  <span
                    className="absolute flex items-center justify-center text-white"
                    style={{ top: 8, right: 8, width: 22, height: 22, borderRadius: 999, background: SU.pink }}
                  >
                    <Check size={12} strokeWidth={3.2} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={commit}
          disabled={committing}
          className="w-full flex items-center justify-center active:scale-[0.99] transition-transform"
          style={{
            marginTop: 16, height: 56, borderRadius: 999,
            background: selected === 'BEAUTIFIED' ? SU.pink : SU.ink, color: '#fff',
            font: '700 16px/1 Roboto, system-ui', whiteSpace: 'nowrap',
            opacity: committing ? 0.6 : 1,
          }}
        >
          {committing ? <Loader2 size={18} className="animate-spin" /> : selected === 'BEAUTIFIED' ? t.cv_bt_save : t.cv_bt_keep}
        </button>
      </div>
    </div>
  );
}
