import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecoverySettings {
  id?: string;
  product_id: string;
  enabled: boolean;
  email_delay_hours: number;
  email_subject: string;
  email_template: string;
  max_recovery_attempts: number;
}

interface AbandonedPurchase {
  id: string;
  product_id: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  currency: string;
  status: 'abandoned' | 'recovered' | 'expired';
  abandoned_at: string;
  recovery_attempts_count: number;
  last_recovery_attempt_at?: string;
}

interface RecoveryAnalytics {
  total_abandoned: number;
  total_recovery_emails_sent: number;
  total_recovered: number;
  total_recovered_amount: number;
  recovery_rate: number;
}

export function useSalesRecovery() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getRecoverySettings = async (productId: string): Promise<RecoverySettings | null> => {
    try {
      const { data, error } = await supabase
        .from('sales_recovery_settings')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching recovery settings:', error);
      return null;
    }
  };

  const saveRecoverySettings = async (settings: Partial<RecoverySettings>): Promise<boolean> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const settingsData = {
        ...settings,
        user_id: user.id,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('sales_recovery_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sales_recovery_settings')
          .insert(settingsData);

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas",
        description: "As configurações de recuperação foram atualizadas com sucesso."
      });

      return true;
    } catch (error) {
      console.error('Error saving recovery settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getAbandonedPurchases = async (productId?: string): Promise<AbandonedPurchase[]> => {
    try {
      let query = supabase
        .from('abandoned_purchases')
        .select(`
          *,
          products!inner(name, user_id)
        `)
        .order('abandoned_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.filter(purchase => 
        purchase.products && purchase.products.user_id
      ).map(purchase => ({
        id: purchase.id,
        product_id: purchase.product_id,
        customer_email: purchase.customer_email,
        customer_name: purchase.customer_name,
        amount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status as 'abandoned' | 'recovered' | 'expired',
        abandoned_at: purchase.abandoned_at,
        recovery_attempts_count: purchase.recovery_attempts_count,
        last_recovery_attempt_at: purchase.last_recovery_attempt_at
      })) || [];
    } catch (error) {
      console.error('Error fetching abandoned purchases:', error);
      return [];
    }
  };

  const getRecoveryAnalytics = async (
    startDate: string, 
    endDate: string, 
    productId?: string
  ): Promise<RecoveryAnalytics> => {
    try {
      let query = supabase
        .from('sales_recovery_analytics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          total_abandoned: 0,
          total_recovery_emails_sent: 0,
          total_recovered: 0,
          total_recovered_amount: 0,
          recovery_rate: 0
        };
      }

      const aggregated = data.reduce((acc, curr) => ({
        total_abandoned: acc.total_abandoned + curr.total_abandoned,
        total_recovery_emails_sent: acc.total_recovery_emails_sent + curr.total_recovery_emails_sent,
        total_recovered: acc.total_recovered + curr.total_recovered,
        total_recovered_amount: acc.total_recovered_amount + curr.total_recovered_amount,
        recovery_rate: 0 // Will calculate below
      }), {
        total_abandoned: 0,
        total_recovery_emails_sent: 0,
        total_recovered: 0,
        total_recovered_amount: 0,
        recovery_rate: 0
      });

      // Calculate recovery rate
      aggregated.recovery_rate = aggregated.total_abandoned > 0 
        ? (aggregated.total_recovered / aggregated.total_abandoned) * 100 
        : 0;

      return aggregated;
    } catch (error) {
      console.error('Error fetching recovery analytics:', error);
      return {
        total_abandoned: 0,
        total_recovery_emails_sent: 0,
        total_recovered: 0,
        total_recovered_amount: 0,
        recovery_rate: 0
      };
    }
  };

  const detectAbandonedPurchase = async (purchaseData: {
    productId: string;
    customerEmail: string;
    customerName: string;
    amount: number;
    currency?: string;
    customerPhone?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('detect_abandoned_purchase', {
        _product_id: purchaseData.productId,
        _customer_email: purchaseData.customerEmail,
        _customer_name: purchaseData.customerName,
        _amount: purchaseData.amount,
        _currency: purchaseData.currency || 'KZ',
        _customer_phone: purchaseData.customerPhone,
        _ip_address: purchaseData.ipAddress,
        _user_agent: purchaseData.userAgent
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error detecting abandoned purchase:', error);
      return null;
    }
  };

  const markAsRecovered = async (abandonedPurchaseId: string, orderId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('abandoned_purchases')
        .update({
          status: 'recovered',
          recovered_at: new Date().toISOString(),
          recovered_order_id: orderId
        })
        .eq('id', abandonedPurchaseId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking purchase as recovered:', error);
      return false;
    }
  };

  return {
    loading,
    getRecoverySettings,
    saveRecoverySettings,
    getAbandonedPurchases,
    getRecoveryAnalytics,
    detectAbandonedPurchase,
    markAsRecovered
  };
}