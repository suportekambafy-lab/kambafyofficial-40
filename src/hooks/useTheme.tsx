
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  forceLightMode?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
};

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
  isDark: false,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'kambafy-ui-theme',
  forceLightMode = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (forceLightMode) return 'light';
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (forceLightMode) {
      root.classList.add('light');
      console.log('🎨 ThemeProvider: Forçando modo claro');
    } else {
      root.classList.add(theme);
      console.log('🎨 ThemeProvider: Aplicando tema', theme);
      console.log('🎨 ThemeProvider: Classes HTML', root.classList.toString());
    }
  }, [theme, forceLightMode]);

  const value = {
    theme: forceLightMode ? 'light' : theme,
    setTheme: (newTheme: Theme) => {
      if (forceLightMode) {
        console.log('🎨 ThemeProvider: Tentativa de mudar tema bloqueada (forceLightMode ativo)');
        return;
      }
      console.log('🎨 ThemeProvider: Mudando tema para', newTheme);
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
    isDark: forceLightMode ? false : theme === 'dark',
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
