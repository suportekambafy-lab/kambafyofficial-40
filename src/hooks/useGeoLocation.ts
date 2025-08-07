
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

// Margem de segurança para preservar valor (5% a mais)
const SAFETY_MARGIN = 1.05;

export const useGeoLocation = () => {
  const [userCountry, setUserCountry] = useState<CountryInfo>(SUPPORTED_COUNTRIES.AO);
  const [supportedCountries, setSupportedCountries] = useState(SUPPORTED_COUNTRIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      console.log('IP Location data:', data);
      
      const countryCode = data.country_code;
      const detectedCountry = supportedCountries[countryCode];
      
      if (detectedCountry) {
        console.log(`Detected country: ${detectedCountry.name} (${countryCode})`);
        setUserCountry(detectedCountry);
      } else {
        console.log(`Country ${countryCode} not supported, defaulting to Angola`);
        setUserCountry(supportedCountries.AO);
      }
    } catch (err) {
      console.error('Error detecting country:', err);
      setError('Erro ao detectar localização');
      setUserCountry(supportedCountries.AO);
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
    }
  };

  useEffect(() => {
    const initializeGeoLocation = async () => {
      console.log('🌍 Initializing geolocation...');
      // First fetch exchange rates
      await fetchExchangeRates();
      // Always detect country by IP first (ignore localStorage for fresh detection)
      await detectCountryByIP();
    };
    
    initializeGeoLocation();
    
    // Update exchange rates every 30 minutes
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
    fetchExchangeRates
  };
};
