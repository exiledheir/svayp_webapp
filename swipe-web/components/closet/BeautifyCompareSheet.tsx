import React, { useEffect, useRef, useState } from 'react';
import { Check, Sparkles, Loader2, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { createBeautifyJob, watchBeautifyUntilDone, commitBeautify } from '@/lib/wardrobe-api';
import type { ClosetItem } from '@/lib/closet-storage';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

type Phase = 'working' | 'compare' | 'failed' | 'soon';

/**
 * Closet v2 — on-demand Beautify with a side-by-side "you choose" comparison.
 * Kicks off a beautify job on open; when it completes, the user compares the
 * original cutout against the AI product shot and keeps one. Degrades to a
 * "coming soon" state while the backend endpoints are still being built.
 */
export default function BeautifyCompareSheet({
  item,
  onClose,
  onCommitted,
  dark,
  intro = false,
}: {
  item: ClosetItem;
  onClose: () => void;
  onCommitted: (itemId: string, choice: 'BEAUTIFIED' | 'ORIGINAL', imageUrl?: string) => void;
  dark: boolean;
  /** Acloset-style first-run framing ("Introducing Beautify …") over the compare. */
  intro?: boolean;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('working');
  const [beautifiedUrl, setBeautifiedUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<'BEAUTIFIED' | 'ORIGINAL'>('BEAUTIFIED');
  const [committing, setCommitting] = useState(false);
  const jobIdRef = useRef<string | null>(null);
  const started = useRef(false);

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#1c1c1e' : '#fff';
  const line = dark ? '#2a2a2c' : '#ececed';

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;
    (async () => {
      try {
        logAnalyticsEvent(Events.BEAUTIFY_STARTED);
        const job = await createBeautifyJob(item.id);
        jobIdRef.current = job.beautifyJobId;
        const done = await watchBeautifyUntilDone(item.id, job.beautifyJobId);
        if (!alive) return;
        if (done.status === 'COMPLETED' && done.beautifiedUrl) {
          setBeautifiedUrl(done.beautifiedUrl);
          setPhase('compare');
          logAnalyticsEvent(Events.BEAUTIFY_COMPLETED);
        } else {
          setPhase('failed');
          logAnalyticsEvent(Events.BEAUTIFY_FAILED);
        }
      } catch {
        if (!alive) return;
        // Endpoint missing (404) or network error → treat as not-yet-available.
        setPhase('soon');
      }
    })();
    return () => { alive = false; };
  }, [item.id]);

  async function commit(choice: 'BEAUTIFIED' | 'ORIGINAL') {
    if (committing) return;
    setCommitting(true);
    const jobId = jobIdRef.current;
    const imageUrl = choice === 'BEAUTIFIED' ? beautifiedUrl ?? undefined : item.imageData;
    try {
      if (jobId) await commitBeautify(item.id, jobId, choice);
      logAnalyticsEvent(Events.BEAUTIFY_CHOICE_COMMITTED, { choice });
    } catch {
      /* best-effort — still update the UI optimistically */
    } finally {
      setCommitting(false);
      onCommitted(item.id, choice, imageUrl);
      onClose();
    }
  }

  const stageBg = dark ? '#141014' : 'radial-gradient(120% 90% at 50% 20%,#fff,#f6f2f7)';

  return (
    <div className="fixed inset-0 z-[64] flex items-end justify-center" style={{ background: 'rgba(15,8,14,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-[460px] rounded-t-3xl flex flex-col" style={{ background: surface, maxHeight: '94%' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} /></div>

        <div className="flex items-center justify-between px-5 pt-1">
          <span className="text-[17px] font-extrabold flex items-center gap-1.5" style={{ color: ink }}>
            <Sparkles size={16} style={{ color: '#F370A7' }} />{t.cv_bt_button}
          </span>
          <button onClick={onClose} aria-label={t.close} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: sub }}><X size={18} /></button>
        </div>

        {/* Working */}
        {phase === 'working' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 px-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F9A9CB,#F370A7)' }}>
              <Loader2 size={26} color="#fff" className="animate-spin" />
            </div>
            <p className="text-[15px] font-bold" style={{ color: ink }}>{t.cv_bt_working}</p>
          </div>
        )}

        {/* Soon / Failed */}
        {(phase === 'soon' || phase === 'failed') && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-8 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: dark ? '#2a1620' : '#fdeaf3' }}>
              <Sparkles size={24} style={{ color: '#F370A7' }} />
            </div>
            <p className="text-[15px] font-bold" style={{ color: ink }}>{phase === 'soon' ? t.cv_bt_soon : t.cv_bt_failed}</p>
            <button onClick={onClose} className="mt-2 px-6 h-11 rounded-full text-[14px] font-semibold" style={{ background: dark ? '#2c2c2e' : '#f1eef1', color: ink }}>{t.close}</button>
          </div>
        )}

        {/* Compare */}
        {phase === 'compare' && (
          <>
            {intro ? (
              <div className="px-6 pt-1 pb-1 text-center">
                <p className="text-[12.5px] font-semibold" style={{ color: '#F370A7' }}>{t.cv_bt_auto_kicker}</p>
                <p className="text-[19px] font-extrabold leading-snug mt-0.5" style={{ color: ink }}>{t.cv_bt_auto_headline}</p>
              </div>
            ) : (
              <p className="text-[13px] text-center px-6 pt-1 pb-1" style={{ color: sub }}>{t.cv_bt_title} · {t.cv_bt_subtitle}</p>
            )}
            <div className="flex flex-col gap-3 px-5 py-3 overflow-y-auto">
              {([
                { key: 'BEAUTIFIED' as const, label: t.cv_bt_beautified, url: beautifiedUrl },
                { key: 'ORIGINAL' as const, label: t.cv_bt_original, url: item.imageData },
              ]).map((card) => {
                const on = selected === card.key;
                return (
                  <button
                    key={card.key}
                    onClick={() => setSelected(card.key)}
                    className="relative rounded-2xl overflow-hidden text-left"
                    style={{ border: `2px solid ${on ? '#F370A7' : line}`, background: stageBg }}
                  >
                    <span className="absolute top-2.5 left-2.5 z-10 text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: on ? '#F370A7' : 'rgba(255,255,255,0.9)', color: on ? '#fff' : '#141118' }}>{card.label}</span>
                    {on && <span className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: '#F370A7' }}><Check size={13} strokeWidth={3} /></span>}
                    <div className="h-[188px] flex items-center justify-center">
                      {card.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.url} alt={card.label} className="max-h-[172px] max-w-[80%] object-contain" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 px-5 pt-2 pb-8" style={{ borderTop: `1px solid ${line}` }}>
              <button
                onClick={() => commit(selected)}
                disabled={committing}
                className="rounded-2xl text-white text-[15px] font-bold flex items-center justify-center disabled:opacity-50"
                style={{ background: selected === 'BEAUTIFIED' ? '#F370A7' : '#141014', height: 52 }}
              >
                {committing ? <Loader2 size={18} className="animate-spin" /> : selected === 'BEAUTIFIED' ? t.cv_bt_save : t.cv_bt_keep}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
