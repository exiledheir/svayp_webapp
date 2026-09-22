import React from 'react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';
import type { CompleteResult } from '@/lib/surveys';
import SurveySheet from './SurveySheet';
import { surveyTheme } from './theme';

/**
 * «Спасибо!» после завершения. Повторное завершение (alreadyCompleted) ничего не начисляет —
 * писать «+10 алмазов» второй раз значит врать, поэтому тогда только «ответы сохранены».
 */
export default function SurveyDoneSheet({
  result,
  dark,
  fallbackTtlDays,
  onClose,
}: {
  result: CompleteResult;
  dark: boolean;
  fallbackTtlDays?: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const th = surveyTheme(dark);
  const rewarded = result.rewardCoins > 0 && !result.alreadyCompleted;
  const ttl = result.freeCoinTtlDays || fallbackTtlDays || 7;

  return (
    <SurveySheet theme={th} onClose={onClose} label={t.sv_done_title}>
      <div className="flex flex-col items-center text-center">
        <Diamond size={52} glow />
        <h3 className="text-[20px] font-extrabold mt-3" style={{ color: th.ink }}>
          {t.sv_done_title}
        </h3>
        {rewarded ? (
          <>
            <p className="text-[26px] font-extrabold mt-1.5 tabular-nums" style={{ color: '#E0559A' }}>
              {t.sv_reward.replace('{n}', String(result.rewardCoins))}
            </p>
            <p
              className="text-[12.5px] mt-3 rounded-xl px-3 py-2"
              style={{ background: th.accentWash, color: th.accentInk }}
            >
              {t.sv_done_expires.replace('{n}', String(ttl))}
            </p>
          </>
        ) : (
          <p className="text-[14px] mt-1.5" style={{ color: th.sub }}>
            {t.sv_done_saved}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full h-14 rounded-2xl mt-6 text-white text-[16px] font-bold active:scale-[0.98] transition-transform"
        style={{ background: th.accent }}
      >
        {t.sv_done_ok}
      </button>
    </SurveySheet>
  );
}
