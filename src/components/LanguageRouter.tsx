import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { getLanguageFromPath, type Language } from '@/utils/routeTranslations';

interface LanguageRouterProps {
  children: ReactNode;
}

export function LanguageRouter({ children }: LanguageRouterProps) {
  const { pathname } = useLocation();
  const { setLanguage } = useTranslation();
  
  useEffect(() => {
    const langFromPath = getLanguageFromPath(pathname);
    if (langFromPath) {
      setLanguage(langFromPath);
      localStorage.setItem('detectedLanguage', langFromPath);
    }
  }, [pathname, setLanguage]);
  
  return <>{children}</>;
}
