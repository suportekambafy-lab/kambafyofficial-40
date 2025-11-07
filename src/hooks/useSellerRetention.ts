import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RetentionHistory {
  id: string;
  user_id: string;
  admin_email: string;
  old_percentage: number;
  new_percentage: number;
  reason: string;
  created_at: string;
}

export const useSellerRetention = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const setRetention = async (
    userId: string,
    percentage: number,
    reason: string,
    adminEmail: string
  ) => {
    console.log('🔄 [SET-RETENTION] Iniciando...', { userId, percentage, reason, adminEmail });
    setLoading(true);
    try {
      console.log('📡 [SET-RETENTION] Chamando RPC admin_set_seller_retention...');
      const { data, error } = await supabase.rpc('admin_set_seller_retention', {
        p_user_id: userId,
        p_retention_percentage: percentage,
        p_reason: reason,
        p_admin_email: adminEmail,
      });

      console.log('📥 [SET-RETENTION] Resposta do RPC:', { data, error });

      if (error) {
        console.error('❌ [SET-RETENTION] Erro do RPC:', error);
        throw error;
      }

      const result = data as { success: boolean; error?: string; old_percentage?: number; new_percentage?: number };

      if (!result.success) {
        console.error('❌ [SET-RETENTION] RPC retornou success=false:', result);
        throw new Error(result.error || 'Failed to set retention');
      }

      console.log('✅ [SET-RETENTION] Sucesso!', result);
      toast({
        title: 'Retenção Atualizada',
        description: `Retenção alterada de ${result.old_percentage}% para ${result.new_percentage}%`,
      });

      return true;
    } catch (error: any) {
      console.error('❌ [SET-RETENTION] Erro capturado:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getRetentionHistory = async (userId: string): Promise<RetentionHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('seller_retention_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const getAvailableBalance = async (userId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_available_balance_with_retention', {
        p_user_id: userId,
      });

      if (error) throw error;

      return data || 0;
    } catch (error: any) {
      console.error('Error getting available balance:', error);
      return 0;
    }
  };

  return {
    setRetention,
    getRetentionHistory,
    getAvailableBalance,
    loading,
  };
};
