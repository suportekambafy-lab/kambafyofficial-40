import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KambaPayBalance {
  id: string;
  balance: number;
  currency: string;
  email: string;
}

export interface KambaPayTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
  currency: string;
}

export function useKambaPayBalance(email?: string) {
  const [balance, setBalance] = useState<KambaPayBalance | null>(null);
  const [transactions, setTransactions] = useState<KambaPayTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalanceByEmail = async (userEmail: string) => {
    if (!userEmail) return null;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('customer_balances')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (error) {
        console.error('Error fetching balance by email:', error);
        setError('Erro ao buscar saldo');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchBalanceByEmail:', error);
      setError('Erro inesperado');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const registerKambaPayEmail = async (userEmail: string) => {
    try {
      // Primeiro registra o email na tabela de registros
      const { error: registrationError } = await supabase
        .from('kambapay_registrations')
        .insert([{ email: userEmail }])
        .select()
        .single();

      if (registrationError && registrationError.code !== '23505') { // 23505 é duplicate key
        console.error('Error registering email:', registrationError);
        return false;
      }

      // Depois cria o saldo inicial
      const { error: balanceError } = await supabase
        .from('customer_balances')
        .insert([{ 
          email: userEmail, 
          balance: 0, 
          currency: 'KZ',
          user_id: null 
        }]);

      if (balanceError && balanceError.code !== '23505') {
        console.error('Error creating balance:', balanceError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in registerKambaPayEmail:', error);
      return false;
    }
  };

  const addBalanceByEmail = async (userEmail: string, amount: number, description: string, paymentMethod: string) => {
    try {
      // Busca o saldo atual
      const currentBalance = await fetchBalanceByEmail(userEmail);
      
      if (!currentBalance) {
        // Se não existe, cria um novo registro
        await registerKambaPayEmail(userEmail);
      }

      // Adiciona a transação
      const { error: transactionError } = await supabase
        .from('balance_transactions')
        .insert([{
          user_id: null,
          email: userEmail,
          type: 'credit',
          amount,
          description: `${description} via ${paymentMethod}`,
          currency: 'KZ'
        }]);

      if (transactionError) {
        console.error('Error adding transaction:', transactionError);
        return false;
      }

      // Atualiza o saldo
      const newBalance = (currentBalance?.balance || 0) + amount;
      const { error: balanceError } = await supabase
        .from('customer_balances')
        .update({ balance: newBalance })
        .eq('email', userEmail);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addBalanceByEmail:', error);
      return false;
    }
  };

  const useBalanceByEmail = async (userEmail: string, amount: number, description: string, orderId?: string) => {
    try {
      const currentBalance = await fetchBalanceByEmail(userEmail);
      
      if (!currentBalance || currentBalance.balance < amount) {
        setError('Saldo insuficiente');
        return false;
      }

      // Adiciona a transação de débito
      const { error: transactionError } = await supabase
        .from('balance_transactions')
        .insert([{
          user_id: null,
          email: userEmail,
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

      // Atualiza o saldo
      const newBalance = currentBalance.balance - amount;
      const { error: balanceError } = await supabase
        .from('customer_balances')
        .update({ balance: newBalance })
        .eq('email', userEmail);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in useBalanceByEmail:', error);
      return false;
    }
  };

  const fetchTransactionsByEmail = async (userEmail: string) => {
    if (!userEmail) return;

    try {
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions((data || []) as KambaPayTransaction[]);
    } catch (error) {
      console.error('Error in fetchTransactionsByEmail:', error);
    }
  };

  useEffect(() => {
    if (email) {
      const loadData = async () => {
        setLoading(true);
        const balanceData = await fetchBalanceByEmail(email);
        setBalance(balanceData);
        await fetchTransactionsByEmail(email);
        setLoading(false);
      };
      loadData();
    } else {
      setBalance(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [email]);

  return {
    balance,
    transactions,
    loading,
    error,
    fetchBalanceByEmail,
    registerKambaPayEmail,
    addBalanceByEmail,
    useBalanceByEmail,
    fetchTransactionsByEmail
  };
}