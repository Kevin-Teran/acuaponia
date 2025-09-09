/**
 * @file ThemeContext.tsx
 * @route frontend/src/context
 * @description Proveedor de contexto para gestionar el tema de la aplicación.
 * El estado puede ser 'system', 'light', o 'dark', pero la UI solo alterna entre light y dark.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type ThemeState = 'system' | 'light' | 'dark';
type EffectiveTheme = 'light' | 'dark';

interface ThemeContextProps {
  effectiveTheme: EffectiveTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

/**
 * Hook personalizado para acceder al contexto del tema.
 * @throws {Error} Si se usa fuera de un ThemeProvider.
 * @returns El contexto del tema.
 */
export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Proveedor que envuelve la aplicación y proporciona el contexto del tema.
 * @param {ThemeProviderProps} props Las propiedades del proveedor.
 * @returns {JSX.Element}
 */
export const ThemeProvider = ({ children }: ThemeProviderProps): JSX.Element => {
  const [themeState, setThemeState] = useState<ThemeState>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as ThemeState | null;
    setThemeState(storedTheme || 'system');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = () => {
      let themeToApply: EffectiveTheme;

      if (themeState === 'system') {
        localStorage.removeItem('theme');
        themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        localStorage.setItem('theme', themeState);
        themeToApply = themeState;
      }
      
      root.classList.remove('light', 'dark');
      root.classList.add(themeToApply);
      setEffectiveTheme(themeToApply);
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        applyTheme();
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeState]);

  const toggleTheme = useCallback(() => {
    const newTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
  }, [effectiveTheme]);

  return (
    <ThemeContext.Provider value={{ effectiveTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};