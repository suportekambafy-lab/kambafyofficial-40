
import { useState, useEffect, useMemo } from 'react';

interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  flag: string;
  exchangeRate: number;
}

const SUPPORTED_COUNTRIES: Record<string, CountryInfo> = {
  AO: {
    code: 'AO',
    name: 'Angola',
    currency: 'KZ',
    flag: '🇦🇴',
    exchangeRate: 1
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    currency: 'EUR',
    flag: '🇵🇹',
    exchangeRate: 0.0012
  },
  ES: {
    code: 'ES',
    name: 'Espanha',
    currency: 'EUR',
    flag: '🇪🇸',
    exchangeRate: 0.0012
  },
  MZ: {
    code: 'MZ',
    name: 'Moçambique',
    currency: 'MZN',
    flag: '🇲🇿',
    exchangeRate: 0.0697
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    flag: '🇬🇧',
    exchangeRate: 0.001
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    flag: '🇺🇸',
    exchangeRate: 0.0011
  },
  MX: {
    code: 'MX',
    name: 'México',
    currency: 'MXN',
    flag: '🇲🇽',
    exchangeRate: 0.022
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    currency: 'CLP',
    flag: '🇨🇱',
    exchangeRate: 1.05
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    currency: 'ARS',
    flag: '🇦🇷',
    exchangeRate: 1.10
  }
};

const COUNTRY_LANGUAGES: Record<string, string> = {
  'AO': 'pt',
  'PT': 'pt',
  'ES': 'es',
  'MZ': 'pt',
  'GB': 'en',
  'US': 'en',
  'MX': 'es',
  'CL': 'es',
  'AR': 'es'
};

const SAFETY_MARGIN = 1.05;

// Função para obter país inicial do cache ANTES do React
const getInitialCountry = (): CountryInfo => {
  try {
    const storedCountry = localStorage.getItem('userCountry');
    const lastIpDetection = localStorage.getItem('lastIpDetection');
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const hasRecentDetection = lastIpDetection && (now - parseInt(lastIpDetection)) < twentyFourHours;
    
    // Usar cache se foi detectado nas últimas 24 horas
    if (storedCountry && SUPPORTED_COUNTRIES[storedCountry] && hasRecentDetection) {
      console.log('🌍 Using cached country:', storedCountry);
      return SUPPORTED_COUNTRIES[storedCountry];
    }
    
    // Se temos país armazenado mas sem detecção recente, ainda usar o país armazenado
    // (será atualizado pela detecção de IP em background)
    if (storedCountry && SUPPORTED_COUNTRIES[storedCountry]) {
      console.log('🌍 Using stored country (pending IP refresh):', storedCountry);
      return SUPPORTED_COUNTRIES[storedCountry];
    }
  } catch {
    // localStorage indisponível
  }
  // Retornar AO como fallback (maioria dos utilizadores são de Angola)
  return SUPPORTED_COUNTRIES.AO;
};

// Função para obter taxas iniciais do cache
const getInitialRates = (): Record<string, CountryInfo> => {
  try {
    const storedRates = localStorage.getItem('exchangeRates');
    if (storedRates) {
      const rates = JSON.parse(storedRates);
      const countries = { ...SUPPORTED_COUNTRIES };
      if (rates.EUR) countries.PT.exchangeRate = rates.EUR;
      if (rates.MZN) countries.MZ.exchangeRate = rates.MZN;
      if (rates.GBP) countries.GB.exchangeRate = rates.GBP;
      if (rates.MXN) countries.MX.exchangeRate = rates.MXN;
      if (rates.CLP) countries.CL.exchangeRate = rates.CLP;
      if (rates.ARS) countries.AR.exchangeRate = rates.ARS;
      return countries;
    }
  } catch {
    // localStorage indisponível
  }
  return SUPPORTED_COUNTRIES;
};

// ======================================
// DETECÇÃO DE PAÍS - OTIMIZADA
// ======================================

// Detectar país pelo timezone (instantâneo, sem rede)
const detectCountryByTimezone = (): string | null => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneMap: Record<string, string> = {
      'Africa/Luanda': 'AO',
      'Africa/Maputo': 'MZ',
      'Europe/Lisbon': 'PT',
      'Atlantic/Madeira': 'PT',
      'Atlantic/Azores': 'PT',
      'Europe/Madrid': 'ES',
      'Atlantic/Canary': 'ES',
      'Europe/London': 'GB',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Phoenix': 'US',
      'America/Mexico_City': 'MX',
      'America/Cancun': 'MX',
      'America/Tijuana': 'MX',
      'America/Santiago': 'CL',
      'America/Punta_Arenas': 'CL',
      'America/Argentina/Buenos_Aires': 'AR',
      'America/Argentina/Cordoba': 'AR',
      'America/Argentina/Mendoza': 'AR',
      'America/Sao_Paulo': 'BR',
      'America/Fortaleza': 'BR',
      'America/Recife': 'BR',
      'America/Bahia': 'BR'
    };
    const detected = timezoneMap[timezone] || null;
    if (detected) {
      console.log('⏰ Timezone detected country:', detected, 'from', timezone);
    }
    return detected;
  } catch {
    return null;
  }
};

// Detectar país pelo idioma do navegador (fallback)
const detectCountryByLanguage = (): string | null => {
  try {
    const lang = navigator.language || (navigator as any).languages?.[0];
    if (!lang) return null;
    
    // Mapeamento preciso de locale -> país
    const langMap: Record<string, string> = {
      'pt-AO': 'AO',
      'pt-MZ': 'MZ',
      'pt-PT': 'PT',
      'pt-BR': 'PT', // Brasileiros podem comprar como PT
      'es-ES': 'ES',
      'es-MX': 'MX',
      'es-CL': 'CL',
      'es-AR': 'AR',
      'en-GB': 'GB',
      'en-US': 'US',
      'en-AU': 'US', // Fallback para US
      'en-CA': 'US'  // Fallback para US
    };
    
    // Primeiro tentar match exato
    if (langMap[lang]) {
      console.log('🌐 Language exact match:', langMap[lang], 'from', lang);
      return langMap[lang];
    }
    
    // Depois tentar pelo prefixo do idioma
    const prefix = lang.split('-')[0];
    const prefixMap: Record<string, string> = {
      'pt': 'AO', // Maioria dos users portugueses são de Angola
      'es': 'ES',
      'en': 'US'
    };
    
    if (prefixMap[prefix]) {
      console.log('🌐 Language prefix match:', prefixMap[prefix], 'from', prefix);
      return prefixMap[prefix];
    }
    
    return null;
  } catch {
    return null;
  }
};

// Lista de APIs de geolocalização ordenadas por velocidade/confiabilidade
const GEO_APIS = [
  {
    url: 'https://ip-api.com/json/?fields=countryCode',
    getCountryCode: (data: any) => data.countryCode,
    timeout: 2000,
    priority: 1
  },
  {
    url: 'https://ipwho.is/',
    getCountryCode: (data: any) => data.country_code,
    timeout: 2000,
    priority: 2
  },
  {
    url: 'https://api.country.is/',
    getCountryCode: (data: any) => data.country,
    timeout: 2000,
    priority: 3
  },
  {
    url: 'https://ipapi.co/json/',
    getCountryCode: (data: any) => data.country_code,
    timeout: 2500,
    priority: 4
  },
  {
    url: 'https://freeipapi.com/api/json',
    getCountryCode: (data: any) => data.countryCode,
    timeout: 2500,
    priority: 5
  }
];

// Função para fazer request com timeout
const fetchWithTimeout = async (url: string, timeout: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Interface para resultado de detecção com confiança
interface DetectionResult {
  country: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

// Função robusta para detectar país com múltiplos fallbacks e race agressivo
const detectCountryRobust = async (): Promise<DetectionResult | null> => {
  console.log('🌍 Starting optimized IP detection...');
  
  // 1. Verificar cache válido primeiro (24h)
  try {
    const storedCountry = localStorage.getItem('userCountry');
    const lastIpDetection = localStorage.getItem('lastIpDetection');
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (storedCountry && lastIpDetection && (now - parseInt(lastIpDetection)) < twentyFourHours) {
      console.log('✅ Using cached country (valid):', storedCountry);
      return { country: storedCountry, confidence: 'high', source: 'cache' };
    }
  } catch {}
  
  // 2. Tentar timezone primeiro (instantâneo)
  const timezoneCountry = detectCountryByTimezone();
  
  // 3. Race de APIs com early exit quando 2+ concordam
  const results: string[] = [];
  const countryVotes: Record<string, number> = {};
  
  // Promise que resolve quando temos consenso (2+ APIs concordam)
  const racePromise = new Promise<DetectionResult | null>((resolve) => {
    let resolved = false;
    let completedApis = 0;
    
    GEO_APIS.forEach(async (api, index) => {
      try {
        const response = await fetchWithTimeout(api.url, api.timeout);
        
        if (!response.ok) {
          completedApis++;
          return;
        }
        
        const data = await response.json();
        const countryCode = api.getCountryCode(data);
        
        if (countryCode && typeof countryCode === 'string' && countryCode.length === 2) {
          const code = countryCode.toUpperCase();
          results.push(code);
          countryVotes[code] = (countryVotes[code] || 0) + 1;
          
          console.log(`✅ API ${index + 1} (${api.url.split('/')[2]}) detected:`, code);
          
          // Se 2+ APIs concordam, retornar imediatamente (alta confiança)
          if (!resolved && countryVotes[code] >= 2) {
            resolved = true;
            console.log('🎯 Early consensus reached:', code, 'with', countryVotes[code], 'votes');
            resolve({ country: code, confidence: 'high', source: 'api-consensus' });
          }
          
          // Se timezone concorda com API, retornar (alta confiança)
          if (!resolved && timezoneCountry && code === timezoneCountry) {
            resolved = true;
            console.log('🎯 Timezone + API match:', code);
            resolve({ country: code, confidence: 'high', source: 'timezone-api-match' });
          }
        }
        
        completedApis++;
        
        // Se todas as APIs completaram sem consenso
        if (!resolved && completedApis === GEO_APIS.length) {
          // Usar o mais votado
          const sortedCountries = Object.entries(countryVotes).sort((a, b) => b[1] - a[1]);
          if (sortedCountries.length > 0) {
            const [winner, votes] = sortedCountries[0];
            const confidence = votes >= 2 ? 'high' : votes === 1 ? 'medium' : 'low';
            resolve({ country: winner, confidence, source: 'api-majority' });
          } else {
            resolve(null);
          }
        }
      } catch (error) {
        completedApis++;
        
        // Se todas falharam
        if (!resolved && completedApis === GEO_APIS.length && results.length === 0) {
          resolve(null);
        }
      }
    });
    
    // Timeout global de 3 segundos
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (results.length > 0) {
          const sortedCountries = Object.entries(countryVotes).sort((a, b) => b[1] - a[1]);
          const [winner, votes] = sortedCountries[0];
          console.log('⏱️ Timeout reached, using best result:', winner);
          resolve({ country: winner, confidence: votes >= 2 ? 'medium' : 'low', source: 'api-timeout' });
        } else if (timezoneCountry) {
          console.log('⏱️ Timeout, using timezone fallback:', timezoneCountry);
          resolve({ country: timezoneCountry, confidence: 'medium', source: 'timezone-fallback' });
        } else {
          resolve(null);
        }
      }
    }, 3000);
  });
  
  const apiResult = await racePromise;
  
  if (apiResult) {
    return apiResult;
  }
  
  // 4. Fallback para timezone se APIs falharam
  if (timezoneCountry) {
    console.log('⚠️ APIs failed, using timezone:', timezoneCountry);
    return { country: timezoneCountry, confidence: 'medium', source: 'timezone-only' };
  }
  
  // 5. Último fallback: idioma do navegador
  const languageCountry = detectCountryByLanguage();
  if (languageCountry) {
    console.log('⚠️ Using browser language fallback:', languageCountry);
    return { country: languageCountry, confidence: 'low', source: 'language' };
  }
  
  console.log('❌ All detection methods failed');
  return null;
};

// Exportar funções auxiliares para uso em outros hooks
export { detectCountryByTimezone, detectCountryByLanguage, detectCountryRobust };

export const useGeoLocation = () => {
  // Inicializar com dados do cache IMEDIATAMENTE
  const [userCountry, setUserCountry] = useState<CountryInfo>(getInitialCountry);
  const [supportedCountries, setSupportedCountries] = useState(getInitialRates);
  const [loading, setLoading] = useState(() => {
    // Se já temos país em cache, não está carregando
    try {
      return !localStorage.getItem('userCountry');
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('pt');
  const [isReady, setIsReady] = useState(() => {
    try {
      return !!localStorage.getItem('userCountry');
    } catch {
      return false;
    }
  });

  const fetchExchangeRates = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/AOA');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      
      const updatedCountries = { ...SUPPORTED_COUNTRIES };
      
      if (data.rates.EUR) {
        updatedCountries.PT.exchangeRate = data.rates.EUR * SAFETY_MARGIN;
      }
      
      if (data.rates.MZN) {
        updatedCountries.MZ.exchangeRate = data.rates.MZN * SAFETY_MARGIN;
      }
      
      if (data.rates.GBP) {
        updatedCountries.GB.exchangeRate = data.rates.GBP * SAFETY_MARGIN;
      }
      
      if (data.rates.MXN) {
        updatedCountries.MX.exchangeRate = data.rates.MXN * SAFETY_MARGIN;
      }
      
      if (data.rates.CLP) {
        updatedCountries.CL.exchangeRate = data.rates.CLP * SAFETY_MARGIN;
      }

      if (data.rates.ARS) {
        updatedCountries.AR.exchangeRate = data.rates.ARS * SAFETY_MARGIN;
      }
      
      setSupportedCountries(updatedCountries);
      
      localStorage.setItem('exchangeRates', JSON.stringify({
        EUR: updatedCountries.PT.exchangeRate,
        MZN: updatedCountries.MZ.exchangeRate,
        GBP: updatedCountries.GB.exchangeRate,
        MXN: updatedCountries.MX.exchangeRate,
        CLP: updatedCountries.CL.exchangeRate,
        ARS: updatedCountries.AR.exchangeRate
      }));
      localStorage.setItem('ratesLastUpdate', Date.now().toString());
      
      if (userCountry.code !== 'AO') {
        setUserCountry(updatedCountries[userCountry.code]);
      }
      
    } catch (err) {
      // Keep fallback rates if API fails
    }
  };

  const detectCountryByIP = async () => {
    try {
      console.log('🌍 Iniciando detecção de país otimizada...');
      
      // Usar a função robusta de detecção com confiança
      const result = await detectCountryRobust();
      
      if (result) {
        const detectedCountry = supportedCountries[result.country];
        
        if (detectedCountry) {
          console.log(`✅ País detectado e suportado: ${result.country} (confiança: ${result.confidence}, fonte: ${result.source})`);
          setUserCountry(detectedCountry);
          localStorage.setItem('userCountry', result.country);
          localStorage.setItem('lastIpDetection', Date.now().toString());
          localStorage.setItem('detectionConfidence', result.confidence);
          localStorage.setItem('detectionSource', result.source);
          
          const language = COUNTRY_LANGUAGES[result.country] || 'pt';
          setDetectedLanguage(language);
          applyLanguage(language);
        } else {
          // País não suportado - usar Angola como padrão (maioria dos users)
          console.log('🌍 País não suportado, usando AO como padrão:', result.country);
          setUserCountry(supportedCountries.AO);
          localStorage.setItem('userCountry', 'AO');
          localStorage.setItem('detectedButUnsupported', result.country);
          localStorage.setItem('lastIpDetection', Date.now().toString());
          setDetectedLanguage('pt');
          applyLanguage('pt');
        }
      } else {
        // Nenhum método funcionou - usar Angola como fallback (maioria dos utilizadores)
        console.log('⚠️ Todos os métodos de detecção falharam, usando AO como fallback');
        const storedCountry = localStorage.getItem('userCountry');
        
        // Só atualizar se não tivermos nenhum país guardado
        if (!storedCountry) {
          setUserCountry(supportedCountries.AO);
          localStorage.setItem('userCountry', 'AO');
          localStorage.setItem('lastIpDetection', Date.now().toString());
          setDetectedLanguage('pt');
          applyLanguage('pt');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao detectar país:', err);
      // Em caso de erro - manter país existente ou usar Angola
      const storedCountry = localStorage.getItem('userCountry');
      if (!storedCountry) {
        console.log('⚠️ Erro na detecção, usando AO como fallback');
        setUserCountry(supportedCountries.AO);
        localStorage.setItem('userCountry', 'AO');
        setDetectedLanguage('pt');
        applyLanguage('pt');
      }
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  };

  const getUserCountryFromProfile = async () => {
    try {
      const storedCountry = localStorage.getItem('userCountry');
      if (storedCountry && supportedCountries[storedCountry]) {
        setUserCountry(supportedCountries[storedCountry]);
      } else {
        await detectCountryByIP();
      }
    } catch (err) {
      await detectCountryByIP();
    }
  };

  // Taxas de conversão entre moedas (base: 1 unidade da moeda origem)
  const getCrossRate = (fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return 1;
    
    // Taxas aproximadas baseadas em valores reais
    const rates: Record<string, Record<string, number>> = {
      'EUR': { 'KZ': 950, 'MZN': 68, 'GBP': 0.85, 'USD': 1.08, 'MXN': 18.5, 'CLP': 1000, 'ARS': 950 },
      'KZ': { 'EUR': 0.00105, 'MZN': 0.072, 'GBP': 0.00089, 'USD': 0.00114, 'MXN': 0.0195, 'CLP': 1.05, 'ARS': 1.0 },
      'USD': { 'EUR': 0.93, 'KZ': 875, 'MZN': 63, 'GBP': 0.79, 'MXN': 17.2, 'CLP': 925, 'ARS': 880 },
      'GBP': { 'EUR': 1.18, 'KZ': 1120, 'MZN': 80, 'USD': 1.27, 'MXN': 21.8, 'CLP': 1175, 'ARS': 1100 },
      'MZN': { 'EUR': 0.015, 'KZ': 14, 'GBP': 0.0125, 'USD': 0.016, 'MXN': 0.27, 'CLP': 14.7, 'ARS': 14 },
      'MXN': { 'EUR': 0.054, 'KZ': 51, 'GBP': 0.046, 'USD': 0.058, 'MZN': 3.7, 'CLP': 54, 'ARS': 51 },
      'CLP': { 'EUR': 0.001, 'KZ': 0.95, 'GBP': 0.00085, 'USD': 0.00108, 'MZN': 0.068, 'MXN': 0.0185, 'ARS': 0.95 },
      'ARS': { 'EUR': 0.00105, 'KZ': 1.0, 'GBP': 0.00091, 'USD': 0.00114, 'MZN': 0.071, 'MXN': 0.0196, 'CLP': 1.05 }
    };
    
    return rates[fromCurrency]?.[toCurrency] || 1;
  };

  const convertPrice = (priceValue: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>, sourceCurrency?: string): number => {
    const country = targetCountry || userCountry;
    
    // Se há preço personalizado para o país, usar diretamente
    if (customPrices && customPrices[country.code]) {
      const customPrice = parseFloat(customPrices[country.code]);
      if (!isNaN(customPrice)) {
        return customPrice;
      }
    }
    
    // Se a moeda de origem é a mesma do destino, retornar o valor original
    const fromCurrency = sourceCurrency || 'KZ';
    if (fromCurrency === country.currency) {
      return priceValue;
    }
    
    // Converter usando taxa cruzada
    const rate = getCrossRate(fromCurrency, country.currency);
    const convertedValue = priceValue * rate;
    let roundedValue = Math.round(convertedValue * 100) / 100;
    
    // Garantir mínimo de 1 para GBP e EUR
    if ((country.currency === 'GBP' || country.currency === 'EUR') && roundedValue < 1) {
      roundedValue = 1;
    }
    
    return roundedValue;
  };

  const formatPrice = (priceValue: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>, sourceCurrency?: string): string => {
    const country = targetCountry || userCountry;
    
    console.log('🔄 formatPrice DEBUG:', {
      priceValue,
      sourceCurrency,
      countryCode: country?.code,
      targetCurrency: country?.currency,
      customPrices,
      hasCustomPrice: customPrices && customPrices[country?.code]
    });
    
    // Se há preço personalizado para o país, usar diretamente
    if (customPrices && customPrices[country.code]) {
      const customPrice = parseFloat(customPrices[country.code]);
      
      if (!isNaN(customPrice)) {
        console.log('🔄 Using custom price:', customPrice);
        return formatCurrencyValue(customPrice, country.currency);
      }
    }
    
    // Se a moeda de origem é a mesma do destino, formatar diretamente
    const fromCurrency = sourceCurrency || 'KZ';
    if (fromCurrency === country.currency) {
      console.log('🔄 Same currency, no conversion:', priceValue, fromCurrency);
      return formatCurrencyValue(priceValue, country.currency);
    }
    
    // Converter e formatar
    const convertedPrice = convertPrice(priceValue, country, undefined, fromCurrency);
    console.log('🔄 Converted price:', convertedPrice, 'from', priceValue, fromCurrency, 'to', country?.currency);
    
    return formatCurrencyValue(convertedPrice, country.currency);
  };
  
  // Helper para formatar valor em moeda específica
  const formatCurrencyValue = (value: number, currency: string): string => {
    switch (currency) {
      case 'EUR':
        return `€${value.toFixed(2)}`;
      case 'GBP':
        return `£${value.toFixed(2)}`;
      case 'USD':
        return `$${value.toFixed(2)}`;
      case 'MXN':
        return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
      case 'CLP':
        return `$${Math.round(value).toLocaleString('es-CL')} CLP`;
      case 'ARS':
        const hasDecimals = value % 1 !== 0;
        return hasDecimals 
          ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`
          : `$${Math.round(value).toLocaleString('es-AR')} ARS`;
      case 'MZN':
        return `${value.toFixed(2)} MZN`;
      case 'KZ':
      default:
        return `${parseFloat(value.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KZ`;
    }
  };

  const changeCountry = (countryCode: string) => {
    const country = supportedCountries[countryCode];
    if (country) {
      setUserCountry(country);
      localStorage.setItem('userCountry', countryCode);
      localStorage.setItem('lastIpDetection', Date.now().toString());
      
      const language = COUNTRY_LANGUAGES[countryCode] || 'pt';
      setDetectedLanguage(language);
      applyLanguage(language);
    }
  };

  const applyLanguage = (language: string) => {
    try {
      document.documentElement.lang = language;
      localStorage.setItem('detectedLanguage', language);
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    const initializeGeoLocation = async () => {
      const storedCountry = localStorage.getItem('userCountry');
      const lastUpdate = localStorage.getItem('ratesLastUpdate');
      const lastIpDetection = localStorage.getItem('lastIpDetection');
      
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const hasRecentRates = lastUpdate && (now - parseInt(lastUpdate)) < oneHour;
      const hasRecentIpDetection = lastIpDetection && (now - parseInt(lastIpDetection)) < twentyFourHours;
      
      // Se já temos país guardado E foi detectado nas últimas 24 horas
      if (storedCountry && SUPPORTED_COUNTRIES[storedCountry] && hasRecentIpDetection) {
        console.log('🌍 Using cached country (recent 24h):', storedCountry);
        setUserCountry(SUPPORTED_COUNTRIES[storedCountry]);
        setIsReady(true);
        setLoading(false);
        
        const language = COUNTRY_LANGUAGES[storedCountry] || 'pt';
        setDetectedLanguage(language);
        applyLanguage(language);
        
        // Atualizar taxas em background sem bloquear
        if (!hasRecentRates) {
          fetchExchangeRates();
        }
        
        return;
      }
      
      // Detectar país por IP (primeira visita ou cache expirado após 24h)
      console.log('🌍 Detecting country by IP (no recent cache)...');
      await detectCountryByIP();
      fetchExchangeRates();
    };
    
    initializeGeoLocation();
    
    const interval = setInterval(fetchExchangeRates, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    userCountry,
    loading,
    error,
    convertPrice,
    formatPrice,
    changeCountry,
    supportedCountries,
    detectCountryByIP,
    fetchExchangeRates,
    detectedLanguage,
    isReady
  };
};
