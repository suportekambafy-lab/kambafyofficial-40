import React, { useState } from 'react';
import { 
  CardElement, 
  useElements, 
  useStripe,
  Elements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, Smartphone } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const stripePromise = loadStripe('pk_live_51Sb4mRGfoQ3QRz9Av3PFK6zMS4wVFOCxbb331dYoWryYmzGHT9hGbB0TS6Fgvj9E5JgOU9YH9ynMIm1oPc46NRK5004WEaLu4y');

// Traduções para o componente Stripe
const STRIPE_TRANSLATIONS = {
  pt: {
    cardDetails: 'Informações do Cartão',
    sslProtection: 'Seus dados estão protegidos com criptografia SSL',
    processing: 'PROCESSANDO PAGAMENTO...',
    payWith: 'PAGAR',
    with: 'COM',
    paymentSuccess: 'Pagamento realizado com sucesso!',
    paymentSuccessDesc: 'Seu pedido foi processado.',
    paymentRejected: 'Pagamento recusado',
    paymentRejectedDesc: 'O pagamento foi recusado. Por favor, tente novamente.',
    confirmOnPhone: 'Confirme no seu telemóvel',
    confirmOnPhoneDesc: 'Por favor, confirme o pagamento na aplicação MB Way.',
    cardNotFound: 'Elemento do cartão não encontrado',
    unexpectedError: 'Erro inesperado'
  },
  en: {
    cardDetails: 'Card Details',
    sslProtection: 'Your data is protected with SSL encryption',
    processing: 'PROCESSING PAYMENT...',
    payWith: 'PAY',
    with: 'WITH',
    paymentSuccess: 'Payment successful!',
    paymentSuccessDesc: 'Your order has been processed.',
    paymentRejected: 'Payment rejected',
    paymentRejectedDesc: 'The payment was rejected. Please try again.',
    confirmOnPhone: 'Confirm on your phone',
    confirmOnPhoneDesc: 'Please confirm the payment in the MB Way app.',
    cardNotFound: 'Card element not found',
    unexpectedError: 'Unexpected error'
  },
  es: {
    cardDetails: 'Datos de la Tarjeta',
    sslProtection: 'Tus datos están protegidos con encriptación SSL',
    processing: 'PROCESANDO PAGO...',
    payWith: 'PAGAR',
    with: 'CON',
    paymentSuccess: '¡Pago realizado con éxito!',
    paymentSuccessDesc: 'Tu pedido ha sido procesado.',
    paymentRejected: 'Pago rechazado',
    paymentRejectedDesc: 'El pago fue rechazado. Por favor, intenta nuevamente.',
    confirmOnPhone: 'Confirma en tu teléfono',
    confirmOnPhoneDesc: 'Por favor, confirma el pago en la aplicación.',
    cardNotFound: 'Elemento de tarjeta no encontrado',
    unexpectedError: 'Error inesperado'
  }
};

const getStripeLocale = (paymentMethod: string): 'pt' | 'en' | 'es' => {
  if (paymentMethod === 'card_mx' || paymentMethod === 'card_cl') {
    return 'es';
  }
  if (paymentMethod === 'card_uk' || paymentMethod === 'card_us') {
    return 'en';
  }
  return 'pt';
};

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
  originalAmountKZ: number;
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
  customerCountry?: string;
  mbwayPhone?: string;
  onMbwayPhoneChange?: (phone: string) => void;
}

// Apple Pay removido

const StripeCardForm: React.FC<StripeCardFormProps> = ({
  amount,
  originalAmountKZ,
  currency,
  productId,
  customerData,
  paymentMethod,
  onSuccess,
  onError,
  processing,
  setProcessing,
  displayPrice,
  convertedAmount,
  customerCountry,
  mbwayPhone,
  onMbwayPhoneChange
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cardError, setCardError] = useState<string>('');
  const [localMbwayPhone, setLocalMbwayPhone] = useState<string>(mbwayPhone || '');
  
  // Get translations based on payment method
  const locale = getStripeLocale(paymentMethod);
  const t = STRIPE_TRANSLATIONS[locale];

  const getStripeCurrency = (fromCurrency: string): string => {
    if (fromCurrency === 'EUR') {
      return 'eur';
    } else if (fromCurrency === 'MZN') {
      return 'usd';
    } else if (fromCurrency === 'GBP') {
      return 'gbp';
    } else if (fromCurrency === 'USD') {
      return 'usd';
    } else if (fromCurrency === 'MXN') {
      return 'mxn';
    } else if (fromCurrency === 'CLP') {
      return 'clp';
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
      console.log(`Original amount (KZ): ${originalAmountKZ}`);

      const { data: paymentIntentData, error: paymentIntentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: stripeAmount,
          currency: stripeCurrency,
          productId,
          customerData,
          originalAmount: originalAmountKZ, // Valor original em KZ
          originalCurrency: 'KZ', // Moeda original do sistema
          convertedAmount: convertedAmount, // Valor convertido para a moeda de destino
          targetCurrency: currency, // Moeda de destino (EUR, MZN, etc)
          paymentMethod: paymentMethod,
          testMode: false,
          customerCountry: customerCountry
        }
      });

      if (paymentIntentError) {
        console.error('Payment Intent creation error:', paymentIntentError);
        throw new Error(paymentIntentError.message);
      }

      console.log('Payment Intent created successfully with amount:', stripeAmount, 'cents');

      let confirmResult;
      
      if (paymentMethod === 'card' || paymentMethod === 'card_uk' || paymentMethod === 'card_us' || paymentMethod === 'card_mx' || paymentMethod === 'card_cl') {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error(t.cardNotFound);
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
      } else if (paymentMethod === 'klarna' || paymentMethod === 'klarna_uk') {
        const country = paymentMethod === 'klarna_uk' ? 'GB' : (currency === 'EUR' ? 'PT' : 'US');
        confirmResult = await stripe.confirmKlarnaPayment(
          paymentIntentData.client_secret,
          {
            payment_method: {
              billing_details: {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: {
                  country: country,
                  line1: '',
                  city: '',
                  postal_code: '',
                  state: ''
                }
              }
            },
            return_url: `https://pay.kambafy.com/checkout/${productId}?payment_return=klarna&order_id=${paymentIntentData.order_id}&payment_intent_id=${paymentIntentData.payment_intent_id}`
          }
        );
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
            return_url: `https://pay.kambafy.com/checkout/${productId}?payment_return=klarna&order_id=${paymentIntentData.order_id}&payment_intent_id=${paymentIntentData.payment_intent_id}`
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
      } else if (paymentMethod === 'mbway') {
        // MB Way payment - requires phone number in Portuguese format
        // Use mbwayPhone if provided, otherwise fall back to customerData.phone
        const mbwayPhoneToUse = localMbwayPhone || mbwayPhone || customerData.phone;
        const phoneNumber = mbwayPhoneToUse.replace(/\s/g, '');
        const formattedPhone = phoneNumber.startsWith('+351') ? phoneNumber : `+351${phoneNumber.replace(/^0+/, '')}`;
        
        // Create payment method first, then confirm
        const { error: pmError, paymentMethod: pm } = await stripe.createPaymentMethod({
          type: 'mb_way' as any,
          billing_details: {
            name: customerData.name,
            email: customerData.email,
            phone: formattedPhone,
          },
        });

        if (pmError) {
          throw new Error(pmError.message);
        }

        // Use redirect: 'if_required' to handle the response in the current page
        confirmResult = await stripe.confirmPayment({
          clientSecret: paymentIntentData.client_secret,
          confirmParams: {
            payment_method: pm!.id,
            return_url: `${window.location.origin}/checkout/${productId}?payment_return=mbway&order_id=${paymentIntentData.order_id}&payment_intent_id=${paymentIntentData.payment_intent_id}`
          },
          redirect: 'if_required'
        });

        // Handle MB Way result - if we reach here without redirect, check the status
        if (confirmResult?.paymentIntent) {
          const status = confirmResult.paymentIntent.status;
          console.log('MB Way payment status:', status);
          
          if (status === 'succeeded') {
            // Payment succeeded, redirect to thank you page
            const params = new URLSearchParams({
              order_id: paymentIntentData.order_id,
              customer_name: customerData.name,
              customer_email: customerData.email,
              product_name: 'Produto Digital',
              amount: amount.toString(),
              currency: 'KZ',
              product_id: productId,
              payment_method: 'mbway',
              payment_intent_id: confirmResult.paymentIntent.id,
              status: 'paid'
            });
            navigate(`/obrigado?${params.toString()}`);
            return;
          } else if (status === 'requires_action') {
            // MB Way requires user to confirm on phone - show message
            toast({
              title: t.confirmOnPhone,
              description: t.confirmOnPhoneDesc,
            });
            // Don't redirect, wait for confirmation
            return;
          } else if (status === 'canceled' || status === 'requires_payment_method' || status === 'failed') {
            // Payment was rejected/canceled/failed
            console.log('❌ MB Way payment rejected with status:', status);
            toast({
              title: t.paymentRejected,
              description: t.paymentRejectedDesc,
              variant: "destructive"
            });
            setProcessing(false);
            return;
          }
        } else if (confirmResult?.error) {
          // Handle error from confirmPayment
          console.error('❌ MB Way payment error:', confirmResult.error);
          toast({
            title: t.paymentRejected,
            description: confirmResult.error.message || t.paymentRejectedDesc,
            variant: "destructive"
          });
          setCardError(confirmResult.error.message || 'Erro ao processar pagamento');
          setProcessing(false);
          return;
        }
      }

      if (confirmResult?.error) {
        console.error('Payment confirmation error:', confirmResult.error);
        const errorMessage = confirmResult.error.message || 'Erro ao processar pagamento';
        setCardError(errorMessage);
        onError(errorMessage);
        
        // Show toast for payment rejection (especially for MB Way)
        toast({
          title: t.paymentRejected,
          description: errorMessage,
          variant: "destructive"
        });
        setProcessing(false);
        return;
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
            title: t.paymentSuccess,
            description: t.paymentSuccessDesc,
          });
          onSuccess(confirmResult.paymentIntent);
        }
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      const errorMessage = error instanceof Error ? error.message : t.unexpectedError;
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
      case 'card_uk':
      case 'card_us':
        return 'CARD';
      case 'card_mx':
      case 'card_cl':
        return 'TARJETA';
      case 'klarna':
      case 'klarna_uk':
        return 'KLARNA';
      case 'multibanco':
        return 'MULTIBANCO';
      case 'mbway':
        return 'MB WAY';
      default:
        return 'CARD';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(paymentMethod === 'card' || paymentMethod === 'card_uk' || paymentMethod === 'card_us' || paymentMethod === 'card_mx' || paymentMethod === 'card_cl') && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <CreditCard className="w-4 h-4" />
                {t.cardDetails}
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
                {t.sslProtection}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(paymentMethod === 'klarna' || paymentMethod === 'klarna_uk' || paymentMethod === 'multibanco') && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Lock className="w-4 h-4" />
                {paymentMethod === 'klarna_uk' ? `Secure payment with ${getPaymentMethodName()}` : `Pagamento seguro com ${getPaymentMethodName()}`}
              </div>
              
              <div className="text-sm text-gray-600">
                {paymentMethod === 'multibanco' 
                  ? 'Você será redirecionado para a página de confirmação com a referência para pagamento.'
                  : paymentMethod === 'klarna_uk'
                    ? 'Pay in 3 interest-free installments. You will be redirected to complete the payment with Klarna.'
                    : 'Pague em 3x sem juros. Você será redirecionado para completar o pagamento com Klarna.'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentMethod === 'mbway' && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Smartphone className="w-4 h-4" />
                Pagamento seguro com MB WAY
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mbway-phone" className="text-sm font-medium text-gray-700">
                  Número de telemóvel MB Way
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-l-md border border-r-0 border-gray-300">
                    +351
                  </span>
                  <Input
                    id="mbway-phone"
                    type="tel"
                    placeholder="912 345 678"
                    value={localMbwayPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
                      setLocalMbwayPhone(value);
                      onMbwayPhoneChange?.(value);
                    }}
                    className="flex-1 rounded-l-none"
                    maxLength={9}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Insira o número associado à sua conta MB Way (9 dígitos)
                </p>
              </div>
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                Receberá uma notificação no seu telemóvel para confirmar o pagamento via MB Way.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing || !customerData.name || !customerData.email || !customerData.phone || (paymentMethod === 'mbway' && localMbwayPhone.length !== 9)}
        className={`w-full h-12 font-semibold ${
          (!stripe || processing || !customerData.name || !customerData.email || !customerData.phone || (paymentMethod === 'mbway' && localMbwayPhone.length !== 9))
            ? 'bg-green-600/50 cursor-not-allowed text-white/70'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {processing ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2">
            </div>
            {t.processing}
          </div>
        ) : (
          `${t.payWith} ${displayPrice} ${t.with} ${getPaymentMethodName()}`
        )}
      </Button>
    </form>
  );
};

interface StripeCardPaymentProps {
  amount: number;
  originalAmountKZ: number;
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
  mbwayPhone?: string;
  onMbwayPhoneChange?: (phone: string) => void;
}

const StripeCardPayment: React.FC<StripeCardPaymentProps> = (props) => {
  // Determinar o locale para o Stripe Elements baseado no método de pagamento
  const getStripeElementsLocale = (): 'pt' | 'en' | 'es' | 'auto' => {
    if (props.paymentMethod === 'card_mx' || props.paymentMethod === 'card_cl') {
      return 'es';
    }
    if (props.paymentMethod === 'card_uk' || props.paymentMethod === 'card_us') {
      return 'en';
    }
    return 'pt';
  };

  return (
    <Elements stripe={stripePromise} options={{ locale: getStripeElementsLocale() }}>
      <StripeCardForm {...props} />
    </Elements>
  );
};

export default StripeCardPayment;
