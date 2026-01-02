import { useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { 
  getLanguageFromPath, 
  removeLanguagePrefix, 
  addLanguagePrefix,
  type Language 
} from '@/utils/routeTranslations';

export function useLanguageRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage } = useTranslation();
  
  // Detectar idioma do prefixo da URL
  const urlLanguage = useMemo(() => 
    getLanguageFromPath(location.pathname), 
    [location.pathname]
  );
  
  // Sincronizar idioma da URL com o contexto
  useEffect(() => {
    if (urlLanguage && urlLanguage !== language) {
      setLanguage(urlLanguage);
      localStorage.setItem('detectedLanguage', urlLanguage);
    }
  }, [urlLanguage, language, setLanguage]);
  
  // Função para navegar mantendo o idioma atual
  const navigateWithLanguage = useCallback((path: string) => {
    const currentLang = urlLanguage || language;
    if (currentLang && currentLang !== 'pt') {
      navigate(addLanguagePrefix(path, currentLang));
    } else {
      navigate(path);
    }
  }, [urlLanguage, language, navigate]);
  
  // Função para trocar de idioma mantendo a rota atual
  const switchLanguage = useCallback((newLanguage: Language) => {
    const cleanPath = removeLanguagePrefix(location.pathname);
    
    if (newLanguage === 'pt') {
      // Português é o padrão, remover prefixo
      navigate(cleanPath || '/');
    } else {
      navigate(addLanguagePrefix(cleanPath, newLanguage));
    }
    
    setLanguage(newLanguage);
    localStorage.setItem('detectedLanguage', newLanguage);
  }, [location.pathname, navigate, setLanguage]);
  
  // Obter o path sem o prefixo de idioma
  const cleanPath = useMemo(() => 
    removeLanguagePrefix(location.pathname), 
    [location.pathname]
  );
  
  return { 
    currentLanguage: urlLanguage || language,
    urlLanguage,
    navigateWithLanguage, 
    switchLanguage,
    cleanPath
  };
}
