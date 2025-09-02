import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Copy, CreditCard, Phone, Mail, Clock } from 'lucide-react';
import { useAppyPayReferential } from '@/hooks/useAppyPayReferential';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useCurrencyToCountry } from '@/hooks/useCurrencyToCountry';

interface AppyPayReferentialProps {
  productPrice: number;
  productName: string;
  currency?: string;
  onPaymentCreated?: (reference: string) => void;
  disabled?: boolean;
}

export const AppyPayReferential = ({
  productPrice,
  productName,
  currency = 'AOA',
  onPaymentCreated,
  disabled = false
}: AppyPayReferentialProps) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const { loading, charge, createCharge, clearCharge } = useAppyPayReferential();
  const { toast } = useCustomToast();
  const { getCurrencyInfo } = useCurrencyToCountry();

  const currencyInfo = getCurrencyInfo(currency);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const generateTransactionId = () => {
    return `KAMBAFY_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handleCreateReference = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      toast({
        title: 'Campos obrigatórios',
        message: 'Preencha todos os campos para continuar',
        variant: 'error'
      });
      return;
    }

    const result = await createCharge({
      amount: productPrice,
      currency: currency,
      description: `Compra: ${productName}`,
      merchantTransactionId: generateTransactionId(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      smsNotification: true,
      emailNotification: true
    });

    if (result && onPaymentCreated) {
      onPaymentCreated(result.reference);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copiado',
        message: `${label} copiado para a área de transferência`,
        variant: 'success'
      });
    });
  };

  const formatExpiryDate = (expiresAt: string) => {
    return new Date(expiresAt).toLocaleString('pt-AO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Referencial AppyPay {currencyInfo.flag}
        </CardTitle>
        <CardDescription>
          Gere uma referência de pagamento para pagar via multibanco ou transferência
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!charge ? (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer-name">Nome completo *</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome completo"
                  disabled={disabled || loading}
                />
              </div>
              
              <div>
                <Label htmlFor="customer-email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10"
                    disabled={disabled || loading}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="customer-phone">Telefone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9xxxxxxxx"
                    className="pl-10"
                    disabled={disabled || loading}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total a pagar:</p>
                <p className="text-lg font-semibold">{formatPrice(productPrice)}</p>
              </div>
              
              <Button
                onClick={handleCreateReference}
                disabled={disabled || loading}
                className="min-w-[140px]"
              >
                {loading ? 'Gerando...' : 'Gerar Referência'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Referência Gerada
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearCharge();
                  setCustomerName('');
                  setCustomerEmail('');
                  setCustomerPhone('');
                }}
              >
                Nova Referência
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Referência:</span>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono bg-background px-2 py-1 rounded">
                    {charge.reference}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(charge.reference, 'Referência')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Valor:</span>
                <span className="font-semibold">{formatPrice(charge.amount)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ID da Transação:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {charge.merchantTransactionId}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(charge.merchantTransactionId, 'ID da transação')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {charge.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Expira em:
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatExpiryDate(charge.expiresAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>📱 <strong>Via multibanco:</strong> Use a referência acima</p>
              <p>🏦 <strong>Via transferência:</strong> Use o ID da transação como referência</p>
              <p>📧 Receberá confirmação por email e SMS quando o pagamento for processado</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};