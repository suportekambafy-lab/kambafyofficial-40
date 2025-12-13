import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, CheckCircle, Zap, MessageSquare, TrendingUp, Crown } from 'lucide-react';
import { formatPrice } from '@/utils/priceFormatting';
import { getPaymentMethodsByCountry, PaymentMethod } from '@/utils/paymentMethods';
import { getPaymentMethodImage } from '@/utils/paymentMethodImages';

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
  const { toast } = useToast();

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

  const handlePayment = async () => {
    if (!selectedPackage || !selectedPaymentMethod) {
      toast({
        title: 'Selecione um método de pagamento',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const priceInfo = getDisplayPrice();

      const { data, error } = await supabase.functions.invoke('purchase-chat-tokens', {
        body: {
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          tokens: selectedPackage.tokens,
          amount: Math.round(priceInfo.price * 100),
          currency: priceInfo.currency.toLowerCase(),
          paymentMethod: selectedPaymentMethod,
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

      if (data?.pending) {
        toast({
          title: 'Pagamento iniciado',
          description: data.message || 'Aguarde a confirmação do pagamento.'
        });
        onClose();
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Erro no pagamento',
        description: error instanceof Error ? error.message : 'Não foi possível processar o pagamento.',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const priceInfo = getDisplayPrice();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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

            {/* Country Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">País</Label>
              <Select 
                value={country} 
                onValueChange={(value) => {
                  setCountry(value);
                  setSelectedPaymentMethod('');
                }}
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
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`flex items-center gap-3 w-full p-3 rounded-lg border transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
