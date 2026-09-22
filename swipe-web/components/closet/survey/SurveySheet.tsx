import React from 'react';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';
import type { SurveyTheme } from './theme';

/**
 * Нижний шит опросов по образцу PromoSuccessSheet: бэкдроп, ручка, safe-area снизу.
 * Бэкдроп и аппаратный Back вызывают onClose — у приглашения это «Позже».
 */
export default function SurveySheet({
  theme,
  onClose,
  children,
  label,
}: {
  theme: SurveyTheme;
  onClose: () => void;
  children: React.ReactNode;
  label: string;
}) {
  useOverlayBackClose(true, onClose);
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col justify-end"
      style={{ background: theme.backdrop }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className="w-full max-w-[460px] mx-auto px-5 pt-4 overflow-y-auto"
        style={{
          background: theme.surface,
          borderRadius: '24px 24px 0 0',
          maxHeight: '90%',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-5" style={{ background: theme.handle }} />
        {children}
      </div>
    </div>
  );
}

/** Чип «5 вопросов · ~1 мин» / «+10 алмазов». */
export function Chip({ theme, children }: { theme: SurveyTheme; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
      style={{ background: theme.chip, color: theme.ink }}
    >
      {children}
    </span>
  );
}
