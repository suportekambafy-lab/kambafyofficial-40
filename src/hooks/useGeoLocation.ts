
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
  }
};

const COUNTRY_LANGUAGES: Record<string, string> = {
  'AO': 'pt',
  'PT': 'pt',
  'MZ': 'pt',
  'GB': 'en',
  'US': 'en'
};

const SAFETY_MARGIN = 1.05;

// Função para obter país inicial do cache ANTES do React
const getInitialCountry = (): CountryInfo => {
  try {
    const storedCountry = localStorage.getItem('userCountry');
    if (storedCountry && SUPPORTED_COUNTRIES[storedCountry]) {
      return SUPPORTED_COUNTRIES[storedCountry];
    }
  } catch {
    // localStorage indisponível
  }
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
      return countries;
    }
  } catch {
    // localStorage indisponível
  }
  return SUPPORTED_COUNTRIES;
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
      
      setSupportedCountries(updatedCountries);
      
      localStorage.setItem('exchangeRates', JSON.stringify({
        EUR: updatedCountries.PT.exchangeRate,
        MZN: updatedCountries.MZ.exchangeRate,
        GBP: updatedCountries.GB.exchangeRate
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      // Tentar múltiplas APIs em sequência
      const apis = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/?fields=countryCode',
        'https://ipwho.is/'
      ];
      
      let countryCode: string | null = null;
      
      for (const api of apis) {
        try {
          const response = await fetch(api, {
            signal: controller.signal
          });
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          // Diferentes APIs retornam o país em diferentes campos
          countryCode = data.country_code || data.countryCode || data.country;
          
          if (countryCode) {
            console.log(`✅ País detectado via ${api}:`, countryCode);
            break;
          }
        } catch (apiError) {
          console.log(`⚠️ API ${api} falhou, tentando próxima...`);
          continue;
        }
      }
      
      clearTimeout(timeout);
      
      if (countryCode) {
        const detectedCountry = supportedCountries[countryCode];
        
        if (detectedCountry) {
          setUserCountry(detectedCountry);
          localStorage.setItem('userCountry', countryCode);
          const language = COUNTRY_LANGUAGES[countryCode] || 'pt';
          setDetectedLanguage(language);
          applyLanguage(language);
        } else {
          // País não suportado, usar Angola como padrão
          setUserCountry(supportedCountries.AO);
          localStorage.setItem('userCountry', 'AO');
          setDetectedLanguage('pt');
          applyLanguage('pt');
        }
      } else {
        // Nenhuma API funcionou, manter país atual (do cache ou Angola)
        if (!localStorage.getItem('userCountry')) {
          setUserCountry(supportedCountries.AO);
          setDetectedLanguage('pt');
          applyLanguage('pt');
        }
      }
    } catch (err) {
      console.error('Erro ao detectar país por IP:', err);
      // Em caso de erro, manter país atual (do cache ou Angola)
      if (!localStorage.getItem('userCountry')) {
        setUserCountry(supportedCountries.AO);
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
          case 'MZN':
            return `${customPrice.toFixed(2)} MZN`;
          case 'KZ':
          default:
            return `${parseFloat(customPrice.toString()).toLocaleString('pt-BR')} KZ`;
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
      case 'MZN':
        return `${convertedPrice.toFixed(2)} MZN`;
      case 'KZ':
      default:
        return `${parseFloat(convertedPrice.toString()).toLocaleString('pt-BR')} KZ`;
    }
  };

  const changeCountry = (countryCode: string) => {
    const country = supportedCountries[countryCode];
    if (country) {
      setUserCountry(country);
      localStorage.setItem('userCountry', countryCode);
      
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
      
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const hasRecentData = lastUpdate && (now - parseInt(lastUpdate)) < oneHour;
      
      // Se já temos país guardado, apenas atualizar taxas em background
      if (storedCountry && SUPPORTED_COUNTRIES[storedCountry]) {
        // País já está definido pelo estado inicial, só marcar como pronto
        setIsReady(true);
        setLoading(false);
        
        const language = COUNTRY_LANGUAGES[storedCountry] || 'pt';
        setDetectedLanguage(language);
        applyLanguage(language);
        
        // Atualizar taxas em background sem bloquear
        if (!hasRecentData) {
          fetchExchangeRates();
        }
        
        // Re-detectar país em background (caso tenha mudado de localização)
        // mas só se os dados tiverem mais de 24 horas
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (!lastUpdate || (now - parseInt(lastUpdate)) > twentyFourHours) {
          detectCountryByIP();
        }
        
        return;
      }
      
      // Primeira visita - detectar país
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
