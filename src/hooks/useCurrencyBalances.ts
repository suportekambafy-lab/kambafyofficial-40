import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatWithMaxTwoDecimals } from '@/utils/priceFormatting';
export interface CurrencyBalance {
  id: string;
  currency: string;
  balance: number;
  retained_balance: number;
  updated_at: string;
}

export interface CurrencyTransaction {
  id: string;
  amount: number;
  currency: string;
  type: string;
  description: string;
  created_at: string;
  order_id?: string;
}

// Currency configuration with flags and formatting
export const CURRENCY_CONFIG: Record<string, {
  flag: string;
  symbol: string;
  name: string;
  locale: string;
  minimumWithdrawal: number;
}> = {
  'KZ': { flag: '🇦🇴', symbol: 'KZ', name: 'Kwanza', locale: 'pt-AO', minimumWithdrawal: 20000 },
  'EUR': { flag: '🇪🇺', symbol: '€', name: 'Euro', locale: 'pt-PT', minimumWithdrawal: 20 },
  'MZN': { flag: '🇲🇿', symbol: 'MT', name: 'Metical', locale: 'pt-MZ', minimumWithdrawal: 1500 },
  'USD': { flag: '🇺🇸', symbol: '$', name: 'Dollar', locale: 'en-US', minimumWithdrawal: 25 },
  'GBP': { flag: '🇬🇧', symbol: '£', name: 'Libra', locale: 'en-GB', minimumWithdrawal: 20 },
  'BRL': { flag: '🇧🇷', symbol: 'R$', name: 'Real', locale: 'pt-BR', minimumWithdrawal: 100 },
};

export function useCurrencyBalances() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [transactions, setTransactions] = useState<CurrencyTransaction[]>([]);
  const [totalWithdrawn, setTotalWithdrawn] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KZ');

  const loadBalances = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all currency balances for the user
      const { data: balanceData, error: balanceError } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('user_id', user.id)
        .order('balance', { ascending: false });

      if (balanceError) {
        console.error('Error fetching currency balances:', balanceError);
        return;
      }

      // Fetch total withdrawn per currency (status = 'aprovado')
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('amount, currency')
        .eq('user_id', user.id)
        .eq('status', 'aprovado');

      if (withdrawals) {
        const withdrawnByCurrency: Record<string, number> = {};
        withdrawals.forEach(w => {
          const currency = w.currency || 'KZ';
          withdrawnByCurrency[currency] = (withdrawnByCurrency[currency] || 0) + Number(w.amount);
        });
        setTotalWithdrawn(withdrawnByCurrency);
      }

      // If no multi-currency balances, try to get legacy balance
      if (!balanceData || balanceData.length === 0) {
        const { data: legacyBalance } = await supabase
          .from('customer_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (legacyBalance && legacyBalance.balance > 0) {
          setBalances([{
            id: 'legacy-kz',
            currency: 'KZ',
            balance: legacyBalance.balance,
            retained_balance: 0,
            updated_at: new Date().toISOString()
          }]);
        } else {
          setBalances([]);
        }
      } else {
        setBalances(balanceData);
      }
    } catch (error) {
      console.error('Error loading currency balances:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadTransactions = useCallback(async (currency: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('currency', currency)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadBalances();
    }
  }, [user, loadBalances]);

  useEffect(() => {
    if (user && selectedCurrency) {
      loadTransactions(selectedCurrency);
    }
  }, [user, selectedCurrency, loadTransactions]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`currency_balances_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'currency_balances',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadBalances();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'balance_transactions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadBalances();
        loadTransactions(selectedCurrency);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedCurrency, loadBalances, loadTransactions]);

  const formatCurrency = (amount: number, currency: string): string => {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['KZ'];
    const formatted = formatWithMaxTwoDecimals(amount);
    
    if (currency === 'EUR') return `€${formatted}`;
    if (currency === 'USD') return `$${formatted}`;
    if (currency === 'GBP') return `£${formatted}`;
    if (currency === 'BRL') return `R$${formatted}`;
    if (currency === 'MZN') return `${formatted} MT`;
    return `${formatted} ${config.symbol}`;
  };

  const getAvailableCurrencies = (): string[] => {
    // Return currencies that have a balance > 0
    return balances
      .filter(b => b.balance > 0)
      .map(b => b.currency);
  };

  const getTotalBalanceInKZ = (): number => {
    // Conversion rates to KZ for display purposes
    const toKZ: Record<string, number> = {
      'KZ': 1,
      'EUR': 1100,
      'USD': 825,
      'GBP': 1050,
      'MZN': 14.3,
      'BRL': 165
    };

    return balances.reduce((total, b) => {
      const rate = toKZ[b.currency] || 1;
      return total + (b.balance * rate);
    }, 0);
  };

  const getTotalWithdrawn = (currency: string): number => {
    return totalWithdrawn[currency] || 0;
  };

  return {
    balances,
    transactions,
    totalWithdrawn,
    loading,
    selectedCurrency,
    setSelectedCurrency,
    loadBalances,
    loadTransactions,
    formatCurrency,
    getAvailableCurrencies,
    getTotalBalanceInKZ,
    getTotalWithdrawn,
    CURRENCY_CONFIG
  };
}
