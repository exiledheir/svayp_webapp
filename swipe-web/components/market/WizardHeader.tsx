import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  step: number; // 0-based current step
  totalSteps: number;
  onBack: () => void;
}

/**
 * Top chrome for the create-listing wizard: a back arrow and a row of step dots
 * (same style as the closet onboarding).
 */
export default function WizardHeader({ step, totalSteps, onBack }: Props) {
  const dots = Array.from({ length: totalSteps }, (_, i) => i);

  return (
    <div className="shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}>
      <div className="flex items-center px-3 py-2">
        <button onClick={onBack} aria-label="Back" className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={22} className="text-black dark:text-white" />
        </button>
      </div>
      {/* Progress dots — mirrors the onboarding indicator (current dot widened). */}
      <div className="flex gap-1.5 px-4 pb-1">
        {dots.map((i) => {
          const reached = step >= i;
          const isCurrent = step === i;
          return (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{ width: isCurrent ? 20 : 8, height: 8, background: reached ? '#F370A7' : '#E5E7EB' }}
            />
          );
        })}
      </div>
    </div>
  );
}
