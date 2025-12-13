import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, CheckCircle, Zap, MessageSquare, TrendingUp, Crown, Smartphone, Phone, AlertCircle, Sparkles, X, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/utils/priceFormatting';
import { getPaymentMethodsByCountry, PaymentMethod } from '@/utils/paymentMethods';
import { getPaymentMethodImage } from '@/utils/paymentMethodImages';
import { PhoneInput } from '@/components/PhoneInput';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    if (!isOpen) {
      setWaitingForConfirmation(false);
      setCountdown(90);
      setExpressPhone('');
      setMbwayPhone('');
      setPaymentError('');
    }
  }, [isOpen]);

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
      case 'starter': return <MessageSquare className="h-6 w-6" />;
      case 'básico': return <Zap className="h-6 w-6" />;
      case 'pro': return <TrendingUp className="h-6 w-6" />;
      case 'business': return <Crown className="h-6 w-6" />;
      default: return <MessageSquare className="h-6 w-6" />;
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

    if (selectedPaymentMethod === 'express') {
      const cleanPhone = expressPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 9) {
        setPaymentError('Por favor, insira um número de telefone válido com 9 dígitos.');
        return;
      }
    }

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
            skipOrderSave: true
          }
        });

        if (error) throw error;
        
        if (data?.success === false) {
          throw new Error(data.error || 'Erro ao processar pagamento');
        }

        if (selectedPaymentMethod === 'express') {
          setWaitingForConfirmation(true);
          setCountdown(90);
          
          toast({
            title: 'Confirme no seu telefone',
            description: 'Verifique o app Multicaixa Express e confirme a operação.'
          });
          
          const transactionId = data?.id || data?.merchantTransactionId;
          if (transactionId) {
            pollPaymentStatus(transactionId, selectedPackage.tokens);
          }
        } else {
          toast({
            title: 'Referência gerada',
            description: `Use a referência ${data?.orderId || 'gerada'} para efetuar o pagamento.`
          });
          onClose();
        }
        return;
      }

      if (['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk', 'card_us'].includes(selectedPaymentMethod)) {
        // Usar a mesma função do checkout principal
        const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
          body: {
            amount: priceInfo.price,
            currency: priceInfo.currency,
            productName: `Chat Tokens: ${selectedPackage.name} (${selectedPackage.tokens.toLocaleString()} tokens)`,
            customerEmail: user.email,
            customerName: user.user_metadata?.full_name || user.email,
            productId: `chat-tokens-${selectedPackage.id}`,
            orderId: `tokens-${Date.now()}`,
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
    const maxAttempts = 18;

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
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-0 bg-gradient-to-b from-background to-muted/30">
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <button
            onClick={onClose}
            disabled={processing}
            className="absolute top-4 right-4 p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors z-10"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {selectedPackage && (
            <div className="relative p-6 pb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
                    {getPackageIcon(selectedPackage.name)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{selectedPackage.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedPackage.tokens.toLocaleString()} tokens inclusos
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {priceInfo.formatted}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Waiting for Express Confirmation */}
          <AnimatePresence mode="wait">
            {waitingForConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-700 dark:text-blue-300">Aguardando confirmação</h3>
                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                      Tempo restante: <span className="font-mono font-bold">{formatTime(countdown)}</span>
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-blue-700/90 dark:text-blue-300/90">
                  <p className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold">1</span>
                    Abra o app <strong>Multicaixa Express</strong>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold">2</span>
                    Procure por <strong className="text-red-500">"Operação por Autorizar"</strong>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold">3</span>
                    Confirme a transação
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!waitingForConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              {/* Country Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Selecione o país
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.values(supportedCountries).map((c) => {
                    const isSelected = country === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCountry(c.code);
                          setSelectedPaymentMethod('');
                          setPaymentError('');
                        }}
                        disabled={processing}
                        className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-2xl">{c.flag}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">{c.code}</span>
                        {isSelected && (
                          <motion.div
                            layoutId="country-indicator"
                            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-full"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Método de pagamento
                </Label>
                <div className="space-y-2">
                  {availablePaymentMethods.map((method, index) => {
                    const isSelected = selectedPaymentMethod === method.id;
                    const image = getPaymentMethodImage(method.id);
                    
                    return (
                      <motion.button
                        key={method.id}
                        type="button"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          setSelectedPaymentMethod(method.id);
                          setPaymentError('');
                        }}
                        disabled={processing}
                        className={`group flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-border/50 hover:border-border hover:bg-muted/50'
                        } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-12 h-8 rounded-lg flex items-center justify-center overflow-hidden ${
                          isSelected ? 'bg-white' : 'bg-muted'
                        }`}>
                          {image ? (
                            <img 
                              src={image} 
                              alt={method.name} 
                              className="h-5 w-auto object-contain"
                            />
                          ) : (
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="flex-1 text-left font-medium">{method.name}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary' 
                            : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'
                        }`}>
                          {isSelected && <CheckCircle className="h-4 w-4 text-primary-foreground" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Express Phone Input */}
              <AnimatePresence>
                {selectedPaymentMethod === 'express' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      Número Multicaixa Express
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
                      Insira o número ativo no Multicaixa Express
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* MBWay Phone Input */}
              <AnimatePresence>
                {selectedPaymentMethod === 'mbway' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      Número MB Way
                    </Label>
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground bg-muted px-4 py-2.5 rounded-l-xl border border-r-0 border-input font-medium">
                        +351
                      </span>
                      <Input
                        type="tel"
                        placeholder="912 345 678"
                        value={mbwayPhone}
                        onChange={(e) => setMbwayPhone(e.target.value)}
                        className="rounded-l-none rounded-r-xl"
                        disabled={processing}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Receberá uma notificação para confirmar
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              <AnimatePresence>
                {paymentError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20"
                  >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{paymentError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        {!waitingForConfirmation && (
          <div className="p-6 pt-0 space-y-3">
            <Button 
              className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              onClick={handlePayment}
              disabled={!selectedPaymentMethod || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Pagar {priceInfo.formatted}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Pagamento seguro e encriptado</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
