import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Lock, X } from 'lucide-react';
import { PaymentProgress } from '@/components/ui/payment-progress';
import { useOptimizedPayment } from '@/hooks/useOptimizedPayment';

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
  const { isProcessing, processStripePayment, cancelPayment } = useOptimizedPayment();
  const [paymentStage, setPaymentStage] = useState<'validating' | 'processing' | 'redirecting' | 'complete'>('validating');
  const [paymentProgress, setPaymentProgress] = useState(0);

  const handleStripePayment = async () => {
    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate final amount with custom prices
    let finalAmount = amount;
    if (product.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]) {
      const customPrice = parseFloat(product.custom_prices[userCountry.code]);
      if (!isNaN(customPrice)) {
        finalAmount = customPrice;
      }
    }

    const hasCustomPrices = !!(product.custom_prices && userCountry?.code && product.custom_prices[userCountry.code]);

    // Set submitting state immediately for UI feedback
    setIsSubmitting(true);

    // Process payment with optimized flow
    await processStripePayment({
      amount: finalAmount,
      currency,
      productName: product.name,
      customerEmail: customerInfo.email,
      customerName: customerInfo.fullName,
      productId: product.id,
      orderId,
      hasCustomPrices
    }, {
      onProgress: (stage, progress) => {
        setPaymentStage(stage);
        setPaymentProgress(progress);
      },
      onSuccess: (data) => {
        console.log('Payment successful:', data);
        // Keep submitting state for a moment to show completion
        setTimeout(() => setIsSubmitting(false), 1000);
      },
      onError: (error) => {
        console.error('Payment error:', error);
        setIsSubmitting(false);
      }
    });
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
          onClick={handleStripePayment}
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