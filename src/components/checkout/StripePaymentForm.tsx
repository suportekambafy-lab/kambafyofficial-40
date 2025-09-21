import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StripePaymentFormProps {
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

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
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
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleStripePayment = async () => {
    if (!customerInfo.fullName || !customerInfo.email) {
      toast({
        title: "Informações obrigatórias",
        description: "Preencha nome e email para continuar",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setProcessingPayment(true);

    try {
      // Gerar ID único para o pedido
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calcular valor correto para o Stripe considerando preços personalizados
      let finalAmount = amount;
      
      // Verificar se há preços personalizados configurados para o país atual
      if (product.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]) {
        const customPrice = parseFloat(product.custom_prices[userCountry.code]);
        if (!isNaN(customPrice)) {
          console.log(`💰 Usando preço personalizado para ${userCountry.code}: ${customPrice} ${userCountry.currency}`);
          finalAmount = customPrice;
        }
      }

      console.log('Iniciating Stripe payment:', {
        originalAmount: amount,
        finalAmount,
        currency,
        productName: product.name,
        customerEmail: customerInfo.email,
        orderId,
        hasCustomPrices: !!(product.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]),
        userCountry: userCountry?.code
      });

      const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
          amount: finalAmount,
          currency,
          productName: product.name,
          customerEmail: customerInfo.email,
          customerName: customerInfo.fullName,
          productId: product.id,
          orderId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        // Abrir checkout do Stripe em nova aba
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecionando para pagamento",
          description: "Você será redirecionado para o checkout seguro do Stripe",
        });
      } else {
        throw new Error('URL de checkout não recebida');
      }

    } catch (error) {
      console.error('Erro no pagamento Stripe:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setProcessingPayment(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t('payment.card.title') || 'Pagamento Seguro'}
          </h3>
          <p className="text-gray-600 text-sm">
            {t('payment.card.description') || 'Processado de forma segura pelo Stripe'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">{product.name}</span>
            <span className="font-bold text-lg">{formatPrice(amount)}</span>
          </div>
          <div className="text-sm text-gray-600">
            {t('payment.card.currency') || 'Moeda'}: {currency}
          </div>
        </div>

        <Button
          onClick={handleStripePayment}
          disabled={isSubmitting || processingPayment || !customerInfo.fullName || !customerInfo.email}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {processingPayment ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t('payment.processing') || 'Processando...'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t('payment.card.pay') || `Pagar ${formatPrice(amount)}`}
            </span>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
          <Lock className="w-3 h-3" />
          <span>{t('payment.secure') || 'Pagamento 100% seguro'}</span>
        </div>

        <div className="text-xs text-gray-400 text-center mt-2">
          {t('payment.powered') || 'Powered by'} Stripe
        </div>
      </CardContent>
    </Card>
  );
};