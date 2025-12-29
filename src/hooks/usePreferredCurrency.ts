import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  // Taxa de conversão DE KZ para esta moeda (1 KZ = X desta moeda)
  fromKZRate: number;
}

const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  'KZ': { code: 'KZ', symbol: 'KZ', name: 'Kwanza', flag: '🇦🇴', fromKZRate: 1 },
  'EUR': { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', fromKZRate: 1 / 1053 },
  'MZN': { code: 'MZN', symbol: 'MZN', name: 'Metical', flag: '🇲🇿', fromKZRate: 1 / 14.3 },
  'GBP': { code: 'GBP', symbol: '£', name: 'Libra', flag: '🇬🇧', fromKZRate: 1 / 1250 },
  'BRL': { code: 'BRL', symbol: 'R$', name: 'Real', flag: '🇧🇷', fromKZRate: 1 / 180 },
  'USD': { code: 'USD', symbol: '$', name: 'Dólar', flag: '🇺🇸', fromKZRate: 1 / 950 },
};

export const usePreferredCurrency = () => {
  const { user } = useAuth();
  const [preferredCurrency, setPreferredCurrency] = useState<string>('KZ');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferredCurrency();
      
      // Subscribe to profile changes
      const channel = supabase
        .channel('preferred-currency-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            if (payload.new?.preferred_currency) {
              setPreferredCurrency(payload.new.preferred_currency);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadPreferredCurrency = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setPreferredCurrency((data as any).preferred_currency || 'KZ');
      }
    } catch (error) {
      console.error('Error loading preferred currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyConfig = (code?: string): CurrencyConfig => {
    const currencyCode = code || preferredCurrency;
    return CURRENCY_CONFIGS[currencyCode.toUpperCase()] || CURRENCY_CONFIGS['KZ'];
  };

  // Converter de KZ para a moeda preferida
  const convertFromKZ = (amountInKZ: number, targetCurrency?: string): number => {
    const config = getCurrencyConfig(targetCurrency);
    return amountInKZ * config.fromKZRate;
  };

  // Formatar valor na moeda preferida
  const formatInPreferredCurrency = (amountInKZ: number, targetCurrency?: string): string => {
    const config = getCurrencyConfig(targetCurrency);
    const converted = convertFromKZ(amountInKZ, targetCurrency);
    
    // Formatação específica por moeda
    const formatted = converted.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    switch (config.code) {
      case 'EUR':
        return `€${formatted}`;
      case 'GBP':
        return `£${formatted}`;
      case 'USD':
        return `$${formatted}`;
      case 'BRL':
        return `R$${formatted}`;
      case 'MZN':
        return `${formatted} MZN`;
      case 'KZ':
      default:
        return `${formatted} KZ`;
    }
  };

  return {
    preferredCurrency,
    loading,
    getCurrencyConfig,
    convertFromKZ,
    formatInPreferredCurrency,
    currencyConfig: getCurrencyConfig()
  };
};
