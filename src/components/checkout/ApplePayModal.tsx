import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AppleIcon } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51QWtBjKtm5S2NqMjLM1pTqyLxhQKO7jVBhWb3t3tLkfCEaU5S1i4wqO3MwXD0XnI6jkMnWRsQGKaZE6rTDzAIR1I00vx7KqFfg');

interface ApplePayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convertedAmount: number;
  originalAmountKZ: number;
  currency: string;
  productId: string;
  customerData: {
    fullName: string;
    email: string;
    phone: string;
  };
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

const ApplePayForm: React.FC<Omit<ApplePayModalProps, 'open' | 'onOpenChange'> & { clientSecret: string }> = ({
  clientSecret,
  onSuccess,
  onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Apple Pay error:', error);
        onError(error.message || 'Erro ao processar pagamento');
        toast({
          title: "Erro no pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Apple Pay payment successful:', paymentIntent);
        onSuccess(paymentIntent);
        toast({
          title: "Pagamento aprovado!",
          description: "Seu pagamento foi processado com sucesso.",
        });
      }
    } catch (err) {
      console.error('Apple Pay processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado';
      onError(errorMessage);
      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement 
        options={{
          wallets: {
            applePay: 'auto',
            googlePay: 'never'
          }
        }}
      />
      <Button 
        type="submit" 
        disabled={!stripe || processing} 
        className="w-full"
      >
        {processing ? (
          <>
            <LoadingSpinner />
            <span className="ml-2">Processando...</span>
          </>
        ) : (
          <>
            <AppleIcon className="w-4 h-4 mr-2" />
            Pagar com Apple Pay
          </>
        )}
      </Button>
    </form>
  );
};

export const ApplePayModal: React.FC<ApplePayModalProps> = ({
  open,
  onOpenChange,
  convertedAmount,
  originalAmountKZ,
  currency,
  productId,
  customerData,
  onSuccess,
  onError
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getStripeCurrency = (fromCurrency: string): string => {
    if (fromCurrency === 'EUR') return 'eur';
    if (fromCurrency === 'MZN') return 'usd';
    return 'usd';
  };

  React.useEffect(() => {
    if (open && !clientSecret) {
      createPaymentIntent();
    }
  }, [open]);

  const createPaymentIntent = async () => {
    setLoading(true);
    try {
      const stripeCurrency = getStripeCurrency(currency);
      const stripeAmount = Math.round(convertedAmount * 100);

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: stripeAmount,
          currency: stripeCurrency,
          productId,
          customerData,
          originalAmount: originalAmountKZ,
          originalCurrency: 'KZ',
          convertedAmount: convertedAmount,
          targetCurrency: currency,
          paymentMethod: 'apple_pay',
          testMode: false
        }
      });

      if (error) throw error;
      
      if (data?.client_secret) {
        setClientSecret(data.client_secret);
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
      onError('Erro ao inicializar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AppleIcon className="w-5 h-5" />
            Pagamento Apple Pay
          </DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
            <span className="ml-2">Carregando...</span>
          </div>
        )}

        {!loading && clientSecret && (
          <Elements 
            stripe={stripePromise} 
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
              },
            }}
          >
            <ApplePayForm
              clientSecret={clientSecret}
              convertedAmount={convertedAmount}
              originalAmountKZ={originalAmountKZ}
              currency={currency}
              productId={productId}
              customerData={customerData}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
};
