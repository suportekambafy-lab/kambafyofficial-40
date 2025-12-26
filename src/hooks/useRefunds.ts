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

      // Buscar dados para enviar notificação ao vendedor
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            customer_email,
            amount,
            currency,
            product_id,
            products!inner(name, user_id)
          `)
          .eq('id', orderId)
          .single();

        if (orderData) {
          // Buscar email do vendedor
          const { data: sellerProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', orderData.products?.user_id)
            .single();

          if (sellerProfile?.email) {
            // Calcular deadline (7 dias)
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            await supabase.functions.invoke('send-refund-request-notification', {
              body: {
                sellerEmail: sellerProfile.email,
                sellerName: sellerProfile.full_name || 'Vendedor',
                buyerName: orderData.customer_name,
                buyerEmail: orderData.customer_email,
                productName: orderData.products?.name || 'Produto',
                orderId: orderId,
                amount: orderData.amount,
                currency: orderData.currency || 'KZ',
                reason: reason,
                refundDeadline: deadline.toISOString(),
              }
            });
            console.log('✅ Notificação de pedido de reembolso enviada ao vendedor');
          }
        }
      } catch (notifyError) {
        console.error('Erro ao enviar notificação de reembolso:', notifyError);
        // Não falhar a operação por causa da notificação
      }

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

  const reopenRefund = async (orderId: string, reason: string) => {
    try {
      const { data, error } = await supabase.rpc('reopen_refund_request', {
        p_order_id: orderId,
        p_reason: reason
      });

      if (error) throw error;

      toast({
        title: "Solicitação Reenviada",
        description: "Sua nova solicitação foi enviada ao vendedor",
      });

      await loadRefunds();
      return { success: true, refundId: data };
    } catch (error: any) {
      console.error('Error reopening refund:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível reenviar a solicitação",
        variant: "destructive"
      });
      return { success: false };
    }
  };

  const sellerProcessRefund = async (refundId: string, action: 'approve' | 'reject', comment?: string) => {
    try {
      // Buscar dados do reembolso ANTES de processar
      const { data: refundData } = await supabase
        .from('refund_requests')
        .select(`
          *,
          products(name, user_id)
        `)
        .eq('id', refundId)
        .single();

      const { data, error } = await supabase.rpc('seller_process_refund', {
        p_refund_id: refundId,
        p_action: action,
        p_comment: comment
      });

      if (error) throw error;

      // Enviar notificação ao cliente
      if (refundData) {
        try {
          // Buscar nome do vendedor
          const { data: sellerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', refundData.seller_user_id)
            .single();

          await supabase.functions.invoke('send-refund-response-notification', {
            body: {
              buyerEmail: refundData.buyer_email,
              buyerName: refundData.buyer_email?.split('@')[0] || 'Cliente',
              sellerName: sellerProfile?.full_name || 'Vendedor',
              productName: refundData.products?.name || 'Produto',
              orderId: refundData.order_id,
              amount: refundData.amount,
              currency: refundData.currency || 'KZ',
              status: action === 'approve' ? 'approved' : 'rejected',
              sellerComment: comment,
            }
          });
          console.log('✅ Notificação de resposta de reembolso enviada ao cliente');
        } catch (notifyError) {
          console.error('Erro ao enviar notificação ao cliente:', notifyError);
        }
      }

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
      // Buscar dados do reembolso ANTES de processar
      const { data: refundData } = await supabase
        .from('refund_requests')
        .select(`
          *,
          products(name, user_id)
        `)
        .eq('id', refundId)
        .single();

      const { data, error } = await supabase.rpc('admin_process_refund', {
        p_refund_id: refundId,
        p_action: action,
        p_admin_email: adminEmail,
        p_comment: comment
      });

      if (error) throw error;

      // Enviar notificação ao cliente
      if (refundData) {
        try {
          // Buscar nome do vendedor
          const { data: sellerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', refundData.seller_user_id)
            .single();

          await supabase.functions.invoke('send-refund-response-notification', {
            body: {
              buyerEmail: refundData.buyer_email,
              buyerName: refundData.buyer_email?.split('@')[0] || 'Cliente',
              sellerName: sellerProfile?.full_name || 'Vendedor',
              productName: refundData.products?.name || 'Produto',
              orderId: refundData.order_id,
              amount: refundData.amount,
              currency: refundData.currency || 'KZ',
              status: action === 'approve' ? 'approved' : 'rejected',
              adminComment: comment,
            }
          });
          console.log('✅ Notificação de resposta de reembolso (admin) enviada ao cliente');
        } catch (notifyError) {
          console.error('Erro ao enviar notificação ao cliente:', notifyError);
        }
      }

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
    reopenRefund,
    sellerProcessRefund,
    adminProcessRefund,
    loadRefunds
  };
}
