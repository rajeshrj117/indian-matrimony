'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export const theme = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  muted2: 'var(--muted2)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primary2: 'var(--primary2)',
  tabBg: 'var(--tabBg)',
  inputBg: 'var(--inputBg)',
  success: 'var(--success)',
};

const ThemeContext = createContext<{ isDark: boolean; toggle: () => void }>({
  isDark: false,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('flirty_dark') === 'true';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('flirty_dark', String(isDark));
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
