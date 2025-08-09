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

      setBalance(data);
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
      setLoading(true);
      setError(null);

      // Primeiro registra o email na tabela kambapay_registrations
      const { error: registrationError } = await supabase
        .from('kambapay_registrations')
        .insert([{ email: userEmail }]);

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
      setError('Erro ao registrar email');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addBalanceByEmail = async (userEmail: string, amount: number, description: string, paymentMethod: string) => {
    try {
      setLoading(true);
      setError(null);

      // Busca o saldo atual
      const currentBalance = await fetchBalanceByEmail(userEmail);
      
      if (!currentBalance) {
        setError('Conta não encontrada');
        return false;
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
        setError('Erro ao registrar transação');
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
        setError('Erro ao atualizar saldo');
        return false;
      }

      // Atualiza o estado local
      await fetchBalanceByEmail(userEmail);
      return true;
    } catch (error) {
      console.error('Error in addBalanceByEmail:', error);
      setError('Erro inesperado ao adicionar saldo');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const useBalanceByEmail = async (userEmail: string, amount: number, description: string, orderId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Busca o saldo atual
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
          currency: 'KZ',
          order_id: orderId
        }]);

      if (transactionError) {
        console.error('Error adding debit transaction:', transactionError);
        setError('Erro ao registrar transação');
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
        setError('Erro ao atualizar saldo');
        return false;
      }

      // Atualiza o estado local
      await fetchBalanceByEmail(userEmail);
      return true;
    } catch (error) {
      console.error('Error in useBalanceByEmail:', error);
      setError('Erro inesperado ao usar saldo');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionsByEmail = async (userEmail: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('email', userEmail)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching transactions:', error);
        setError('Erro ao buscar transações');
        return;
      }

      setTransactions((data || []).map(item => ({
        ...item,
        type: item.type as 'credit' | 'debit'
      })));
    } catch (error) {
      console.error('Error in fetchTransactionsByEmail:', error);
      setError('Erro inesperado ao buscar transações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email) {
      fetchBalanceByEmail(email);
      fetchTransactionsByEmail(email);
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