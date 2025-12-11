import { createContext, useContext, useEffect, useState } from 'react';

type MembersTheme = 'dark' | 'light';

type MembersThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: MembersTheme;
  storageKey?: string;
};

type MembersThemeProviderState = {
  theme: MembersTheme;
  setTheme: (theme: MembersTheme) => void;
  isDark: boolean;
  toggleTheme: () => void;
};

const initialState: MembersThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
  isDark: true,
  toggleTheme: () => null,
};

const MembersThemeProviderContext = createContext<MembersThemeProviderState>(initialState);

export function MembersThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'kambafy-members-theme',
  ...props
}: MembersThemeProviderProps) {
  const [theme, setTheme] = useState<MembersTheme>(() => {
    return (localStorage.getItem(storageKey) as MembersTheme) || defaultTheme;
  });
  const [isDark, setIsDark] = useState(() => {
    const storedTheme = (localStorage.getItem(storageKey) as MembersTheme) || defaultTheme;
    return storedTheme === 'dark';
  });

  useEffect(() => {
    setIsDark(theme === 'dark');
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: MembersTheme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
    isDark,
    toggleTheme: () => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <MembersThemeProviderContext.Provider {...props} value={value}>
      {children}
    </MembersThemeProviderContext.Provider>
  );
}

export const useMembersTheme = () => {
  const context = useContext(MembersThemeProviderContext);

  if (context === undefined)
    throw new Error('useMembersTheme must be used within a MembersThemeProvider');

  return context;
};

// Theme color tokens
export const membersThemeColors = {
  dark: {
    background: 'hsl(30 20% 12%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, hsl(30 30% 25% / 0.4) 0%, transparent 60%)',
    text: 'hsl(40 20% 95%)',
    textMuted: 'hsl(30 10% 60%)',
    surface: 'hsl(30 15% 16%)',
    surfaceHover: 'hsl(30 15% 20%)',
    border: 'hsl(30 20% 25%)',
    accent: 'hsl(35 90% 55%)',
    accentMuted: 'hsl(35 60% 35%)',
  },
  light: {
    background: 'hsl(40 30% 96%)',
    backgroundGradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, hsl(35 40% 85% / 0.6) 0%, transparent 60%)',
    text: 'hsl(30 20% 15%)',
    textMuted: 'hsl(30 10% 45%)',
    surface: 'hsl(0 0% 100%)',
    surfaceHover: 'hsl(40 20% 95%)',
    border: 'hsl(35 20% 85%)',
    accent: 'hsl(35 90% 45%)',
    accentMuted: 'hsl(35 40% 70%)',
  },
};
