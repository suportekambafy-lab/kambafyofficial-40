import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentData {
  amount: number;
  currency: string;
  productName: string;
  customerEmail: string;
  customerName: string;
  productId: string;
  orderId: string;
  hasCustomPrices?: boolean;
}

interface PaymentOptions {
  onProgress?: (stage: 'validating' | 'processing' | 'redirecting' | 'complete', progress: number) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useOptimizedPayment = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processStripePayment = useCallback(async (
    paymentData: PaymentData, 
    options: PaymentOptions = {}
  ) => {
    const { onProgress, onSuccess, onError } = options;

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsProcessing(true);

    try {
      // Stage 1: Validating (0-25%)
      onProgress?.('validating', 10);
      
      // Quick validation
      if (!paymentData.customerName || !paymentData.customerEmail) {
        throw new Error('Informações obrigatórias não preenchidas');
      }

      onProgress?.('validating', 25);

      // Stage 2: Processing (25-75%)
      onProgress?.('processing', 40);
      
      // Make the payment request with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Pagamento demorou muito para processar')), 15000);
      });

      const paymentPromise = supabase.functions.invoke('create-stripe-payment', {
        body: paymentData
      });

      onProgress?.('processing', 65);

      const { data, error } = await Promise.race([paymentPromise, timeoutPromise]) as any;

      if (abortControllerRef.current.signal.aborted) {
        throw new Error('Pagamento cancelado');
      }

      if (error) {
        throw new Error(error.message || 'Erro no processamento do pagamento');
      }

      onProgress?.('processing', 75);

      // Stage 3: Redirecting (75-90%)
      onProgress?.('redirecting', 80);

      if (data?.url) {
        // Open checkout in new tab with immediate feedback
        const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        
        if (!newWindow) {
          throw new Error('Pop-up bloqueado. Por favor, permita pop-ups e tente novamente.');
        }

        onProgress?.('redirecting', 90);

        // Stage 4: Complete (90-100%)
        setTimeout(() => {
          onProgress?.('complete', 100);
          
          toast({
            title: "Redirecionamento concluído",
            description: "Finalize seu pagamento na nova aba aberta",
          });

          onSuccess?.(data);
        }, 500);

      } else {
        throw new Error('URL de checkout não recebida do servidor');
      }

    } catch (error) {
      console.error('Erro no pagamento otimizado:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido no pagamento";
      
      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive"
      });

      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [toast]);

  const processKambaPayPayment = useCallback(async (
    email: string,
    productPrice: number,
    productId: string,
    customerName: string,
    options: PaymentOptions = {}
  ) => {
    const { onProgress, onSuccess, onError } = options;

    setIsProcessing(true);

    try {
      // Stage 1: Validating balance (0-30%)
      onProgress?.('validating', 15);
      
      // Background task: Check balance
      const balancePromise = supabase.functions.invoke('get-kambapay-balance', {
        body: { email }
      });

      onProgress?.('validating', 30);

      const { data: balanceData, error: balanceError } = await balancePromise;

      if (balanceError || !balanceData?.balance || balanceData.balance < productPrice) {
        throw new Error('Saldo insuficiente na conta KambaPay');
      }

      // Stage 2: Processing payment (30-80%)
      onProgress?.('processing', 50);

      const paymentPromise = supabase.functions.invoke('process-kambapay-payment', {
        body: {
          email,
          productId,
          productPrice,
          customerName,
          customerPhone: ''
        }
      });

      onProgress?.('processing', 70);

      const { data: paymentData, error: paymentError } = await paymentPromise;

      if (paymentError) {
        throw new Error(paymentError.message || 'Erro no processamento KambaPay');
      }

      onProgress?.('processing', 80);

      // Stage 3: Complete (80-100%)
      onProgress?.('complete', 90);

      setTimeout(() => {
        onProgress?.('complete', 100);
        
        toast({
          title: "Pagamento KambaPay concluído",
          description: "Seu produto foi adquirido com sucesso!",
        });

        onSuccess?.(paymentData);
      }, 300);

    } catch (error) {
      console.error('Erro no pagamento KambaPay:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Erro no pagamento KambaPay";
      
      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive"
      });

      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const cancelPayment = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
  }, []);

  return {
    isProcessing,
    processStripePayment,
    processKambaPayPayment,
    cancelPayment
  };
};