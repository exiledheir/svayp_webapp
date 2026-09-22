import React from 'react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';
import type { SurveyCard } from '@/lib/surveys';
import SurveySheet, { Chip } from './SurveySheet';
import { minutesLabel, questionsLabel, surveyTheme } from './theme';

/** Приглашение пройти опрос. Бэкдроп, Back и «Позже» — это отказ (onDismiss). */
export default function SurveyInviteSheet({
  survey,
  dark,
  onStart,
  onDismiss,
}: {
  survey: SurveyCard;
  dark: boolean;
  onStart: () => void;
  onDismiss: () => void;
}) {
  const { t, locale } = useI18n();
  const th = surveyTheme(dark);

  return (
    <SurveySheet theme={th} onClose={onDismiss} label={survey.title}>
      <h3 className="text-[20px] font-extrabold leading-tight" style={{ color: th.ink }}>
        {survey.title}
      </h3>
      {survey.description && (
        <p className="text-[14px] mt-2 leading-snug" style={{ color: th.sub }}>
          {survey.description}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        <Chip theme={th}>
          {questionsLabel(t, survey.questionCount, locale)} · {minutesLabel(t, survey.estimatedSeconds)}
        </Chip>
        {survey.rewardCoins > 0 && (
          <Chip theme={th}>
            <Diamond size={14} />
            {t.sv_reward.replace('{n}', String(survey.rewardCoins))}
          </Chip>
        )}
      </div>
      <button
        type="button"
        onClick={onStart}
        className="w-full h-14 rounded-2xl mt-6 text-white text-[16px] font-bold active:scale-[0.98] transition-transform"
        style={{ background: th.accentGradient }}
      >
        {survey.resume ? t.sv_continue : t.sv_take}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="w-full h-11 mt-1 text-[15px] font-semibold"
        style={{ color: th.sub }}
      >
        {t.sv_later}
      </button>
    </SurveySheet>
  );
}
