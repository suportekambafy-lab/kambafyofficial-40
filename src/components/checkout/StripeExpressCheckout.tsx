import React, { useState, useEffect } from 'react';
import { 
  ExpressCheckoutElement, 
  useStripe,
  useElements,
  Elements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Lock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useCustomToast } from "@/hooks/useCustomToast";

const stripePromise = loadStripe('pk_live_51RiHotJULMAOJLONpEMG70rOcOr9Vl7wZUfufcpy0r5zemcLEdHVfPblHJsDRmtcPSnYcOBi7Qq7K8nLuYcsQa5E00457X64oG');

interface StripeExpressCheckoutFormProps {
  amount: number;
  currency: string;
  productId: string;
  productName: string;
  customerData: {
    name: string;
    email: string;
    phone: string;
  };
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
  cohortId?: string | null;
  orderBumps?: any[];
}

const StripeExpressCheckoutForm: React.FC<StripeExpressCheckoutFormProps> = ({
  amount,
  currency,
  productId,
  productName,
  customerData,
  onSuccess,
  onError,
  cohortId,
  orderBumps = []
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useCustomToast();
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getStripeCurrency = (fromCurrency: string): string => {
    if (fromCurrency === 'EUR') return 'eur';
    if (fromCurrency === 'MZN') return 'usd';
    return 'usd';
  };

  const stripeCurrency = getStripeCurrency(currency);
  const stripeAmount = Math.round(amount * 100);

  useEffect(() => {
    console.log('✨ Express Checkout initialized:', {
      amount,
      currency,
      stripeCurrency,
      stripeAmount: stripeAmount / 100
    });
  }, [amount, currency, stripeCurrency, stripeAmount]);

  const handleConfirm = async (event: any) => {
    console.log('🚀 Express Checkout confirm event:', event);
    
    if (!stripe || !elements) {
      console.error('❌ Stripe not initialized');
      return;
    }

    setIsProcessing(true);

    try {
      // Create checkout session
      console.log('📡 Creating Stripe Checkout session...');
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout-session', {
        body: {
          amount: amount,
          currency: currency,
          productId: productId,
          productName: productName,
          customerData: {
            name: event.billingDetails?.name || customerData.name,
            email: event.billingDetails?.email || customerData.email,
            phone: event.billingDetails?.phone || customerData.phone
          },
          paymentMethod: event.expressPaymentType === 'apple_pay' ? 'apple_pay' : 'card',
          cohortId: cohortId,
          orderBumps: orderBumps
        }
      });

      if (error) {
        console.error('❌ Error creating checkout session:', error);
        throw new Error(error.message);
      }

      if (!data?.url) {
        throw new Error('URL de checkout não recebida');
      }

      console.log('✅ Checkout session created, redirecting...');
      
      // Redirect to Stripe Checkout
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: data.url,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        console.error('❌ Payment confirmation error:', result.error);
        throw new Error(result.error.message);
      }

      // Success
      console.log('✅ Payment successful:', result);
      toast({
        title: "Pagamento processado!",
        message: "Redirecionando para completar...",
        variant: "success"
      });

      onSuccess(result);

    } catch (error) {
      console.error('❌ Express Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar pagamento';
      
      toast({
        title: "Erro no pagamento",
        message: errorMessage,
        variant: "error"
      });

      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReady = (event: any) => {
    console.log('✅ Express Checkout ready:', event);
    setIsReady(true);
  };

  const handleClick = (event: any) => {
    console.log('👆 Express Checkout clicked:', event);
  };

  if (!stripe || !elements) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Checkout Expresso</h3>
              <p className="text-sm text-muted-foreground">
                Pague com um clique usando Link, Apple Pay ou Google Pay
              </p>
            </div>
          </div>

          <div className="min-h-[48px]">
            <ExpressCheckoutElement
              onConfirm={handleConfirm}
              onReady={handleReady}
              onClick={handleClick}
              options={{
                buttonType: {
                  applePay: 'buy',
                  googlePay: 'buy',
                },
                buttonTheme: {
                  applePay: 'black',
                  googlePay: 'black',
                },
                buttonHeight: 48,
              paymentMethods: {
                applePay: 'auto',
                googlePay: 'auto',
                link: 'auto',
              },
              }}
            />
          </div>

          {!isReady && (
            <div className="text-center py-2">
              <div className="animate-pulse text-sm text-muted-foreground">
                Carregando opções de pagamento expresso...
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Pagamento seguro processado pelo Stripe</span>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm font-medium">Processando pagamento...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const StripeExpressCheckout: React.FC<StripeExpressCheckoutFormProps> = (props) => {
  return (
    <Elements 
      stripe={stripePromise}
      options={{
        mode: 'payment',
        amount: Math.round(props.amount * 100),
        currency: props.currency === 'EUR' ? 'eur' : 'usd',
        appearance: {
          theme: 'stripe',
        },
      }}
    >
      <StripeExpressCheckoutForm {...props} />
    </Elements>
  );
};
