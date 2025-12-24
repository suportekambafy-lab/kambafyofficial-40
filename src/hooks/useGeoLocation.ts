
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

// Lista de APIs de geolocalização ordenadas por confiabilidade
const GEO_APIS = [
  {
    url: 'https://ipapi.co/json/',
    getCountryCode: (data: any) => data.country_code,
    timeout: 3000
  },
  {
    url: 'https://ipwho.is/',
    getCountryCode: (data: any) => data.country_code,
    timeout: 3000
  },
  {
    url: 'https://ip-api.com/json/?fields=countryCode',
    getCountryCode: (data: any) => data.countryCode,
    timeout: 3000
  },
  {
    url: 'https://api.country.is/',
    getCountryCode: (data: any) => data.country,
    timeout: 3000
  },
  {
    url: 'https://freeipapi.com/api/json',
    getCountryCode: (data: any) => data.countryCode,
    timeout: 3000
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

// Função robusta para detectar país com múltiplos fallbacks
const detectCountryRobust = async (): Promise<string | null> => {
  console.log('🌍 Starting robust IP detection...');
  
  // Tentar todas as APIs em paralelo para máxima velocidade
  const promises = GEO_APIS.map(async (api, index) => {
    try {
      const response = await fetchWithTimeout(api.url, api.timeout);
      
      if (!response.ok) {
        console.log(`⚠️ API ${index + 1} returned status:`, response.status);
        return null;
      }
      
      const data = await response.json();
      const countryCode = api.getCountryCode(data);
      
      if (countryCode && typeof countryCode === 'string' && countryCode.length === 2) {
        console.log(`✅ API ${index + 1} (${api.url}) detected:`, countryCode);
        return countryCode.toUpperCase();
      }
      
      console.log(`⚠️ API ${index + 1} returned invalid country code:`, countryCode);
      return null;
    } catch (error) {
      console.log(`⚠️ API ${index + 1} (${api.url}) failed:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  });
  
  // Usar Promise.allSettled para obter todos os resultados
  const results = await Promise.allSettled(promises);
  
  // Filtrar resultados válidos
  const validResults = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
  
  if (validResults.length === 0) {
    console.log('❌ All APIs failed to detect country');
    return null;
  }
  
  // Contar ocorrências de cada país para votação por maioria
  const countryVotes: Record<string, number> = {};
  validResults.forEach(country => {
    countryVotes[country] = (countryVotes[country] || 0) + 1;
  });
  
  // Encontrar o país com mais votos
  let mostVotedCountry = validResults[0];
  let maxVotes = 1;
  
  for (const [country, votes] of Object.entries(countryVotes)) {
    if (votes > maxVotes) {
      mostVotedCountry = country;
      maxVotes = votes;
    }
  }
  
  console.log('🗳️ Country votes:', countryVotes, '-> Winner:', mostVotedCountry);
  
  return mostVotedCountry;
};

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
      console.log('🌍 Iniciando detecção de país por IP...');
      
      // Usar a função robusta de detecção
      const countryCode = await detectCountryRobust();
      
      if (countryCode) {
        const detectedCountry = supportedCountries[countryCode];
        
        if (detectedCountry) {
          console.log('✅ País detectado e suportado:', countryCode);
          setUserCountry(detectedCountry);
          localStorage.setItem('userCountry', countryCode);
          localStorage.setItem('lastIpDetection', Date.now().toString());
          
          const language = COUNTRY_LANGUAGES[countryCode] || 'pt';
          setDetectedLanguage(language);
          applyLanguage(language);
        } else {
          // País não suportado - usar Angola como padrão (maioria dos users)
          console.log('🌍 País não suportado, usando AO como padrão:', countryCode);
          setUserCountry(supportedCountries.AO);
          localStorage.setItem('userCountry', 'AO');
          localStorage.setItem('detectedButUnsupported', countryCode);
          localStorage.setItem('lastIpDetection', Date.now().toString());
          setDetectedLanguage('pt');
          applyLanguage('pt');
        }
      } else {
        // Nenhuma API funcionou - usar Angola como fallback (maioria dos utilizadores)
        console.log('⚠️ Todas as APIs de IP falharam, usando AO como fallback');
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
      console.error('❌ Erro ao detectar país por IP:', err);
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

  const convertPrice = (priceInKZ: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>): number => {
    const country = targetCountry || userCountry;
    
    if (customPrices && customPrices[country.code]) {
      const customPrice = parseFloat(customPrices[country.code]);
      if (!isNaN(customPrice)) {
        return customPrice;
      }
    }
    
    const convertedValue = priceInKZ * country.exchangeRate;
    let roundedValue = Math.round(convertedValue * 100) / 100;
    
    // Garantir mínimo de 1 para GBP e EUR
    if ((country.currency === 'GBP' || country.currency === 'EUR') && roundedValue < 1) {
      roundedValue = 1;
    }
    
    return roundedValue;
  };

  const formatPrice = (priceInKZ: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>): string => {
    const country = targetCountry || userCountry;
    
    console.log('🔄 formatPrice DEBUG:', {
      priceInKZ,
      countryCode: country?.code,
      currency: country?.currency,
      exchangeRate: country?.exchangeRate,
      customPrices,
      hasCustomPrice: customPrices && customPrices[country?.code]
    });
    
    if (customPrices && customPrices[country.code]) {
      const customPrice = parseFloat(customPrices[country.code]);
      
      if (!isNaN(customPrice)) {
        console.log('🔄 Using custom price:', customPrice);
        switch (country.currency) {
          case 'EUR':
            return `€${customPrice.toFixed(2)}`;
          case 'GBP':
            return `£${customPrice.toFixed(2)}`;
          case 'USD':
            return `$${customPrice.toFixed(2)}`;
          case 'MXN':
            return `$${customPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
          case 'CLP':
            return `$${Math.round(customPrice).toLocaleString('es-CL')} CLP`;
          case 'ARS':
            const hasDecimalsCustomGeo = customPrice % 1 !== 0;
            return hasDecimalsCustomGeo 
              ? `$${customPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`
              : `$${Math.round(customPrice).toLocaleString('es-AR')} ARS`;
          case 'MZN':
            return `${customPrice.toFixed(2)} MZN`;
          case 'KZ':
          default:
            return `${parseFloat(customPrice.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KZ`;
        }
      }
    }
    
    const convertedPrice = convertPrice(priceInKZ, country);
    console.log('🔄 Converted price:', convertedPrice, 'from', priceInKZ, '* rate', country?.exchangeRate);
    
    switch (country?.currency) {
      case 'EUR':
        return `€${convertedPrice.toFixed(2)}`;
      case 'GBP':
        return `£${convertedPrice.toFixed(2)}`;
      case 'USD':
        return `$${convertedPrice.toFixed(2)}`;
      case 'MXN':
        return `$${convertedPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
      case 'CLP':
        return `$${Math.round(convertedPrice).toLocaleString('es-CL')} CLP`;
      case 'ARS':
        const hasDecimalsConvertedGeo = convertedPrice % 1 !== 0;
        return hasDecimalsConvertedGeo 
          ? `$${convertedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`
          : `$${Math.round(convertedPrice).toLocaleString('es-AR')} ARS`;
      case 'MZN':
        return `${convertedPrice.toFixed(2)} MZN`;
      case 'KZ':
      default:
        return `${parseFloat(convertedPrice.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KZ`;
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
