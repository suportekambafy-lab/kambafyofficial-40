import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatWithMaxTwoDecimals } from '@/utils/priceFormatting';
import {
  getCachedPreferredCurrency,
  setCachedPreferredCurrency,
  resolvePreferredCurrency,
  SUPPORTED_CURRENCIES,
} from '@/utils/accountCurrency';

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
  'MZN': { code: 'MZN', symbol: 'MT', name: 'Metical', flag: '🇲🇿', fromKZRate: 1 / 14.3 },
  'GBP': { code: 'GBP', symbol: '£', name: 'Libra', flag: '🇬🇧', fromKZRate: 1 / 1250 },
  'BRL': { code: 'BRL', symbol: 'R$', name: 'Real', flag: '🇧🇷', fromKZRate: 1 / 180 },
  'USD': { code: 'USD', symbol: '$', name: 'Dólar', flag: '🇺🇸', fromKZRate: 1 / 950 },
};

export const usePreferredCurrency = () => {
  const { user } = useAuth();
  
  // Iniciar com valor do cache (se existir) para evitar "flash"
  const [preferredCurrency, setPreferredCurrency] = useState<string>(() => {
    if (user?.id) {
      return getCachedPreferredCurrency(user.id) || '';
    }
    return '';
  });
  const [loading, setLoading] = useState(true);

  const loadPreferredCurrency = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Primeiro, tentar resolver do cache imediatamente
      const cached = getCachedPreferredCurrency(user.id);
      if (cached) {
        setPreferredCurrency(cached);
      }

      // Buscar do Supabase para garantir sincronização
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_currency, country')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        const resolved = resolvePreferredCurrency({
          userId: user.id,
          supabaseCurrency: (data as any).preferred_currency,
          supabaseCountry: (data as any).country,
        });

        if (resolved) {
          setPreferredCurrency(resolved);
          setCachedPreferredCurrency(user.id, resolved);
        }
      }
    } catch (error) {
      console.error('Error loading preferred currency:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
            const newCurrency = payload.new?.preferred_currency;
            if (newCurrency && SUPPORTED_CURRENCIES.includes(newCurrency)) {
              setPreferredCurrency(newCurrency);
              setCachedPreferredCurrency(user.id, newCurrency);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Sem usuário, limpar estado
      setPreferredCurrency('');
      setLoading(false);
    }
  }, [user, loadPreferredCurrency]);

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
    
    // Formato internacional para EUR, GBP, USD
    const formatIntl = (val: number): string => {
      const rounded = Math.round(val * 100) / 100;
      const hasDecimals = rounded % 1 !== 0;
      if (hasDecimals) {
        const [intPart, decPart] = rounded.toFixed(2).split('.');
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return `${formattedInt}.${decPart}`;
      } else {
        return Math.round(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
    };
    
    // Formatação com ponto nos milhares (formato PT)
    const formatted = formatWithMaxTwoDecimals(converted);

    switch (config.code) {
      case 'EUR':
        return `€${formatIntl(converted)}`;
      case 'GBP':
        return `£${formatIntl(converted)}`;
      case 'USD':
        return `$${formatIntl(converted)}`;
      case 'BRL':
        return `R$${formatted}`;
      case 'MZN':
        return `${formatted} MT`;
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
