import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building, Clock, X } from 'lucide-react';
import { PaymentProgress } from '@/components/ui/payment-progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OptimizedMulticaixaFormProps {
  product: any;
  customerInfo: {
    fullName: string;
    email: string;
    phone?: string;
  };
  amount: number;
  currency: string;
  formatPrice: (amount: number) => string;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  userCountry?: {
    code: string;
    currency: string;
  };
  t?: (key: string) => string;
}

export const OptimizedMulticaixaForm: React.FC<OptimizedMulticaixaFormProps> = ({
  product,
  customerInfo,
  amount,
  currency,
  formatPrice,
  isSubmitting,
  setIsSubmitting,
  userCountry,
  t = (key: string) => key
}) => {
  const { toast } = useToast();
  const [paymentStage, setPaymentStage] = useState<'validating' | 'processing' | 'redirecting' | 'complete'>('validating');
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMulticaixaPayment = async () => {
    setIsSubmitting(true);
    setIsProcessing(true);
    
    try {
      // Stage 1: Validating
      setPaymentStage('validating');
      setPaymentProgress(15);

      const orderId = `multi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate final amount with custom prices
      let finalAmount = amount;
      if (product.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]) {
        const customPrice = parseFloat(product.custom_prices[userCountry.code]);
        if (!isNaN(customPrice)) {
          finalAmount = customPrice;
        }
      }

      setPaymentProgress(30);

      // Stage 2: Processing
      setPaymentStage('processing');
      setPaymentProgress(50);

      // Calcular seller_commission com taxa de 8.99%
      const sellerCommission = Math.round(finalAmount * 0.9101 * 100) / 100;

      // Background task: Create Multicaixa order
      const { data, error } = await supabase.functions.invoke('create-multibanco-order', {
        body: {
          amount: finalAmount,
          currency,
          productName: product.name,
          customerEmail: customerInfo.email,
          customerName: customerInfo.fullName,
          productId: product.id,
          orderId,
          seller_commission: sellerCommission // Taxa de 8.99% aplicada
        }
      });

      setPaymentProgress(80);

      if (error) {
        throw new Error(error.message);
      }

      // Stage 3: Complete
      setPaymentStage('complete');
      setPaymentProgress(100);

      toast({
        title: "Referência gerada",
        description: "Você receberá os dados de pagamento por email",
      });

      setTimeout(() => {
        setIsSubmitting(false);
        setIsProcessing(false);
      }, 1000);

    } catch (error) {
      console.error('Erro no pagamento Multicaixa:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
      setIsSubmitting(false);
      setIsProcessing(false);
    }
  };

  const cancelPayment = () => {
    setIsProcessing(false);
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t('payment.multicaixa.title') || 'Multicaixa Express'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t('payment.multicaixa.description') || 'Pagamento por referência bancária'}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">{product.name}</span>
            <span className="font-bold text-lg">{formatPrice(amount)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {t('payment.multicaixa.currency') || 'Moeda'}: {currency}
          </div>
        </div>

        {isProcessing && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <PaymentProgress 
              stage={paymentStage} 
              progress={paymentProgress}
            />
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelPayment}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <Button
          onClick={handleMulticaixaPayment}
          disabled={isSubmitting || isProcessing || !customerInfo.fullName || !customerInfo.email}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t('payment.processing') || 'Processando...'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('payment.multicaixa.generate') || 'Gerar Referência'}
            </span>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
          <Building className="w-3 h-3" />
          <span>{t('payment.multicaixa.secure') || 'Pagamento bancário seguro'}</span>
        </div>

        <div className="text-xs text-muted-foreground text-center mt-2">
          {t('payment.multicaixa.info') || 'Referência válida por 48 horas'}
        </div>
      </CardContent>
    </Card>
  );
};