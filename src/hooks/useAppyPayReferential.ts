import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from './useCustomToast';

interface CreateChargeParams {
  amount: number;
  currency: string;
  description: string;
  merchantTransactionId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  smsNotification?: boolean;
  emailNotification?: boolean;
}

interface AppyPayCharge {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
  paymentMethod: string;
  merchantTransactionId: string;
  description: string;
  [key: string]: any;
}

export const useAppyPayReferential = () => {
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState<AppyPayCharge | null>(null);
  const { toast } = useCustomToast();

  const createCharge = async (params: CreateChargeParams): Promise<AppyPayCharge | null> => {
    setLoading(true);
    setCharge(null);

    try {
      console.log('🔄 Criando cobrança AppyPay:', params);
      
      const { data, error } = await supabase.functions.invoke('appypay-create-charge', {
        body: params
      });

      if (error) {
        console.error('❌ Erro na função:', error);
        toast({
          title: 'Erro',
          message: 'Erro ao criar referência de pagamento',
          variant: 'error'
        });
        return null;
      }

      if (!data.success) {
        console.error('❌ Erro na resposta:', data.error);
        toast({
          title: 'Erro',
          message: data.error || 'Erro ao criar referência de pagamento',
          variant: 'error'
        });
        return null;
      }

      const chargeData = data.charge;
      console.log('✅ Cobrança criada:', chargeData);
      
      setCharge(chargeData);
      
      toast({
        title: 'Sucesso',
        message: 'Referência de pagamento criada com sucesso',
        variant: 'success'
      });

      return chargeData;

    } catch (error) {
      console.error('💥 Erro inesperado:', error);
      toast({
        title: 'Erro',
        message: 'Erro interno. Tente novamente.',
        variant: 'error'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearCharge = () => {
    setCharge(null);
  };

  return {
    loading,
    charge,
    createCharge,
    clearCharge
  };
};