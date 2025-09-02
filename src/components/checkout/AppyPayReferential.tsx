import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Clock, CreditCard, CheckCircle } from 'lucide-react';
import { useAppyPayReferential } from '@/hooks/useAppyPayReferential';
import { useCustomToast } from '@/hooks/useCustomToast';

interface AppyPayReferentialProps {
  productPrice: number;
  productName: string;
  currency: string;
  onPaymentCreated?: (reference: any) => void;
  disabled?: boolean;
}

export const AppyPayReferential: React.FC<AppyPayReferentialProps> = ({
  productPrice,
  productName,
  currency,
  onPaymentCreated,
  disabled = false
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const { loading, charge, createCharge } = useAppyPayReferential();
  const { toast } = useCustomToast();

  // Função para formatar preços
  const formatPrice = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: currency === 'AOA' ? 'AOA' : 'KZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return formatter.format(amount);
  };

  const generateTransactionId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `KAMBAFY_${timestamp}_${random}`;
  };

  const handleCreateReference = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      toast({
        title: 'Dados incompletos',
        message: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'error'
      });
      return;
    }

    const merchantTransactionId = generateTransactionId();

    const params = {
      amount: productPrice,
      currency: 'AOA', // AppyPay usa AOA
      description: `Compra: ${productName}`,
      merchantTransactionId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      smsNotification: true,
      emailNotification: true
    };

    const result = await createCharge(params);
    if (result && onPaymentCreated) {
      onPaymentCreated(result);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado!',
        message: `${label} copiado para a área de transferência`,
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        message: 'Não foi possível copiar. Tente selecionar e copiar manualmente.',
        variant: 'error'
      });
    }
  };

  const formatExpiryDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-AO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          Pagamento por Referência - Angola
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Valor: <span className="font-medium text-lg">{formatPrice(productPrice, 'AOA')}</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!charge ? (
          // Formulário para gerar referência
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName" className="text-sm font-medium">
                Nome Completo *
              </Label>
              <Input
                id="customerName"
                type="text"
                placeholder="Digite seu nome completo"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={loading || disabled}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customerEmail" className="text-sm font-medium">
                Email *
              </Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={loading || disabled}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="customerPhone" className="text-sm font-medium">
                Telefone *
              </Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="923 000 000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                disabled={loading || disabled}
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleCreateReference}
              disabled={loading || disabled || !customerName.trim() || !customerEmail.trim() || !customerPhone.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Gerando Referência...
                </>
              ) : (
                'Gerar Referência de Pagamento'
              )}
            </Button>
          </div>
        ) : (
          // Exibir detalhes da referência gerada
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">Referência Gerada com Sucesso!</span>
            </div>

            <div className="space-y-3">
              {/* Referência */}
              {charge.reference && (
                <div className="p-3 bg-blue-50 rounded-lg border">
                  <Label className="text-xs text-blue-600 uppercase tracking-wide font-medium">
                    Referência de Pagamento
                  </Label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-mono font-bold text-blue-900">
                      {charge.reference}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(charge.reference, 'Referência')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ID da Transação */}
              <div className="p-3 bg-gray-50 rounded-lg border">
                <Label className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                  ID da Transação
                </Label>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-mono text-gray-800">
                    {charge.merchantTransactionId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(charge.merchantTransactionId, 'ID da Transação')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Validade */}
              {charge.expiresAt && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div>
                    <span className="text-xs text-orange-600 uppercase tracking-wide font-medium">
                      Válido até:
                    </span>
                    <div className="text-sm font-medium text-orange-800">
                      {formatExpiryDate(charge.expiresAt)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instruções de pagamento */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-2">Como Pagar em Angola:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>Referência Bancária:</strong> Use a referência acima em qualquer banco em Angola</li>
                <li>• <strong>Transferência:</strong> Use os dados da referência para transferência bancária</li>
                <li>• <strong>ATM:</strong> Acesse um ATM e use a referência para pagamento</li>
                <li>• <strong>Mobile Banking:</strong> Use a referência no seu banco móvel</li>
              </ul>
              <p className="text-xs text-gray-600 mt-2">
                O pagamento será confirmado automaticamente após processamento bancário.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};