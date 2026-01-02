import { useTranslation } from '@/contexts/TranslationContext';
import { LANDING_TRANSLATIONS, type Language } from '@/utils/landingTranslations';

export function useLandingTranslation() {
  const { language } = useTranslation();
  
  const t = (key: string): string => {
    return LANDING_TRANSLATIONS[language as Language]?.[key] || 
           LANDING_TRANSLATIONS.pt[key] || 
           key;
  };
  
  // Retorna array de palavras rotativas
  const getRotatingWords = (): string[] => {
    const words = t('hero.rotatingWords');
    return words.split(',');
  };
  
  return { t, language, getRotatingWords };
}
