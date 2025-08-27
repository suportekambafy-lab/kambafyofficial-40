import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProduct } from '@/hooks/useProduct';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentMethodsSelector } from '@/components/checkout/PaymentMethodsSelector';
import { KambaPayOption } from '@/components/KambaPayOption';
import { Separator } from '@/components/ui/separator';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCheckoutCustomization } from '@/hooks/useCheckoutCustomization';
import { CheckoutBanner } from '@/components/checkout/CheckoutBanner';
import { CheckoutCountdown } from '@/components/checkout/CheckoutCountdown';
import { CheckoutReviews } from '@/components/checkout/CheckoutReviews';
import { CheckoutSocialProof } from '@/components/checkout/CheckoutSocialProof';
import { useAbandonedPurchaseDetection } from '@/hooks/useAbandonedPurchaseDetection';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  fullName: z.string().min(2, {
    message: "Nome completo deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor, insira um email válido.",
  }),
  phone: z.string().min(9, {
    message: "Número de telefone deve ter pelo menos 9 dígitos.",
  }),
});

const Checkout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { product, isLoading: isProductLoading, error: productError } = useProduct(productId || '');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { country } = useGeoLocation();
  const { convertedAmount, originalAmount, originalCurrency, targetCurrency, convertCurrency } = useCurrencyConverter();
  const [totalAmount, setTotalAmount] = useState(0);
  const { settings, loading: settingsLoading } = useCheckoutCustomization(productId || '');

  const { abandonedPurchaseId, markAsRecovered } = useAbandonedPurchaseDetection({
    product: product,
    formData: {
      fullName: '',
      email: '',
      phone: ''
    },
    totalAmount: totalAmount,
    currency: 'KZ',
    enabled: true
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (product) {
      setTotalAmount(product.price);
      convertCurrency(product.price, 'KZ', country === 'PT' ? 'EUR' : 'KZ');
    }
  }, [product, country, convertCurrency]);

  useEffect(() => {
    if (user) {
      setValue("fullName", user?.user_metadata?.full_name || '');
      setValue("email", user?.email || '');
    }
  }, [user, setValue]);

  if (isProductLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <ReloadIcon className="mr-2 h-8 w-8 animate-spin" /> Carregando...
    </div>;
  }

  if (!product) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">
      {productError ? `Erro: ${productError.message}` : 'Produto não encontrado.'}
    </div>;
  }

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Método de pagamento",
        description: "Selecione um método de pagamento para continuar.",
        variant: "destructive"
      });
      return;
    }

    if (selectedPaymentMethod !== 'kambapay' && (!data.fullName || !data.email || !data.phone)) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (selectedPaymentMethod === 'kambapay') {
      handleKambaPayPayment(data);
    } else {
      handleStripePayment(data);
    }
  };

  const handleStripePayment = async (data: z.infer<typeof formSchema>) => {
    setProcessingPayment(true);

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: convertedAmount ? convertedAmount * 100 : totalAmount * 100,
          currency: targetCurrency || 'KZ',
          productId: product.id,
          customerData: {
            name: data.fullName,
            email: data.email,
            phone: data.phone
          },
          originalAmount: originalAmount,
          originalCurrency: originalCurrency,
          convertedAmount: convertedAmount,
          targetCurrency: targetCurrency,
          paymentMethod: selectedPaymentMethod,
          testMode: product.test_mode,
          upsellFrom: localStorage.getItem('upsell_from') || ''
        }),
      });

      const { client_secret, order_id, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      // Marcar carrinho como recuperado se aplicável
      if (abandonedPurchaseId) {
        await markAsRecovered(order_id);
      }

      navigate(`/obrigado?order=${order_id}&paymentIntent=${client_secret}`);
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleKambaPayPayment = async (data: z.infer<typeof formSchema>) => {
    setProcessingPayment(true);

    try {
      const response = await fetch('/api/process-kambapay-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          productId: product.id,
          productPrice: totalAmount,
          customerName: data.fullName,
          customerPhone: data.phone
        }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Marcar carrinho como recuperado se aplicável
      if (abandonedPurchaseId) {
        await markAsRecovered(result.orderId);
      }

      navigate(`/obrigado?order=${result.orderId}&transactionId=${result.transactionId}`);
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleReferencePayment = async () => {
    if (!product || !formData.fullName || !formData.email) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setProcessingPayment(true);
    
    try {
      const orderId = `REF_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      const { data, error } = await supabase.functions.invoke('create-reference-payment', {
        body: {
          productId: product.id,
          amount: totalAmount * 100, // Converter para centavos
          customerData: {
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone
          },
          orderId
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Erro ao processar pagamento');
      }

      // Marcar carrinho como recuperado se aplicável
      if (abandonedPurchaseId) {
        await markAsRecovered(orderId);
      }

      // Redirecionar para página de sucesso com dados da referência
      navigate(`/obrigado?order=${orderId}&reference=${data.reference}&amount=${data.amount}`);
      
    } catch (error) {
      console.error('Reference payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Erro ao processar pagamento por referência",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderPaymentSection = () => {
    if (!selectedPaymentMethod) return null;

    switch (selectedPaymentMethod) {
      case 'reference':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pagamento por Referência</h3>
            <p className="text-gray-600">
              Será gerada uma referência bancária para pagamento do valor de {totalAmount.toLocaleString('pt-BR')} KZ.
            </p>
            <Button 
              onClick={handleReferencePayment}
              disabled={processingPayment || !formData.fullName || !formData.email}
              className="w-full"
            >
              {processingPayment ? 'Gerando referência...' : 'Gerar Referência de Pagamento'}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container py-12">
      {settingsLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <ReloadIcon className="mr-2 h-8 w-8 animate-spin" /> Carregando configurações...
        </div>
      ) : (
        <>
          {settings?.banner?.enabled && settings?.banner?.bannerImage && (
            <CheckoutBanner bannerImage={settings?.banner?.bannerImage} />
          )}

          {settings?.countdown?.enabled && (
            <CheckoutCountdown
              minutes={settings?.countdown?.minutes}
              title={settings?.countdown?.title}
              backgroundColor={settings?.countdown?.backgroundColor}
              textColor={settings?.countdown?.textColor}
            />
          )}

          {settings?.socialProof?.enabled && (
            <CheckoutSocialProof
              viewersCount={settings?.socialProof?.viewersCount}
              totalSales={settings?.socialProof?.totalSales}
              recentPurchases={settings?.socialProof?.recentPurchases}
              position={settings?.socialProof?.position}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Informações de contato</h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">Nome Completo</Label>
                      <Input
                        id="fullName"
                        placeholder="João Silva"
                        type="text"
                        {...register("fullName")}
                      />
                      {errors.fullName && (
                        <p className="text-sm text-red-500">{errors.fullName?.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="joao@email.com"
                        type="email"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email?.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="923000000"
                        type="tel"
                        {...register("phone")}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500">{errors.phone?.message}</p>
                      )}
                    </div>
                    <Separator className="my-4" />
                    <PaymentMethodsSelector
                      selectedMethod={selectedPaymentMethod || ''}
                      onMethodSelect={setSelectedPaymentMethod}
                      productPrice={totalAmount}
                      disabled={processingPayment}
                    />

                    {selectedPaymentMethod === 'kambapay' && (
                      <KambaPayOption
                        productPrice={totalAmount}
                        onSelect={() => { }}
                        selected={selectedPaymentMethod === 'kambapay'}
                        disabled={processingPayment}
                      />
                    )}

                    {renderPaymentSection()}

                    {selectedPaymentMethod !== 'reference' && selectedPaymentMethod !== 'kambapay' && (
                      <Button disabled={processingPayment} className="w-full">
                        {processingPayment ? (
                          <>
                            Processando Pagamento...
                            <ReloadIcon className="ml-2 h-4 w-4 animate-spin" />
                          </>
                        ) : (
                          "Finalizar Compra"
                        )}
                      </Button>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Resumo da compra</h2>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Produto:</span>
                    <span className="font-semibold">{product.name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Preço:</span>
                    <span className="font-semibold">{totalAmount.toLocaleString('pt-BR')} KZ</span>
                  </div>
                  {convertedAmount && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Preço (Convertido):</span>
                      <span className="font-semibold">
                        {convertedAmount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: targetCurrency || 'KZ',
                        })}
                      </span>
                    </div>
                  )}
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="text-xl font-semibold">{convertedAmount ? convertedAmount.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: targetCurrency || 'KZ',
                    }) : totalAmount.toLocaleString('pt-BR')} KZ</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {settings?.reviews?.enabled && (
            <CheckoutReviews
              title={settings?.reviews?.title}
              reviews={settings?.reviews?.reviews}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Checkout;
