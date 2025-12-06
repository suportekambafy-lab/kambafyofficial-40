import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useCustomToast';

export interface RefundRequest {
  id: string;
  order_id: string;
  buyer_email: string;
  seller_user_id: string;
  product_id: string;
  amount: number;
  currency: string;
  reason: string;
  seller_comment?: string;
  admin_comment?: string;
  status: string;
  refund_deadline: string;
  created_at: string;
  updated_at: string;
  products?: { name: string };
}

export function useRefunds(userType: 'buyer' | 'seller' | 'admin') {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRefunds = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('refund_requests')
        .select(`
          *,
          products(name)
        `)
        .order('created_at', { ascending: false });

      if (userType === 'buyer') {
        query = query.or(`buyer_user_id.eq.${user.id},buyer_email.eq.${user.email}`);
      } else if (userType === 'seller') {
        query = query.eq('seller_user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRefunds(data as any || []);
    } catch (error) {
      console.error('Error loading refunds:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os reembolsos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createRefund = async (orderId: string, reason: string) => {
    try {
      const { data, error } = await supabase.rpc('create_refund_request', {
        p_order_id: orderId,
        p_reason: reason,
        p_buyer_email: user?.email
      });

      if (error) throw error;

      toast({
        title: "Solicitação Enviada",
        description: "Sua solicitação de reembolso foi enviada ao vendedor",
      });

      await loadRefunds();
      return { success: true, refundId: data };
    } catch (error: any) {
      console.error('Error creating refund:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível solicitar o reembolso",
        variant: "destructive"
      });
      return { success: false };
    }
  };

  const sellerProcessRefund = async (refundId: string, action: 'approve' | 'reject', comment?: string) => {
    try {
      const { data, error } = await supabase.rpc('seller_process_refund', {
        p_refund_id: refundId,
        p_action: action,
        p_comment: comment
      });

      if (error) throw error;

      toast({
        title: action === 'approve' ? "Reembolso Aprovado" : "Reembolso Rejeitado",
        description: action === 'approve' 
          ? "O reembolso foi processado e o valor foi descontado do seu saldo"
          : "O reembolso foi rejeitado",
      });

      await loadRefunds();
      return { success: true };
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o reembolso",
        variant: "destructive"
      });
      return { success: false };
    }
  };

  const adminProcessRefund = async (refundId: string, action: 'approve' | 'reject', comment?: string, adminEmail?: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_process_refund', {
        p_refund_id: refundId,
        p_action: action,
        p_admin_email: adminEmail,
        p_comment: comment
      });

      if (error) throw error;

      toast({
        title: action === 'approve' ? "Reembolso Aprovado pelo Admin" : "Reembolso Rejeitado pelo Admin",
        description: "A decisão administrativa foi aplicada",
      });

      await loadRefunds();
      return { success: true };
    } catch (error: any) {
      console.error('Error admin processing refund:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o reembolso",
        variant: "destructive"
      });
      return { success: false };
    }
  };

  useEffect(() => {
    if (user) {
      loadRefunds();

      const channel = supabase
        .channel(`refunds_${userType}_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'refund_requests'
          },
          () => {
            loadRefunds();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userType]);

  return {
    refunds,
    loading,
    createRefund,
    sellerProcessRefund,
    adminProcessRefund,
    loadRefunds
  };
}
