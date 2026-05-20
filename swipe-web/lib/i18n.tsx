import React, { createContext, useContext, useEffect, useState } from 'react';
import { Locale, Translations, translations } from './translations';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'uz',
  setLocale: () => {},
  t: translations.uz,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('uz');

  useEffect(() => {
    const saved = localStorage.getItem('svayp_locale') as Locale | null;
    if (saved && saved in translations) setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem('svayp_locale', l);
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
