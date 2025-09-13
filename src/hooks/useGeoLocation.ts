
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
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    currency: 'ARS',
    flag: '🇦🇷',
    exchangeRate: 0.85 // Fallback rate
  },
  ES: {
    code: 'ES',
    name: 'Espanha',
    currency: 'EUR',
    flag: '🇪🇸',
    exchangeRate: 0.0012 // Same as Portugal
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    currency: 'USD',
    flag: '🇺🇸',
    exchangeRate: 0.0011 // Fallback rate
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
  const [isReady, setIsReady] = useState(false); // Novo estado para indicar quando está pronto

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
        updatedCountries.ES.exchangeRate = data.rates.EUR * SAFETY_MARGIN;
        console.log(`Updated EUR rate with safety margin: 1 KZ = ${updatedCountries.PT.exchangeRate} EUR (original: ${data.rates.EUR})`);
      }
      
      // Update MZN rate with safety margin
      if (data.rates.MZN) {
        updatedCountries.MZ.exchangeRate = data.rates.MZN * SAFETY_MARGIN;
        console.log(`Updated MZN rate with safety margin: 1 KZ = ${updatedCountries.MZ.exchangeRate} MZN (original: ${data.rates.MZN})`);
      }

      // Update ARS rate with safety margin
      if (data.rates.ARS) {
        updatedCountries.AR.exchangeRate = data.rates.ARS * SAFETY_MARGIN;
        console.log(`Updated ARS rate with safety margin: 1 KZ = ${updatedCountries.AR.exchangeRate} ARS (original: ${data.rates.ARS})`);
      }

      // Update USD rate with safety margin
      if (data.rates.USD) {
        updatedCountries.US.exchangeRate = data.rates.USD * SAFETY_MARGIN;
        console.log(`Updated USD rate with safety margin: 1 KZ = ${updatedCountries.US.exchangeRate} USD (original: ${data.rates.USD})`);
      }
      
      setSupportedCountries(updatedCountries);
      
      // Salvar taxas para evitar flash na próxima visita
      localStorage.setItem('exchangeRates', JSON.stringify({
        EUR: updatedCountries.PT.exchangeRate,
        MZN: updatedCountries.MZ.exchangeRate,
        ARS: updatedCountries.AR.exchangeRate,
        USD: updatedCountries.US.exchangeRate
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
      case 'ARS':
        return `$${convertedPrice.toFixed(2)} ARS`;
      case 'USD':
        return `$${convertedPrice.toFixed(2)} USD`;
      case 'KZ':
      default:
        return `${parseFloat(priceInKZ.toString()).toLocaleString('pt-BR')} KZ`;
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
            console.log('🌍 Using cached data to prevent flash - checkout can now load immediately');
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
          console.error('Error loading cached data:', error);
        }
      }
      
      // Se não temos dados em cache, fazer detecção normal
      await detectCountryByIP();
      await fetchExchangeRates();
      setIsReady(true);
      console.log('🌍 Geolocation fully ready with real exchange rates - checkout can now load');
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
