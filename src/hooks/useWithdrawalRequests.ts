
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WithdrawalWithProfile {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
  admin_processed_by: string | null;
  profiles?: {
    full_name: string;
    email: string;
    iban?: string;
    account_holder?: string;
  } | null;
}

export function useWithdrawalRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<WithdrawalWithProfile[]>([]);
  const [rawRequests, setRawRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWithdrawalRequests = async () => {
    try {
      setLoading(true);
      console.log('🔍 Carregando solicitações de saque via RPC admin...');

      // Usar função RPC específica para admin que bypassa RLS
      const { data: withdrawals, error: withdrawalError } = await supabase
        .rpc('get_all_withdrawal_requests_for_admin');
      
      console.log('📋 RPC admin - Saques encontrados:', withdrawals?.length || 0);
      console.log('❌ RPC admin - Erro:', withdrawalError);

      if (withdrawalError) {
        console.error('💥 Erro ao carregar saques:', withdrawalError);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar solicitações de saque: ' + withdrawalError.message,
          variant: 'destructive'
        });
        return;
      }

      // Armazenar dados brutos para debug
      setRawRequests(withdrawals || []);

      if (withdrawals && withdrawals.length > 0) {
        // Buscar perfis dos usuários incluindo dados bancários
        const userIds = withdrawals.map(w => w.user_id);
        console.log('👥 IDs dos usuários:', userIds);

        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, iban, account_holder')
          .in('user_id', userIds);

        console.log('👤 Perfis encontrados:', profiles);
        console.log('❌ Erro nos perfis:', profileError);

        if (profileError) {
          console.warn('⚠️ Erro ao carregar perfis:', profileError);
        }

        // Combinar os dados
        const requestsWithProfiles = withdrawals.map(withdrawal => ({
          ...withdrawal,
          profiles: profiles?.find(p => p.user_id === withdrawal.user_id) || null
        }));

        console.log('🔗 Resultado final combinado:', requestsWithProfiles);
        setRequests(requestsWithProfiles);
      } else {
        console.log('📭 Nenhuma solicitação de saque encontrada');
        setRequests([]);
      }
    } catch (error) {
      console.error('💥 Erro inesperado ao carregar saques:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar saques',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawalRequests();
    
    // ✅ Configurar escuta em tempo real GLOBAL (para admin ver todos os saques)
    const channel = supabase
      .channel('withdrawal_requests_changes_global')
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'withdrawal_requests'
        },
        (payload) => {
          console.log('🔄 Mudança detectada em withdrawal_requests (global):', payload);
          // Recarregar dados imediatamente quando houver mudanças
          setTimeout(() => {
            loadWithdrawalRequests();
          }, 500); // Pequeno delay para garantir que a transação foi finalizada
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    requests,
    rawRequests,
    loading,
    loadWithdrawalRequests
  };
}
