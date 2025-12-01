
import { useState, useEffect } from 'react';

interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  flag: string;
  exchangeRate: number; // Taxa de conversão de KZ para moeda local
}

const SUPPORTED_COUNTRIES: Record<string, CountryInfo> = {
  AO: {
    code: 'AO',
    name: 'Angola',
    currency: 'KZ',
    flag: '🇦🇴',
    exchangeRate: 1 // Base currency
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    currency: 'EUR',
    flag: '🇵🇹',
    exchangeRate: 0.0012 // Fallback rate
  },
  MZ: {
    code: 'MZ',
    name: 'Moçambique',
    currency: 'MZN',
    flag: '🇲🇿',
    exchangeRate: 0.0697 // Fallback rate based on your example: 39000 KZ = 2720.22 MZN
  }
};

// Mapeamento de países para idiomas
const COUNTRY_LANGUAGES: Record<string, string> = {
  'AO': 'pt', // Angola - Português
  'PT': 'pt', // Portugal - Português
  'MZ': 'pt'  // Moçambique - Português
};

// Margem de segurança para preservar valor (5% a mais)
const SAFETY_MARGIN = 1.05;

export const useGeoLocation = () => {
  const [userCountry, setUserCountry] = useState<CountryInfo>(SUPPORTED_COUNTRIES.AO);
  const [supportedCountries, setSupportedCountries] = useState(SUPPORTED_COUNTRIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('pt');
  const [isReady, setIsReady] = useState(false); // Novo estado para indicar quando está pronto

  const fetchExchangeRates = async () => {
    try {
      // Using a free API that doesn't require authentication
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/AOA');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      
      const updatedCountries = { ...SUPPORTED_COUNTRIES };
      
      // Update EUR rate with safety margin
      if (data.rates.EUR) {
        updatedCountries.PT.exchangeRate = data.rates.EUR * SAFETY_MARGIN;
      }
      
      // Update MZN rate with safety margin
      if (data.rates.MZN) {
        updatedCountries.MZ.exchangeRate = data.rates.MZN * SAFETY_MARGIN;
      }

      
      setSupportedCountries(updatedCountries);
      
      // Salvar taxas para evitar flash na próxima visita
      localStorage.setItem('exchangeRates', JSON.stringify({
        EUR: updatedCountries.PT.exchangeRate,
        MZN: updatedCountries.MZ.exchangeRate
      }));
      localStorage.setItem('ratesLastUpdate', Date.now().toString());
      
      // Update current country if it's not Angola
      if (userCountry.code !== 'AO') {
        setUserCountry({...userCountry, exchangeRate: updatedCountries[userCountry.code as keyof typeof updatedCountries]?.exchangeRate || userCountry.exchangeRate});
      }
      if (userCountry.code !== 'AO') {
        setUserCountry(updatedCountries[userCountry.code]);
      }
      
    } catch (err) {
      // Keep fallback rates if API fails - silent fail
    }
  };

  const detectCountryByIP = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const countryCode = data.country_code;
      const detectedCountry = supportedCountries[countryCode];
      
      if (detectedCountry) {
        setUserCountry(detectedCountry);
        const language = COUNTRY_LANGUAGES[countryCode] || 'pt';
        setDetectedLanguage(language);
        applyLanguage(language);
      } else {
        setUserCountry(supportedCountries.AO);
        setDetectedLanguage('pt');
        applyLanguage('pt');
      }
    } catch (err) {
      setError('Erro ao detectar localização');
      setUserCountry(supportedCountries.AO);
      setDetectedLanguage('pt');
      applyLanguage('pt');
    } finally {
      setLoading(false);
    }
  };

  // Função para obter país baseado no perfil do usuário
  const getUserCountryFromProfile = async () => {
    try {
      const storedCountry = localStorage.getItem('userCountry');
      if (storedCountry && supportedCountries[storedCountry]) {
        setUserCountry(supportedCountries[storedCountry]);
        console.log(`Loaded country from profile: ${supportedCountries[storedCountry].name}`);
      } else {
        await detectCountryByIP();
      }
    } catch (err) {
      console.error('Error loading user country from profile:', err);
      await detectCountryByIP();
    }
  };

  const convertPrice = (priceInKZ: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>): number => {
    const country = targetCountry || userCountry;
    
    // Verificar se há preço customizado para o país
    if (customPrices && customPrices[country.code]) {
      const customPrice = parseFloat(customPrices[country.code]);
      if (!isNaN(customPrice)) {
        return customPrice;
      }
    }
    
    // API retorna taxa: 1 KZ = X EUR, então multiplicamos para converter
    const convertedValue = priceInKZ * country.exchangeRate;
    return Math.round(convertedValue * 100) / 100;
  };

  const formatPrice = (priceInKZ: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>): string => {
    const country = targetCountry || userCountry;
    
    // Verificar se há preço customizado para o país
    if (customPrices && customPrices[country.code]) {
      const customPrice = parseFloat(customPrices[country.code]);
      
      if (!isNaN(customPrice)) {
        switch (country.currency) {
          case 'EUR':
            return `€${customPrice.toFixed(2)}`;
          case 'MZN':
            return `${customPrice.toFixed(2)} MZN`;
          case 'KZ':
          default:
            return `${parseFloat(customPrice.toString()).toLocaleString('pt-BR')} KZ`;
        }
      }
    }
    
    // If no custom price, use automatic conversion
    const convertedPrice = convertPrice(priceInKZ, country);
    
    switch (country?.currency) {
      case 'EUR':
        return `€${convertedPrice.toFixed(2)}`;
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
      
      // Atualizar idioma quando país é alterado manualmente
      const language = COUNTRY_LANGUAGES[countryCode] || 'pt';
      setDetectedLanguage(language);
      applyLanguage(language);
    }
  };

  // Função para aplicar idioma na aplicação
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
      // Verificar se já temos dados salvos para evitar flash de loading
      const storedCountry = localStorage.getItem('userCountry');
      const storedRates = localStorage.getItem('exchangeRates');
      const lastUpdate = localStorage.getItem('ratesLastUpdate');
      
      // Se temos dados recentes (menos de 1 hora), usar imediatamente
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const hasRecentData = lastUpdate && (now - parseInt(lastUpdate)) < oneHour;
      
      if (storedCountry && storedRates && hasRecentData) {
        try {
          const countryData = supportedCountries[storedCountry];
          const rates = JSON.parse(storedRates);
          
          if (countryData && rates) {
            setUserCountry(countryData);
            
            // Aplicar taxas salvas
            const updatedCountries = { ...SUPPORTED_COUNTRIES };
            if (rates.EUR) updatedCountries.PT.exchangeRate = rates.EUR;
            if (rates.MZN) updatedCountries.MZ.exchangeRate = rates.MZN;
            setSupportedCountries(updatedCountries);
            
            setIsReady(true);
            setLoading(false);
            
            // Detectar idioma e aplicar
            const language = COUNTRY_LANGUAGES[storedCountry] || 'pt';
            setDetectedLanguage(language);
            applyLanguage(language);
            
            // Atualizar taxas em background
            fetchExchangeRates();
            return;
          }
        } catch (error) {
          // Silent fail, proceed to fresh detection
        }
      }
      
      // Se não temos dados em cache, fazer detecção normal
      await detectCountryByIP();
      await fetchExchangeRates();
      setIsReady(true);
    };
    
    initializeGeoLocation();
    
    // Update exchange rates every 30 minutes
    const interval = setInterval(fetchExchangeRates, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []); // Remove dependency to avoid loops

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
