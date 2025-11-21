
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

  const convertPrice = (priceInKZ: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>): number => {
    const country = targetCountry || userCountry;
    
    console.log('💰 CONVERT PRICE DEBUG:', {
      priceInKZ,
      country: country?.code,
      currency: country?.currency,
      exchangeRate: country?.exchangeRate,
      customPrices,
      hasCustomPrice: !!(customPrices && customPrices[country?.code])
    });
    
    // Verificar se há preço customizado para o país
    if (customPrices && customPrices[country.code]) {
      const customPrice = parseFloat(customPrices[country.code]);
      console.log('💰 USING CUSTOM PRICE:', customPrice, 'for', country.code);
      if (!isNaN(customPrice)) {
        return customPrice;
      }
    }
    
    // API retorna taxa: 1 KZ = X EUR, então multiplicamos para converter
    const convertedValue = priceInKZ * country.exchangeRate;
    console.log('💰 CONVERSION CALCULATION:', {
      priceInKZ,
      exchangeRate: country?.exchangeRate,
      convertedValue,
      rounded: Math.round(convertedValue * 100) / 100
    });
    return Math.round(convertedValue * 100) / 100;
  };

  const formatPrice = (priceInKZ: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>): string => {
    const country = targetCountry || userCountry;
    
    console.log('🏷️ FORMAT PRICE DEBUG - DETAILED:', {
      priceInKZ,
      countryCode: country?.code,
      countryName: country?.name,
      countryCurrency: country?.currency,
      exchangeRate: country?.exchangeRate,
      customPrices,
      hasCustomPriceForCountry: !!(customPrices && customPrices[country?.code]),
      actualCustomPrice: customPrices?.[country?.code]
    });
    
    // Verificar se há preço customizado para o país
    if (customPrices && customPrices[country.code]) {
      const customPrice = parseFloat(customPrices[country.code]);
      console.log('✅ USANDO PREÇO CUSTOMIZADO:', {
        originalPrice: priceInKZ,
        customPrice,
        country: country.code,
        currency: country.currency,
        rawCustomValue: customPrices[country.code]
      });
      
      if (!isNaN(customPrice)) {
        const formattedPrice = customPrice.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        switch (country.currency) {
          case 'EUR':
            console.log(`🚨 FORMATANDO PREÇO CUSTOMIZADO FINAL: €${formattedPrice}`);
            return `€${formattedPrice}`;
          case 'MZN':
            console.log(`🚨 FORMATANDO PREÇO CUSTOMIZADO FINAL: ${formattedPrice} MZN`);
            return `${formattedPrice} MZN`;
          case 'KZ':
          default:
            console.log(`🚨 FORMATANDO PREÇO CUSTOMIZADO FINAL: ${formattedPrice} KZ`);
            return `${formattedPrice} KZ`;
        }
      }
    }
    
    console.log('⚠️ USANDO PREÇO CONVERTIDO AUTOMATICAMENTE (não tem customizado)');

    // If no custom price, use automatic conversion
    const convertedPrice = convertPrice(priceInKZ, country);
    
    console.log('🔢 CONVERSION RESULT:', {
      originalPriceKZ: priceInKZ,
      convertedPrice,
      exchangeRate: country?.exchangeRate,
      finalCurrency: country?.currency
    });
    
    const formattedPrice = convertedPrice.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    switch (country?.currency) {
      case 'EUR':
        console.log(`🚨 getDisplayPrice - FORMATANDO CONVERSÃO FINAL: €${formattedPrice}`);
        return `€${formattedPrice}`;
      case 'MZN':
        console.log(`🚨 getDisplayPrice - FORMATANDO CONVERSÃO FINAL: ${formattedPrice} MZN`);
        return `${formattedPrice} MZN`;
      case 'KZ':
      default:
        console.log(`🚨 getDisplayPrice - FORMATANDO KZ FINAL: ${formattedPrice} KZ`);
        return `${formattedPrice} KZ`;
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
      console.log('🌍 SUPPORTED COUNTRIES:', SUPPORTED_COUNTRIES);
      
      // Verificar se já temos dados salvos para evitar flash de loading
      const storedCountry = localStorage.getItem('userCountry');
      const storedRates = localStorage.getItem('exchangeRates');
      const lastUpdate = localStorage.getItem('ratesLastUpdate');
      
      console.log('💾 CACHED DATA:', { storedCountry, storedRates, lastUpdate });
      
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
            console.log('🌍 CACHED COUNTRY DATA:', countryData);
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
      console.log('🌍 NO CACHED DATA - Starting fresh detection');
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
