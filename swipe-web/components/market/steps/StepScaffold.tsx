import React from 'react';

interface Props {
  title: string;
  hint?: string;
  children: React.ReactNode;
  ctaLabel: string;
  ctaDisabled?: boolean;
  onCta: () => void;
  /** Optional secondary text button under the CTA (e.g. "Пропустить"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Consistent layout for every create-wizard step: scrollable title + hint +
 * content, with a pinned primary CTA (and optional secondary action).
 */
export default function StepScaffold({
  title, hint, children, ctaLabel, ctaDisabled, onCta, secondaryLabel, onSecondary,
}: Props) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 pt-4">
        <h1 className="text-[24px] font-extrabold tracking-tight text-black dark:text-white leading-tight">{title}</h1>
        {hint && <p className="text-[14px] leading-relaxed text-black/55 dark:text-white/55 mt-2">{hint}</p>}
        <div className="mt-5 pb-4">{children}</div>
      </div>
      <div className="flex-none px-5 pt-2 pb-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
        {secondaryLabel && (
          <button onClick={onSecondary} className="w-full py-3 mb-1 text-[14px] font-medium text-black/45 dark:text-white/45 active:opacity-60">
            {secondaryLabel}
          </button>
        )}
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base active:opacity-90 disabled:opacity-40"
          style={{ background: '#F370A7' }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
