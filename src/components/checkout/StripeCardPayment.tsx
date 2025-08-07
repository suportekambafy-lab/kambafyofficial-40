import React, { useState } from 'react';
import { 
  CardElement, 
  useElements, 
  useStripe,
  Elements,
  PaymentRequestButtonElement
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Lock, Smartphone } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const stripePromise = loadStripe('pk_live_51RiHotJULMAOJLONpEMG70rOcOr9Vl7wZUfufcpy0r5zemcLEdHVfPblHJsDRmtcPSnYcOBi7Qq7K8nLuYcsQa5E00457X64oG');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#424770',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#9e2146',
      iconColor: '#9e2146'
    }
  },
  hidePostalCode: false
};

interface StripeCardFormProps {
  amount: number;
  currency: string;
  productId: string;
  customerData: {
    name: string;
    email: string;
    phone: string;
  };
  paymentMethod: string;
  onSuccess: (paymentResult: any) => void;
  onError: (error: string) => void;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
  displayPrice: string;
  convertedAmount: number;
}

const ApplePayButton: React.FC<StripeCardFormProps> = ({
  convertedAmount,
  currency,
  productId,
  customerData,
  onSuccess,
  onError,
  processing,
  setProcessing
}) => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getStripeCurrency = (fromCurrency: string): string => {
    if (fromCurrency === 'EUR') {
      return 'eur';
    } else if (fromCurrency === 'MZN') {
      return 'usd';
    }
    return 'usd';
  };

  const stripeCurrency = getStripeCurrency(currency);
  const stripeAmount = Math.round(convertedAmount * 100);

  React.useEffect(() => {
    if (!stripe) return;

    console.log(`Apple Pay setup: ${convertedAmount} ${stripeCurrency.toUpperCase()} = ${stripeAmount} cents`);
    setIsLoading(true);

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                    /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    console.log('Browser detection - Safari/iOS:', isSafari);

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: stripeCurrency,
      total: {
        label: 'Total',
        amount: stripeAmount,
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: false,
    });

    pr.canMakePayment().then((result) => {
      console.log('Apple Pay canMakePayment result:', result);
      
      if (result && result.applePay) {
        console.log('Apple Pay is available!');
        setCanMakePayment(true);
        setPaymentRequest(pr);
      } else {
        console.log('Apple Pay not available');
        setCanMakePayment(false);
      }
      setIsLoading(false);
    }).catch((error) => {
      console.error('Error checking Apple Pay availability:', error);
      setCanMakePayment(false);
      setIsLoading(false);
    });

    pr.on('paymentmethod', async (event) => {
      console.log('Apple Pay payment method selected:', event);
      setProcessing(true);

      try {
        const { data: paymentIntentData, error: paymentIntentError } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            amount: stripeAmount,
            currency: stripeCurrency,
            productId,
            customerData,
            originalAmount: convertedAmount,
            originalCurrency: currency,
            convertedAmount: convertedAmount,
            targetCurrency: currency,
            paymentMethod: 'apple_pay',
            testMode: false
          }
        });

        if (paymentIntentError) {
          throw new Error(paymentIntentError.message);
        }

        const confirmResult = await stripe.confirmCardPayment(
          paymentIntentData.client_secret,
          {
            payment_method: event.paymentMethod.id
          }
        );

        if (confirmResult.error) {
          console.error('Apple Pay confirmation error:', confirmResult.error);
          event.complete('fail');
          onError(confirmResult.error.message || 'Erro ao processar pagamento');
        } else {
          console.log('Apple Pay payment successful:', confirmResult.paymentIntent);
          event.complete('success');
          onSuccess(confirmResult.paymentIntent);
        }
      } catch (error) {
        console.error('Apple Pay processing error:', error);
        event.complete('fail');
        onError(error instanceof Error ? error.message : 'Erro inesperado');
      } finally {
        setProcessing(false);
      }
    });
  }, [stripe, convertedAmount, currency, productId, customerData, onSuccess, onError, setProcessing]);

  if (isLoading) {
    return (
      <div className="w-full p-4 text-center">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-md"></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Verificando disponibilidade do Apple Pay...</p>
      </div>
    );
  }

  if (!canMakePayment || !paymentRequest) {
    return (
      <div className="w-full p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
        <Smartphone className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="font-medium">Apple Pay não disponível</p>
        <p className="text-sm mt-1">
          Apple Pay requer Safari no iOS/macOS ou dispositivo compatível
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="apple-pay-button-container">
        <PaymentRequestButtonElement 
          options={{ 
            paymentRequest,
            style: {
              paymentRequestButton: {
                type: 'buy',
                theme: 'dark',
                height: '48px',
              },
            },
          }}
        />
      </div>
      <p className="text-xs text-center text-gray-500 mt-2">
        Toque para pagar com Touch ID, Face ID ou senha
      </p>
    </div>
  );
};

const StripeCardForm: React.FC<StripeCardFormProps> = ({
  amount,
  currency,
  productId,
  customerData,
  paymentMethod,
  onSuccess,
  onError,
  processing,
  setProcessing,
  displayPrice,
  convertedAmount
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cardError, setCardError] = useState<string>('');

  const getStripeCurrency = (fromCurrency: string): string => {
    if (fromCurrency === 'EUR') {
      return 'eur';
    } else if (fromCurrency === 'MZN') {
      return 'usd';
    }
    return 'usd';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setCardError('');

    try {
      const stripeCurrency = getStripeCurrency(currency);
      const stripeAmount = Math.round(convertedAmount * 100);
      
      console.log(`STRIPE PAYMENT DEBUG:`);
      console.log(`Display price: ${displayPrice}`);
      console.log(`Converted amount: ${convertedAmount} ${stripeCurrency.toUpperCase()}`);
      console.log(`Stripe amount (cents): ${stripeAmount}`);
      console.log(`Original amount (KZ): ${amount}`);

      const { data: paymentIntentData, error: paymentIntentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: stripeAmount,
          currency: stripeCurrency,
          productId,
          customerData,
          originalAmount: amount,
          originalCurrency: 'KZ',
          convertedAmount: convertedAmount,
          targetCurrency: currency,
          paymentMethod: paymentMethod,
          testMode: false
        }
      });

      if (paymentIntentError) {
        console.error('Payment Intent creation error:', paymentIntentError);
        throw new Error(paymentIntentError.message);
      }

      console.log('Payment Intent created successfully with amount:', stripeAmount, 'cents');

      let confirmResult;
      
      if (paymentMethod === 'card') {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Elemento do cartão não encontrado');
        }

        confirmResult = await stripe.confirmCardPayment(
          paymentIntentData.client_secret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone
              }
            }
          }
        );
      } else if (paymentMethod === 'klarna') {
        confirmResult = await stripe.confirmKlarnaPayment(
          paymentIntentData.client_secret,
          {
            payment_method: {
              billing_details: {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: {
                  country: currency === 'EUR' ? 'PT' : 'US',
                  line1: '',
                  city: '',
                  postal_code: '',
                  state: ''
                }
              }
            },
            return_url: `${window.location.origin}/checkout/${productId}?payment_return=klarna&order_id=${paymentIntentData.order_id}&payment_intent_id=${paymentIntentData.payment_intent_id}`
          }
        );
      } else if (paymentMethod === 'multibanco') {
        confirmResult = await stripe.confirmMultibancoPayment(
          paymentIntentData.client_secret,
          {
            payment_method: {
              billing_details: {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: {
                  country: 'PT',
                  line1: '',
                  city: '',
                  postal_code: '',
                  state: ''
                }
              }
            },
            return_url: `${window.location.origin}/obrigado?order_id=${paymentIntentData.order_id}&customer_name=${encodeURIComponent(customerData.name)}&customer_email=${encodeURIComponent(customerData.email)}&product_name=${encodeURIComponent('Produto Digital')}&amount=${convertedAmount}&currency=${currency}&product_id=${productId}&payment_method=multibanco&payment_intent_id=${paymentIntentData.payment_intent_id}&status=pending`
          }
        );
      }

      if (confirmResult?.error) {
        console.error('Payment confirmation error:', confirmResult.error);
        setCardError(confirmResult.error.message || 'Erro ao processar pagamento');
        onError(confirmResult.error.message || 'Erro ao processar pagamento');
      } else if (confirmResult?.paymentIntent) {
        console.log('Payment intent confirmed:', confirmResult.paymentIntent);
        
        if (paymentMethod === 'multibanco') {
          // Send Multibanco email immediately
          try {
            console.log('📧 Sending Multibanco email for payment intent:', confirmResult.paymentIntent.id);
            const { error: emailError } = await supabase.functions.invoke('send-multibanco-email-on-creation', {
              body: {
                paymentIntentId: confirmResult.paymentIntent.id,
                orderId: paymentIntentData.order_id
              }
            });

            if (emailError) {
              console.error('❌ Error sending Multibanco email:', emailError);
            } else {
              console.log('✅ Multibanco email sent successfully');
            }
          } catch (emailError) {
            console.error('❌ Failed to send Multibanco email:', emailError);
          }

          const params = new URLSearchParams({
            order_id: paymentIntentData.order_id,
            customer_name: customerData.name,
            customer_email: customerData.email,
            product_name: 'Produto Digital',
            amount: amount.toString(),
            currency: 'KZ',
            product_id: productId,
            payment_method: 'multibanco',
            payment_intent_id: confirmResult.paymentIntent.id,
            status: 'pending'
          });
          
          navigate(`/obrigado?${params.toString()}`);
        } else if (confirmResult.paymentIntent.status === 'succeeded') {
          console.log('Payment succeeded:', confirmResult.paymentIntent);
          toast({
            title: "Pagamento realizado com sucesso!",
            description: "Seu pedido foi processado.",
          });
          onSuccess(confirmResult.paymentIntent);
        }
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado';
      setCardError(errorMessage);
      onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentMethodName = (): string => {
    switch (paymentMethod) {
      case 'card':
        return 'CARTÃO';
      case 'klarna':
        return 'KLARNA';
      case 'multibanco':
        return 'MULTIBANCO';
      case 'apple_pay':
        return 'APPLE PAY';
      default:
        return 'CARTÃO';
    }
  };

  if (paymentMethod === 'apple_pay') {
    return (
      <div className="space-y-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Smartphone className="w-4 h-4" />
                Pagamento seguro com Apple Pay
              </div>
              
              <ApplePayButton
                amount={amount}
                currency={currency}
                productId={productId}
                customerData={customerData}
                paymentMethod={paymentMethod}
                onSuccess={onSuccess}
                onError={onError}
                processing={processing}
                setProcessing={setProcessing}
                displayPrice={displayPrice}
                convertedAmount={convertedAmount}
              />
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Pagamento processado de forma segura pelo Apple Pay
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {paymentMethod === 'card' && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CreditCard className="w-4 h-4" />
                Informações do Cartão
              </div>
              
              <div className="p-3 border border-gray-300 rounded-md bg-white">
                <CardElement options={CARD_ELEMENT_OPTIONS} />
              </div>

              {cardError && (
                <div className="text-sm text-red-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {cardError}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Seus dados estão protegidos com criptografia SSL
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(paymentMethod === 'klarna' || paymentMethod === 'multibanco') && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Lock className="w-4 h-4" />
                Pagamento seguro com {getPaymentMethodName()}
              </div>
              
              <div className="text-sm text-gray-600">
                {paymentMethod === 'multibanco' 
                  ? 'Você será redirecionado para a página de confirmação com a referência para pagamento.'
                  : 'Você será redirecionado para completar o pagamento de forma segura.'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
      >
        {processing ? (
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 rounded bg-green-700 flex items-center justify-center mr-2">
              <span className="text-xs font-bold text-white animate-bounce">K</span>
            </div>
            PROCESSANDO PAGAMENTO...
          </div>
        ) : (
          `PAGAR ${displayPrice} COM ${getPaymentMethodName()}`
        )}
      </Button>
    </form>
  );
};

interface StripeCardPaymentProps {
  amount: number;
  currency: string;
  productId: string;
  customerData: {
    name: string;
    email: string;
    phone: string;
  };
  paymentMethod: string;
  onSuccess: (paymentResult: any) => void;
  onError: (error: string) => void;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
  displayPrice: string;
  convertedAmount: number;
}

const StripeCardPayment: React.FC<StripeCardPaymentProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <StripeCardForm {...props} />
    </Elements>
  );
};

export default StripeCardPayment;
