import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
});

/**
 * Provides light/dark theme state. On first render it checks (in order):
 *   1. `?theme=` URL query parameter injected by the Flutter WebView
 *   2. Value previously stored in localStorage
 *   3. Default: 'light'
 *
 * The URL param is consumed synchronously so it is never visible after the
 * initial render, matching the same pattern used for auth tokens.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';

    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme');

    if (urlTheme === 'dark' || urlTheme === 'light') {
      localStorage.setItem('svayp_theme', urlTheme);
      params.delete('theme');
      const newSearch = params.toString();
      const cleanUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', cleanUrl);
      return urlTheme;
    }

    const saved = localStorage.getItem('svayp_theme');
    if (saved === 'dark' || saved === 'light') return saved;

    // No URL param and no saved preference — use the device system setting.
    // This matches the Flutter app's default behavior of following the OS theme.
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply / remove the `dark` class on <html> whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('svayp_theme', t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
