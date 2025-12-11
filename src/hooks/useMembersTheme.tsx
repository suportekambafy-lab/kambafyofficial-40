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

// Theme color tokens - matching login page dark theme
export const membersThemeColors = {
  dark: {
    background: '#000000', // Pure black like login
    backgroundGradient: 'radial-gradient(ellipse 80% 50% at 50% 0%, hsl(0 0% 12% / 0.6) 0%, transparent 60%)',
    text: '#ffffff',
    textMuted: 'hsl(0 0% 64%)', // zinc-400
    surface: 'hsl(0 0% 4%)', // zinc-950
    surfaceHover: 'hsl(0 0% 9%)', // zinc-900
    border: 'hsl(0 0% 15%)', // zinc-800
    accent: 'hsl(0 0% 64%)', // zinc-400
    accentMuted: 'hsl(0 0% 27%)', // zinc-700
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
