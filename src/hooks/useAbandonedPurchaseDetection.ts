import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AbandonedPurchaseData {
  productId: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  currency?: string;
  customerPhone?: string;
}

interface UseAbandonedPurchaseDetectionProps {
  product: any;
  formData: {
    fullName: string;
    email: string;
    phone: string;
  };
  totalAmount: number;
  currency: string;
  enabled?: boolean;
}

export const useAbandonedPurchaseDetection = ({
  product,
  formData,
  totalAmount,
  currency,
  enabled = true
}: UseAbandonedPurchaseDetectionProps) => {
  const abandonedPurchaseIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasDetectedRef = useRef(false);

  // Resetar quando mudar de produto
  useEffect(() => {
    hasDetectedRef.current = false;
    abandonedPurchaseIdRef.current = null;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [product?.id]);

  // Detectar abandono quando dados estiverem completos
  useEffect(() => {
    if (!enabled || !product || hasDetectedRef.current) {
      return;
    }

    // Verificar se os dados mínimos estão preenchidos
    const hasMinimumData = formData.email && 
                          formData.fullName && 
                          totalAmount > 0;

    if (!hasMinimumData) {
      return;
    }

    // Detectar abandono após 30 segundos de inatividade
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        console.log('🚨 Detectando possível carrinho abandonado...');
        
        const abandonedData: AbandonedPurchaseData = {
          productId: product.id,
          customerEmail: formData.email.trim().toLowerCase(),
          customerName: formData.fullName.trim(),
          amount: totalAmount,
          currency: currency || 'KZ',
          customerPhone: formData.phone || undefined
        };

        const { data: abandonedId, error } = await supabase.rpc('detect_abandoned_purchase', {
          _product_id: abandonedData.productId,
          _customer_email: abandonedData.customerEmail,
          _customer_name: abandonedData.customerName,
          _amount: abandonedData.amount,
          _currency: abandonedData.currency,
          _customer_phone: abandonedData.customerPhone,
          _ip_address: null,
          _user_agent: navigator.userAgent
        });

        if (error) {
          console.error('❌ Erro ao detectar carrinho abandonado:', error);
          return;
        }

        if (abandonedId) {
          console.log('✅ Carrinho abandonado detectado:', abandonedId);
          abandonedPurchaseIdRef.current = abandonedId;
          hasDetectedRef.current = true;
        }

      } catch (error) {
        console.error('❌ Erro inesperado ao detectar abandono:', error);
      }
    }, 30000); // 30 segundos

    // Cleanup na desmontagem
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    enabled,
    product?.id,
    formData.email,
    formData.fullName,
    formData.phone,
    totalAmount,
    currency
  ]);

  // Marcar como recuperado quando compra for finalizada
  const markAsRecovered = async (orderId: string) => {
    if (!abandonedPurchaseIdRef.current) {
      return;
    }

    try {
      console.log('🔄 Marcando carrinho como recuperado:', {
        abandonedPurchaseId: abandonedPurchaseIdRef.current,
        orderId
      });

      const { error } = await supabase
        .from('abandoned_purchases')
        .update({
          status: 'recovered',
          recovered_at: new Date().toISOString(),
          recovered_order_id: orderId
        })
        .eq('id', abandonedPurchaseIdRef.current);

      if (error) {
        console.error('❌ Erro ao marcar como recuperado:', error);
      } else {
        console.log('✅ Carrinho marcado como recuperado');
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao marcar recuperação:', error);
    }
  };

  // Detectar tentativas de saída da página
  useEffect(() => {
    if (!enabled || !hasDetectedRef.current) {
      return;
    }

    const handleBeforeUnload = () => {
      // O carrinho já foi detectado, não fazer nada aqui
      // O sistema de recuperação cuidará do resto
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled]);

  return {
    abandonedPurchaseId: abandonedPurchaseIdRef.current,
    markAsRecovered,
    hasDetected: hasDetectedRef.current
  };
};