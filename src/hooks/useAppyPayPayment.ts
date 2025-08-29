import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateReferenceParams {
  productId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  amount: string;
  orderId: string;
}

interface PaymentReference {
  reference_payment_id: string;
  reference_number: string;
  transaction_id: string;
  amount: number;
  currency: string;
  expires_at: string;
  payment_instructions: string;
}

interface PaymentStatus {
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  paid_at?: string;
  reference_number: string;
  amount: number;
}

export const useAppyPayPayment = () => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const createReference = async (params: CreateReferenceParams): Promise<PaymentReference | null> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-appypay-reference', {
        body: params
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Referência criada com sucesso",
          description: "Use a referência para fazer o pagamento."
        });
        return data.data;
      } else {
        throw new Error(data.error || 'Erro ao criar referência');
      }

    } catch (error: any) {
      console.error('Error creating AppyPay reference:', error);
      const errorMessage = error.message || 'Erro ao criar referência de pagamento';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (referencePaymentId: string): Promise<PaymentStatus | null> => {
    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-appypay-payment', {
        body: { referencePaymentId }
      });

      if (error) throw error;

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Erro ao verificar pagamento');
      }

    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Erro",
        description: error.message || 'Erro ao verificar pagamento',
        variant: "destructive"
      });
      return null;
    } finally {
      setVerifying(false);
    }
  };

  return {
    createReference,
    verifyPayment,
    loading,
    verifying
  };
};