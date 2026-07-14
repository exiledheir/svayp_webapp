import React, { useEffect, useRef } from 'react';
import { Sparkles, Plus, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

/**
 * Persistent "Add N items to unlock personalized styling" nudge shown at the top
 * of the closet once the guided onboarding is done, until the user reaches the
 * item target or dismisses it (see isGetStartedDone/setGetStartedDone).
 */
export default function GetStartedCard({
  count,
  target,
  onAdd,
  onDismiss,
}: {
  count: number;
  target: number;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    logAnalyticsEvent(Events.GET_STARTED_CARD_VIEWED, { [Params.ITEM_COUNT]: count });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = Math.max(0, target - count);
  const pct = Math.min(100, Math.round((count / target) * 100));
  const title = t.gs_title.replace('{n}', String(remaining));
  const progress = t.gs_progress
    .replace('{done}', String(count))
    .replace('{total}', String(target));

  return (
    <div
      className="mx-4 mt-3 rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: dark ? '#241823' : '#FDEBF3',
        border: `1px solid ${dark ? 'rgba(243,112,167,0.28)' : '#F8D3E4'}`,
      }}
    >
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label={t.gs_dismiss}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center active:scale-[0.9] transition-transform"
        style={{ color: dark ? '#9ca3af' : '#B08099' }}
      >
        <X size={16} strokeWidth={2.2} />
      </button>

      {/* Title row */}
      <div className="flex items-start gap-3 pr-7">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #F9A9CB 0%, #F370A7 55%, #C94E86 100%)' }}
        >
          <Sparkles size={18} color="#fff" />
        </div>
        <p
          className="text-[14px] font-bold leading-snug line-clamp-2"
          style={{ color: dark ? '#F5EAF0' : '#141118' }}
        >
          {title}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(243,112,167,0.16)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F370A7, #C94E86)' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] font-semibold" style={{ color: dark ? '#B79AAC' : '#B03A72' }}>
            {progress}
          </span>
          <button
            onClick={onAdd}
            className="h-8 pl-2.5 pr-3.5 rounded-full text-white text-[13px] font-semibold flex items-center gap-1 active:scale-[0.96] transition-transform"
            style={{ background: '#F370A7' }}
          >
            <Plus size={15} strokeWidth={2.6} />
            {t.gs_cta}
          </button>
        </div>
      </div>
    </div>
  );
}
