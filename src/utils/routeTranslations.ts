// Mapeamento de URLs traduzidas para cada idioma
export const ROUTE_TRANSLATIONS = {
  pt: {
    'pricing': 'precos',
    'features': 'recursos',
    'how-it-works': 'como-funciona',
    'help': 'ajuda',
    'privacy': 'privacidade',
    'terms': 'termos',
    'contact': 'contato',
    'about': 'sobre'
  },
  en: {
    'pricing': 'pricing',
    'features': 'features',
    'how-it-works': 'how-it-works',
    'help': 'help',
    'privacy': 'privacy',
    'terms': 'terms',
    'contact': 'contact',
    'about': 'about'
  },
  es: {
    'pricing': 'precios',
    'features': 'caracteristicas',
    'how-it-works': 'como-funciona',
    'help': 'ayuda',
    'privacy': 'privacidad',
    'terms': 'terminos',
    'contact': 'contacto',
    'about': 'acerca'
  }
} as const;

export type Language = 'pt' | 'en' | 'es';
export type RouteKey = keyof typeof ROUTE_TRANSLATIONS.pt;

// Lista de prefixos de idioma válidos
export const VALID_LANGUAGE_PREFIXES = ['pt', 'en', 'es'] as const;

// Extrair idioma do pathname
export const getLanguageFromPath = (pathname: string): Language | null => {
  const match = pathname.match(/^\/(pt|en|es)(\/|$)/);
  return match ? (match[1] as Language) : null;
};

// Remover prefixo de idioma do pathname
export const removeLanguagePrefix = (pathname: string): string => {
  return pathname.replace(/^\/(pt|en|es)(\/|$)/, '/').replace(/^\/+/, '/');
};

// Adicionar prefixo de idioma ao pathname
export const addLanguagePrefix = (pathname: string, language: Language): string => {
  const cleanPath = removeLanguagePrefix(pathname);
  return `/${language}${cleanPath === '/' ? '' : cleanPath}`;
};

// Traduzir rota para o idioma especificado
export const translateRoute = (routeKey: RouteKey, language: Language): string => {
  return ROUTE_TRANSLATIONS[language][routeKey] || routeKey;
};

// Encontrar a chave da rota a partir do slug traduzido
export const findRouteKey = (slug: string): RouteKey | null => {
  for (const lang of VALID_LANGUAGE_PREFIXES) {
    for (const [key, value] of Object.entries(ROUTE_TRANSLATIONS[lang])) {
      if (value === slug) {
        return key as RouteKey;
      }
    }
  }
  return null;
};
