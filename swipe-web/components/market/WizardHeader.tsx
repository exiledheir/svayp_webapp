import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  step: number; // 0-based current step
  totalSteps: number;
  onBack: () => void;
  onSaveExit: () => void;
  showSaveExit?: boolean;
}

/**
 * Top chrome for the create-listing wizard: a progress underline, a back arrow,
 * and a "Сохранить и выйти" action. Mirrors the onboarding header layout.
 */
export default function WizardHeader({ step, totalSteps, onBack, onSaveExit, showSaveExit = true }: Props) {
  const { t } = useI18n();
  const pct = Math.min(100, Math.round(((step + 1) / totalSteps) * 100));

  return (
    <div className="shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}>
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={onBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={22} className="text-black dark:text-white" />
        </button>
        {showSaveExit && (
          <button onClick={onSaveExit} className="text-[14px] font-medium text-black/40 dark:text-white/40 active:opacity-60 pr-2">
            {t.mk_save_exit}
          </button>
        )}
      </div>
      {/* Progress underline */}
      <div className="mx-4 h-[3px] rounded-full" style={{ background: 'rgba(128,128,128,0.18)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: '#F370A7' }}
        />
      </div>
    </div>
  );
}
