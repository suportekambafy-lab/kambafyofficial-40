import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, CheckCircle, Zap, MessageSquare, TrendingUp, Crown, Smartphone, Phone, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/utils/priceFormatting';
import { getPaymentMethodsByCountry, PaymentMethod } from '@/utils/paymentMethods';
import { getPaymentMethodImage } from '@/utils/paymentMethodImages';
import { PhoneInput } from '@/components/PhoneInput';

interface TokenPackage {
  id: string;
  name: string;
  description: string;
  tokens: number;
  price_kz: number;
}

interface ChatTokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: TokenPackage | null;
  onPurchaseComplete: () => void;
}

const supportedCountries = {
  AO: { code: 'AO', name: 'Angola', flag: '🇦🇴', currency: 'KZ', rate: 1 },
  MZ: { code: 'MZ', name: 'Moçambique', flag: '🇲🇿', currency: 'MZN', rate: 0.15 },
  PT: { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', rate: 0.0011 },
  GB: { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', currency: 'GBP', rate: 0.00094 },
  US: { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', currency: 'USD', rate: 0.0012 }
};

export function ChatTokenPurchaseModal({ 
  isOpen, 
  onClose, 
  selectedPackage,
  onPurchaseComplete 
}: ChatTokenPurchaseModalProps) {
  const [country, setCountry] = useState('AO');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expressPhone, setExpressPhone] = useState('');
  const [mbwayPhone, setMbwayPhone] = useState('');
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const [countdown, setCountdown] = useState(90);
  const [paymentError, setPaymentError] = useState('');
  const { toast } = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setWaitingForConfirmation(false);
      setCountdown(90);
      setExpressPhone('');
      setMbwayPhone('');
      setPaymentError('');
    }
  }, [isOpen]);

  // Countdown timer for Express payment
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (waitingForConfirmation && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setWaitingForConfirmation(false);
      setProcessing(false);
      toast({
        title: 'Tempo expirado',
        description: 'O tempo para confirmar o pagamento expirou. Tente novamente.',
        variant: 'destructive'
      });
    }
    return () => clearInterval(interval);
  }, [waitingForConfirmation, countdown, toast]);

  const availablePaymentMethods = useMemo(() => {
    const methods = getPaymentMethodsByCountry(country);
    
    // Add Stripe methods for supported countries
    if (country === 'PT') {
      const stripeMethods = [
        { id: 'card', name: 'Cartão de Crédito/Débito', enabled: true, isPortugal: true },
        { id: 'klarna', name: 'Klarna', enabled: true, isPortugal: true },
        { id: 'multibanco', name: 'Multibanco', enabled: true, isPortugal: true },
        { id: 'mbway', name: 'MB Way', enabled: true, isPortugal: true }
      ];
      stripeMethods.forEach(stripeMethod => {
        if (!methods.find(m => m.id === stripeMethod.id)) {
          methods.push(stripeMethod as PaymentMethod);
        }
      });
    }
    
    return methods;
  }, [country]);

  const getDisplayPrice = () => {
    if (!selectedPackage) return { price: 0, formatted: '0', currency: 'KZ' };
    
    const countryData = supportedCountries[country as keyof typeof supportedCountries];
    const convertedPrice = selectedPackage.price_kz * countryData.rate;
    
    if (country === 'AO') {
      return { 
        price: selectedPackage.price_kz, 
        formatted: formatPrice(selectedPackage.price_kz),
        currency: 'KZ'
      };
    }
    
    return { 
      price: convertedPrice, 
      formatted: new Intl.NumberFormat('pt-PT', { 
        style: 'currency', 
        currency: countryData.currency 
      }).format(convertedPrice),
      currency: countryData.currency
    };
  };

  const getPackageIcon = (name: string) => {
    switch (name?.toLowerCase()) {
      case 'starter': return <MessageSquare className="h-5 w-5" />;
      case 'básico': return <Zap className="h-5 w-5" />;
      case 'pro': return <TrendingUp className="h-5 w-5" />;
      case 'business': return <Crown className="h-5 w-5" />;
      default: return <MessageSquare className="h-5 w-5" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = async () => {
    if (!selectedPackage || !selectedPaymentMethod) {
      toast({
        title: 'Selecione um método de pagamento',
        variant: 'destructive'
      });
      return;
    }

    // Validate phone number for Express
    if (selectedPaymentMethod === 'express') {
      const cleanPhone = expressPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 9) {
        setPaymentError('Por favor, insira um número de telefone válido com 9 dígitos.');
        return;
      }
    }

    // Validate phone number for MBWay
    if (selectedPaymentMethod === 'mbway') {
      const cleanPhone = mbwayPhone.replace(/\s/g, '');
      if (cleanPhone.length < 9) {
        setPaymentError('Por favor, insira um número de telemóvel válido.');
        return;
      }
    }

    setPaymentError('');
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const priceInfo = getDisplayPrice();

      // Handle Angola payments via AppyPay
      if (country === 'AO' && (selectedPaymentMethod === 'express' || selectedPaymentMethod === 'reference')) {
        const cleanPhone = expressPhone.replace(/\D/g, '');
        
        const { data, error } = await supabase.functions.invoke('create-appypay-charge', {
          body: {
            amount: priceInfo.price,
            productId: null,
            productName: `Chat Tokens: ${selectedPackage.name}`,
            customerData: {
              name: user.user_metadata?.full_name || user.email,
              email: user.email,
              phone: cleanPhone
            },
            originalAmount: priceInfo.price,
            originalCurrency: 'AOA',
            paymentMethod: selectedPaymentMethod,
            phoneNumber: cleanPhone,
            skipOrderSave: true // Don't save to orders table
          }
        });

        if (error) throw error;
        
        if (data?.success === false) {
          throw new Error(data.error || 'Erro ao processar pagamento');
        }

        if (selectedPaymentMethod === 'express') {
          // Start countdown for Express confirmation
          setWaitingForConfirmation(true);
          setCountdown(90);
          
          toast({
            title: 'Confirme no seu telefone',
            description: 'Verifique o app Multicaixa Express e confirme a operação.'
          });
          
          // Poll for payment status
          const transactionId = data?.id || data?.merchantTransactionId;
          if (transactionId) {
            pollPaymentStatus(transactionId, selectedPackage.tokens);
          }
        } else {
          // Reference payment
          toast({
            title: 'Referência gerada',
            description: `Use a referência ${data?.orderId || 'gerada'} para efetuar o pagamento.`
          });
          onClose();
        }
        return;
      }

      // Handle Stripe payments (PT, GB, US, MZ)
      if (['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us'].includes(selectedPaymentMethod)) {
        const { data, error } = await supabase.functions.invoke('purchase-chat-tokens', {
          body: {
            packageId: selectedPackage.id,
            packageName: selectedPackage.name,
            tokens: selectedPackage.tokens,
            amount: Math.round(priceInfo.price * 100),
            currency: priceInfo.currency.toLowerCase(),
            paymentMethod: selectedPaymentMethod,
            mbwayPhone: selectedPaymentMethod === 'mbway' ? `+351${mbwayPhone.replace(/\s/g, '')}` : undefined,
            successUrl: `${window.location.origin}/vendedor/apps?purchase=success&tokens=${selectedPackage.tokens}`,
            cancelUrl: `${window.location.origin}/vendedor/apps?purchase=cancelled`
          }
        });

        if (error) throw error;

        if (data?.url) {
          window.open(data.url, '_blank');
          onClose();
          return;
        }

        if (data?.error) {
          throw new Error(data.error);
        }
      }

      // Handle Mozambique payments
      if (country === 'MZ' && (selectedPaymentMethod === 'mpesa' || selectedPaymentMethod === 'emola')) {
        toast({
          title: 'Pagamento pendente',
          description: `Pagamento via ${selectedPaymentMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola'} ainda não disponível. Entre em contato com o suporte.`,
          variant: 'default'
        });
        onClose();
        return;
      }

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error instanceof Error ? error.message : 'Não foi possível processar o pagamento.');
    } finally {
      if (!waitingForConfirmation) {
        setProcessing(false);
      }
    }
  };

  const pollPaymentStatus = async (transactionId: string, tokens: number) => {
    let attempts = 0;
    const maxAttempts = 18; // 90 seconds / 5 second intervals

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setWaitingForConfirmation(false);
        setProcessing(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('check-appypay-status', {
          body: { transactionId }
        });

        if (data?.status === 'completed' || data?.status === 'Success') {
          setWaitingForConfirmation(false);
          setProcessing(false);
          toast({
            title: 'Pagamento confirmado!',
            description: `${tokens.toLocaleString()} tokens foram adicionados à sua conta.`
          });
          onPurchaseComplete();
          onClose();
          return;
        }

        if (data?.status === 'failed' || data?.status === 'Failed') {
          setWaitingForConfirmation(false);
          setProcessing(false);
          toast({
            title: 'Pagamento falhado',
            description: 'O pagamento foi recusado. Tente novamente.',
            variant: 'destructive'
          });
          return;
        }

        attempts++;
        setTimeout(checkStatus, 5000);
      } catch (err) {
        console.error('Error checking payment status:', err);
        attempts++;
        setTimeout(checkStatus, 5000);
      }
    };

    setTimeout(checkStatus, 5000);
  };

  const priceInfo = getDisplayPrice();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !processing && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comprar Tokens</DialogTitle>
          <DialogDescription>
            Selecione o país e método de pagamento
          </DialogDescription>
        </DialogHeader>

        {selectedPackage && (
          <div className="space-y-5">
            {/* Package Summary */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  {getPackageIcon(selectedPackage.name)}
                </div>
                <div>
                  <h3 className="font-medium">{selectedPackage.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedPackage.tokens.toLocaleString()} tokens
                  </p>
                </div>
              </div>
              <div className="text-xl font-semibold">
                {priceInfo.formatted}
              </div>
            </div>

            {/* Waiting for Express Confirmation */}
            {waitingForConfirmation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="font-medium text-blue-800">Aguardando confirmação...</span>
                </div>
                <div className="text-sm text-blue-700 space-y-2">
                  <p className="font-medium">
                    ⏰ Você tem {formatTime(countdown)} para confirmar o pagamento
                  </p>
                  <p>
                    → Abra o aplicativo <strong>Multicaixa Express</strong> e procure por <span className="text-red-600 font-bold">"Operação por Autorizar"</span>
                  </p>
                  <p>
                    → Selecione o pagamento pendente e <strong>confirme a transação</strong>
                  </p>
                </div>
              </div>
            )}

            {!waitingForConfirmation && (
              <>
                {/* Country Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">País</Label>
                  <Select 
                    value={country} 
                    onValueChange={(value) => {
                      setCountry(value);
                      setSelectedPaymentMethod('');
                      setPaymentError('');
                    }}
                    disabled={processing}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione o país" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(supportedCountries).map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <div className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Methods */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Método de Pagamento</Label>
                  <div className="space-y-2">
                    {availablePaymentMethods.map((method) => {
                      const isSelected = selectedPaymentMethod === method.id;
                      const image = getPaymentMethodImage(method.id);
                      
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMethod(method.id);
                            setPaymentError('');
                          }}
                          disabled={processing}
                          className={`flex items-center gap-3 w-full p-3 rounded-lg border transition-colors ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-muted-foreground/50'
                          } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {image ? (
                            <img 
                              src={image} 
                              alt={method.name} 
                              className="h-6 w-10 object-contain"
                            />
                          ) : (
                            <div className="h-6 w-10 rounded bg-muted flex items-center justify-center">
                              <Shield className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <span className="flex-1 text-left text-sm">{method.name}</span>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Express Phone Input */}
                {selectedPaymentMethod === 'express' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Número de telefone Multicaixa Express
                    </Label>
                    <PhoneInput 
                      value={expressPhone} 
                      onChange={setExpressPhone} 
                      placeholder="9xxxxxxxx" 
                      selectedCountry="AO" 
                      allowedCountries={["AO"]} 
                      className="w-full" 
                      formatForMulticaixa={true}
                      disabled={processing}
                    />
                    <p className="text-xs text-muted-foreground">
                      Insira o número de telefone ativo no Multicaixa Express
                    </p>
                  </div>
                )}

                {/* MBWay Phone Input */}
                {selectedPaymentMethod === 'mbway' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Número de telemóvel MB Way
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input">
                        +351
                      </span>
                      <Input
                        type="tel"
                        placeholder="912 345 678"
                        value={mbwayPhone}
                        onChange={(e) => setMbwayPhone(e.target.value)}
                        className="rounded-l-none"
                        disabled={processing}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receberá uma notificação no seu telemóvel para confirmar
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {paymentError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Payment Button */}
                <Button 
                  className="w-full"
                  onClick={handlePayment}
                  disabled={!selectedPaymentMethod || processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    `Pagar ${priceInfo.formatted}`
                  )}
                </Button>

                {/* Security Notice */}
                <p className="text-center text-xs text-muted-foreground">
                  Pagamento seguro e encriptado
                </p>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
