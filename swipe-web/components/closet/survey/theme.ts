import type { Translations } from '@/lib/translations';

/**
 * Цвета опросов — токены гардероба, а не своя палитра: опрос открывается поверх
 * гардероба и должен выглядеть его частью (акцент #F370A7, те же поверхности и текст).
 */
export function surveyTheme(dark: boolean) {
  return {
    surface: dark ? '#1c1c1e' : '#ffffff',
    ink: dark ? '#ffffff' : '#141118',
    sub: dark ? '#8e8e93' : '#9a8f98',
    chip: dark ? 'rgba(255,255,255,0.08)' : '#f5f1f4',
    line: dark ? 'rgba(255,255,255,0.12)' : '#ece6ea',
    handle: dark ? '#3a3a3c' : '#e2dbe1',
    track: dark ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
    accent: '#F370A7',
    accentGradient: 'linear-gradient(135deg,#F370A7,#e0559a)',
    accentWash: dark ? 'rgba(243,112,167,0.16)' : 'rgba(243,112,167,0.08)',
    accentInk: dark ? '#F9A9CB' : '#b9366f',
    backdrop: 'rgba(15,8,14,0.5)',
  };
}

export type SurveyTheme = ReturnType<typeof surveyTheme>;

/** «1 вопрос / 2 вопроса / 5 вопросов» — русские формы; для uz/en хватает one/many. */
export function questionsLabel(t: Translations, n: number, locale: string): string {
  let key: 'sv_questions_one' | 'sv_questions_few' | 'sv_questions_many' = 'sv_questions_many';
  if (locale === 'ru') {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) key = 'sv_questions_one';
    else if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) key = 'sv_questions_few';
  } else if (n === 1) {
    key = 'sv_questions_one';
  }
  return t[key].replace('{n}', String(n));
}

/** «~1 мин», минимум одна минута. */
export function minutesLabel(t: Translations, seconds: number): string {
  return t.sv_minutes.replace('{n}', String(Math.max(1, Math.round(seconds / 60))));
}
