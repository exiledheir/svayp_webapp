import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';
import type { SurveyCard } from '@/lib/surveys';
import SurveySheet, { Chip } from './SurveySheet';
import { minutesLabel, questionsLabel, surveyTheme } from './theme';

/** Список доступных опросов из профиля — для тех, кто закрыл приглашение, но хочет вернуться. */
export default function SurveyListSheet({
  surveys,
  dark,
  onPick,
  onClose,
}: {
  surveys: SurveyCard[];
  dark: boolean;
  onPick: (survey: SurveyCard) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const th = surveyTheme(dark);

  return (
    <SurveySheet theme={th} onClose={onClose} label={t.sv_list_title}>
      <h3 className="text-[20px] font-extrabold" style={{ color: th.ink }}>
        {t.sv_list_title}
      </h3>
      <p className="text-[14px] mt-1" style={{ color: th.sub }}>
        {t.sv_list_subtitle}
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        {surveys.length === 0 && (
          <p className="text-[14px] py-6 text-center" style={{ color: th.sub }}>
            {t.sv_list_empty}
          </p>
        )}
        {surveys.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s)}
            className="w-full text-left rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            style={{ border: `1.5px solid ${th.line}` }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold leading-snug" style={{ color: th.ink }}>
                {s.title}
              </p>
              {s.description && (
                <p className="text-[13px] mt-0.5 line-clamp-2" style={{ color: th.sub }}>
                  {s.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <Chip theme={th}>
                  {questionsLabel(t, s.questionCount, locale)} · {minutesLabel(t, s.estimatedSeconds)}
                </Chip>
                {s.rewardCoins > 0 && (
                  <Chip theme={th}>
                    <Diamond size={13} />+{s.rewardCoins}
                  </Chip>
                )}
                {s.resume && (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold"
                    style={{ background: th.accentWash, color: th.accentInk }}
                  >
                    {t.sv_badge_continue}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={18} style={{ color: th.sub }} />
          </button>
        ))}
      </div>
    </SurveySheet>
  );
}
