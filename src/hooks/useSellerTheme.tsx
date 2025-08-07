import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

type SellerThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type SellerThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
};

const initialState: SellerThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
  isDark: false,
};

const SellerThemeProviderContext = createContext<SellerThemeProviderState>(initialState);

export function SellerThemeProvider({
  children,
  defaultTheme = 'light', // Padrão sempre claro para o painel
  storageKey = 'kambafy-seller-theme',
  ...props
}: SellerThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });
  const [isDark, setIsDark] = useState(() => {
    const storedTheme = (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    return storedTheme === 'dark';
  });

  useEffect(() => {
    // Não aplicar tema globalmente - será aplicado apenas no container do vendedor
    setIsDark(theme === 'dark');
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
    isDark,
  };

  return (
    <SellerThemeProviderContext.Provider {...props} value={value}>
      {children}
    </SellerThemeProviderContext.Provider>
  );
}

export const useSellerTheme = () => {
  const context = useContext(SellerThemeProviderContext);

  if (context === undefined)
    throw new Error('useSellerTheme must be used within a SellerThemeProvider');

  return context;
};