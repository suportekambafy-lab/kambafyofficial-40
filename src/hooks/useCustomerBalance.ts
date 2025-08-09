import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CustomerBalance {
  id: string;
  balance: number;
  currency: string;
}

export interface BalanceTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
  currency: string;
}

export function useCustomerBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CustomerBalance | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_balances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching balance:', error);
        return;
      }

      if (!data) {
        // Create initial balance record
        const { data: newBalance, error: createError } = await supabase
          .from('customer_balances')
          .insert([{ user_id: user.id, balance: 0, currency: 'KZ' }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating balance:', createError);
          return;
        }

        setBalance(newBalance);
      } else {
        setBalance(data);
      }
    } catch (error) {
      console.error('Error in fetchBalance:', error);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions((data || []) as BalanceTransaction[]);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    }
  };

  const addBalance = async (amount: number, description: string) => {
    if (!user || !balance) return false;

    try {
      // Add transaction record
      const { error: transactionError } = await supabase
        .from('balance_transactions')
        .insert([{
          user_id: user.id,
          type: 'credit',
          amount,
          description,
          currency: 'KZ'
        }]);

      if (transactionError) {
        console.error('Error adding transaction:', transactionError);
        return false;
      }

      // Update balance
      const newBalance = balance.balance + amount;
      const { error: balanceError } = await supabase
        .from('customer_balances')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        return false;
      }

      // Refresh data
      await fetchBalance();
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error in addBalance:', error);
      return false;
    }
  };

  const useBalance = async (amount: number, description: string, orderId?: string) => {
    if (!user || !balance || balance.balance < amount) return false;

    try {
      // Add transaction record
      const { error: transactionError } = await supabase
        .from('balance_transactions')
        .insert([{
          user_id: user.id,
          type: 'debit',
          amount,
          description,
          order_id: orderId,
          currency: 'KZ'
        }]);

      if (transactionError) {
        console.error('Error adding transaction:', transactionError);
        return false;
      }

      // Update balance
      const newBalance = balance.balance - amount;
      const { error: balanceError } = await supabase
        .from('customer_balances')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        return false;
      }

      // Refresh data
      await fetchBalance();
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error in useBalance:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchBalance(), fetchTransactions()]);
        setLoading(false);
      };
      loadData();
    } else {
      setBalance(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [user]);

  return {
    balance,
    transactions,
    loading,
    addBalance,
    useBalance,
    fetchBalance,
    fetchTransactions
  };
}