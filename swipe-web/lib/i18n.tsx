import React, { createContext, useContext, useState } from 'react';
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
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'uz';

    // Check URL param first — injected by the Flutter WebView.
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang') as Locale | null;
    if (urlLang && urlLang in translations) {
      localStorage.setItem('svayp_locale', urlLang);
      params.delete('lang');
      const newSearch = params.toString();
      const cleanUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', cleanUrl);
      return urlLang;
    }

    const saved = localStorage.getItem('svayp_locale') as Locale | null;
    if (saved && saved in translations) return saved;

    // No URL param and no saved preference — infer from the browser/device locale.
    // navigator.language returns e.g. 'ru-RU', 'uz-UZ', 'en-US'.
    const browserLang = (navigator.language ?? '').split('-')[0].toLowerCase();
    if (browserLang in translations) return browserLang as Locale;
    return 'uz';
  });

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
