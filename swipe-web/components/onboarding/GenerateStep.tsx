import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import type { ClosetItem } from '@/lib/closet-storage';
import { generateRandomOutfit, type SavedCanvasLayout } from '@/lib/closet-types';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

function LayoutPreview({ layout, items }: { layout: SavedCanvasLayout; items: ClosetItem[] }) {
  const entries = layout
    .map((e) => {
      const item = items.find((i) => i.id === e.id);
      return item ? { ...e, item } : null;
    })
    .filter(Boolean) as (SavedCanvasLayout[number] & { item: ClosetItem })[];
  return (
    <div className="relative h-full" style={{ aspectRatio: '3 / 4', maxWidth: '100%' }}>
      {entries.map((entry, idx) => (
        <div
          key={`${entry.item.id}-${idx}`}
          className="absolute origin-center"
          style={{ left: `${entry.x}%`, top: `${entry.y}%`, width: '35%', aspectRatio: '1', transform: `scale(${entry.scale})`, zIndex: entry.zIndex }}
        >
          <div className="relative w-full h-full">
            <Image src={entry.item.imageData} alt={entry.item.category} fill className="object-contain" unoptimized />
          </div>
        </div>
      ))}
    </div>
  );
}

// 30-second generation phases (mirrors the closet upload card's phase pattern)
const TOTAL_SECS = 30;

export default function GenerateStep({
  awaitAndFetch,
  title,
  body,
  onGenerated,
  onContinue,
}: {
  awaitAndFetch: () => Promise<ClosetItem[]>;
  title: string;
  body: string;
  onGenerated: (layout: SavedCanvasLayout, items: ClosetItem[]) => void;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [localItems, setLocalItems] = useState<ClosetItem[]>([]);
  const [localLayout, setLocalLayout] = useState<SavedCanvasLayout | null>(null);

  const PHASES: { until: number; label: string }[] = [
    { until: 8,  label: t.uploading },
    { until: 18, label: t.stepChecking },
    { until: 30, label: t.stepGenerating },
  ];

  // Elapsed timer (drives progress bar + phase label)
  useEffect(() => {
    if (!generating) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => Math.min(s + 1, TOTAL_SECS)), 1000);
    return () => clearInterval(id);
  }, [generating]);

  const currentPhaseLabel = (PHASES.find((p) => elapsed < p.until) ?? PHASES[PHASES.length - 1]).label;
  const simProgress = Math.min(Math.round((elapsed / TOTAL_SECS) * 95), 95);

  async function generate() {
    if (generating || localLayout) return;
    setGenerating(true);
    logAnalyticsEvent(Events.OUTFIT_GENERATE_TAPPED, { [Params.ITEM_COUNT_IN_WARDROBE]: localItems.length });
    try {
      logAnalyticsEvent(Events.OUTFIT_GENERATION_STARTED);
      const items = await awaitAndFetch();
      setLocalItems(items);
      const layout = generateRandomOutfit(items);
      logAnalyticsEvent(Events.OUTFIT_GENERATION_COMPLETED, { [Params.OUTFIT_COUNT_RETURNED]: layout.length });
      setLocalLayout(layout);
      onGenerated(layout, items);
    } catch {
      logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: 'fetch_failed' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-4 pb-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-[16px] font-medium leading-relaxed text-gray-600 dark:text-gray-300 max-w-[34ch]">{body}</p>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center px-8 min-h-0">
        <div
          className="relative w-full rounded-3xl overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: '3/4', maxHeight: '46vh', background: 'rgba(243,112,167,0.06)' }}
        >
          {localLayout && localLayout.length > 0 ? (
            <LayoutPreview layout={localLayout} items={localItems} />
          ) : (
            /* Pre-generation: circular button in center */
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {!generating && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ backgroundColor: '#F370A7', opacity: 0.25 }}
                  />
                )}
                <button
                  onClick={generate}
                  disabled={generating}
                  className="relative w-20 h-20 rounded-full shadow-xl flex items-center justify-center active:scale-[0.95] transition-transform disabled:opacity-80"
                  style={{ background: 'linear-gradient(135deg, #F370A7, #e0409a)' }}
                >
                  {generating ? (
                    <div className="w-8 h-8 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
                  ) : (
                    <Sparkles size={32} color="white" />
                  )}
                </button>
              </div>

              {/* Phase label + progress */}
              {generating ? (
                <>
                  <p className="text-[13px] font-semibold text-gray-600">{currentPhaseLabel}</p>
                  <div className="w-44 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${simProgress}%`, background: '#F370A7' }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">~{Math.max(0, TOTAL_SECS - elapsed)}s</p>
                </>
              ) : (
                <p className="text-[14px] font-semibold text-gray-500">{t.ob_generate_cta}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex-none px-6 pb-2 pt-3">
        {!localLayout ? (
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-4 rounded-2xl text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #F370A7, #e0409a)' }}
          >
            <Sparkles size={18} />
            {t.ob_generate_cta}
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-2xl text-white font-semibold text-[15px]"
            style={{ background: '#F370A7' }}
          >
            {t.ob_generate_continue}
          </button>
        )}
      </div>
    </div>
  );
}
