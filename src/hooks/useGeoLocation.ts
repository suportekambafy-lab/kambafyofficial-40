
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
  'MZ': 'pt', // Moçambique - Português
  'BR': 'pt', // Brasil - Português
  'ES': 'es', // Espanha - Espanhol
  'US': 'en', // Estados Unidos - Inglês
  'GB': 'en', // Reino Unido - Inglês
  'FR': 'fr', // França - Francês
  'DE': 'de', // Alemanha - Alemão
  'IT': 'it', // Itália - Italiano
  'CV': 'pt', // Cabo Verde - Português
  'ST': 'pt'  // São Tomé e Príncipe - Português
};

// Margem de segurança para preservar valor (5% a mais)
const SAFETY_MARGIN = 1.05;

export const useGeoLocation = () => {
  const [userCountry, setUserCountry] = useState<CountryInfo>(SUPPORTED_COUNTRIES.AO);
  const [supportedCountries, setSupportedCountries] = useState(SUPPORTED_COUNTRIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('pt');

  const fetchExchangeRates = async () => {
    try {
      console.log('Fetching real-time exchange rates...');
      
      // Using a free API that doesn't require authentication
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/AOA');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      console.log('Exchange rates data:', data);
      
      const updatedCountries = { ...SUPPORTED_COUNTRIES };
      
      // Update EUR rate with safety margin
      if (data.rates.EUR) {
        updatedCountries.PT.exchangeRate = data.rates.EUR * SAFETY_MARGIN;
        console.log(`Updated EUR rate with safety margin: 1 KZ = ${updatedCountries.PT.exchangeRate} EUR (original: ${data.rates.EUR})`);
      }
      
      // Update MZN rate with safety margin
      if (data.rates.MZN) {
        updatedCountries.MZ.exchangeRate = data.rates.MZN * SAFETY_MARGIN;
        console.log(`Updated MZN rate with safety margin: 1 KZ = ${updatedCountries.MZ.exchangeRate} MZN (original: ${data.rates.MZN})`);
      }
      
      setSupportedCountries(updatedCountries);
      
      // Update current country if it's not Angola
      if (userCountry.code !== 'AO') {
        setUserCountry(updatedCountries[userCountry.code]);
      }
      
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      // Keep fallback rates if API fails
      console.log('Using fallback exchange rates');
    }
  };

  const detectCountryByIP = async () => {
    try {
      console.log('🌍 Starting IP detection...');
      const response = await fetch('https://ipapi.co/json/');
      console.log('🌍 IP API response:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🌍 IP Location data:', data);
      
      const countryCode = data.country_code;
      console.log('🌍 Detected country code:', countryCode);
      
      const detectedCountry = supportedCountries[countryCode];
      
      if (detectedCountry) {
        console.log(`🌍 Found supported country: ${detectedCountry.name} (${countryCode})`);
        setUserCountry(detectedCountry);
        
        // Detectar idioma automaticamente baseado no país
        const language = COUNTRY_LANGUAGES[countryCode] || 'pt';
        setDetectedLanguage(language);
        console.log(`🌍 Auto-detected language: ${language} for country ${countryCode}`);
        
        // Aplicar idioma automaticamente na aplicação
        applyLanguage(language);
      } else {
        console.log(`🌍 Country ${countryCode} not supported, defaulting to Angola`);
        setUserCountry(supportedCountries.AO);
        setDetectedLanguage('pt');
        applyLanguage('pt');
      }
    } catch (err) {
      console.error('🌍 Error detecting country:', err);
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

  const convertPrice = (priceInKZ: number, targetCountry?: CountryInfo): number => {
    const country = targetCountry || userCountry;
    return Math.round(priceInKZ * country.exchangeRate * 100) / 100;
  };

  const formatPrice = (priceInKZ: number, targetCountry?: CountryInfo): string => {
    const country = targetCountry || userCountry;
    const convertedPrice = convertPrice(priceInKZ, country);
    
    switch (country.currency) {
      case 'EUR':
        return `€${convertedPrice.toFixed(2)}`;
      case 'MZN':
        return `${convertedPrice.toFixed(2)} MZN`;
      case 'KZ':
      default:
        return `${priceInKZ.toLocaleString()} KZ`;
    }
  };

  const changeCountry = (countryCode: string) => {
    const country = supportedCountries[countryCode];
    if (country) {
      setUserCountry(country);
      localStorage.setItem('userCountry', countryCode);
      console.log(`Manually changed to: ${country.name}`);
      
      // Atualizar idioma quando país é alterado manualmente
      const language = COUNTRY_LANGUAGES[countryCode] || 'pt';
      setDetectedLanguage(language);
      applyLanguage(language);
    }
  };

  // Função para aplicar idioma na aplicação
  const applyLanguage = (language: string) => {
    try {
      // Definir atributo lang no HTML
      document.documentElement.lang = language;
      
      // Salvar no localStorage para persistência
      localStorage.setItem('detectedLanguage', language);
      
      console.log(`Language applied: ${language}`);
    } catch (error) {
      console.error('Error applying language:', error);
    }
  };

  useEffect(() => {
    const initializeGeoLocation = async () => {
      console.log('🌍 Initializing geolocation hook...');
      
      // Limpar localStorage para forçar detecção por IP
      localStorage.removeItem('userCountry');
      console.log('🌍 Cleared localStorage userCountry');
      
      // Detect country by IP first (before fetching exchange rates for faster response)
      await detectCountryByIP();
      // Then fetch exchange rates in background
      await fetchExchangeRates();
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
    detectedLanguage
  };
};
