import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Smartphone, Copy, CheckCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomToast } from "@/hooks/useCustomToast";
import { getPaymentMethodImage } from "@/utils/paymentMethodImages";

interface MozambiquePaymentFormProps {
  product: any;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  amount: number;
  currency: string;
  formatPrice: (amount: number, isAlreadyConverted?: boolean) => string;
  onPaymentComplete?: (orderId: string) => void;
  orderBumpData?: any;
  affiliateCode?: string | null;
  affiliateCommission?: number | null;
  cohortId?: string | null;
  t: (key: string) => string;
  selectedProvider: 'emola' | 'mpesa'; // Provider já selecionado na página principal
}

export const MozambiquePaymentForm = ({
  product,
  customerInfo,
  amount,
  currency,
  formatPrice,
  onPaymentComplete,
  orderBumpData,
  affiliateCode,
  affiliateCommission,
  cohortId,
  t,
  selectedProvider
}: MozambiquePaymentFormProps) => {
  const { toast } = useCustomToast();
  const [phoneNumber, setPhoneNumber] = useState(customerInfo.phone || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [referenceData, setReferenceData] = useState<{
    entity: string;
    reference: string;
    transactionId: string;
    orderId: string;
  } | null>(null);
  const [copiedEntity, setCopiedEntity] = useState(false);
  const [copiedReference, setCopiedReference] = useState(false);

  // Validate Mozambique phone number based on provider
  const validateMZPhone = (phone: string): { valid: boolean; error?: string } => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Get the local number (without country code)
    let localNumber = cleanPhone;
    if (cleanPhone.startsWith('258')) {
      localNumber = cleanPhone.substring(3);
    }
    
    // Must be 9 digits
    if (localNumber.length !== 9) {
      return { valid: false, error: "O número deve ter 9 dígitos" };
    }
    
    const prefix = localNumber.substring(0, 2);
    
    // Validate prefix based on provider
    if (selectedProvider === 'emola') {
      // e-Mola uses 84 and 86
      if (!['84', '86'].includes(prefix)) {
        return { 
          valid: false, 
          error: `Para e-Mola, use um número 84 ou 86. O número ${prefix}X é M-Pesa.` 
        };
      }
    } else if (selectedProvider === 'mpesa') {
      // M-Pesa uses 84, 85, 86, 87
      if (!['84', '85', '86', '87'].includes(prefix)) {
        return { 
          valid: false, 
          error: "Para M-Pesa, use um número que comece com 84, 85, 86 ou 87" 
        };
      }
    }
    
    return { valid: true };
  };

  const formatPhoneForDisplay = (phone: string): string => {
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('258')) {
      return `+${clean.substring(0, 3)} ${clean.substring(3, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
    }
    return `+258 ${clean.substring(0, 2)} ${clean.substring(2, 5)} ${clean.substring(5)}`;
  };

  const handleCopy = async (text: string, type: 'entity' | 'reference') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'entity') {
        setCopiedEntity(true);
        setTimeout(() => setCopiedEntity(false), 2000);
      } else {
        setCopiedReference(true);
        setTimeout(() => setCopiedReference(false), 2000);
      }
      toast({
        title: "Copiado!",
        message: `${type === 'entity' ? 'Entidade' : 'Referência'} copiada para a área de transferência`,
        variant: "success"
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleGenerateReference = async () => {
    // Validate phone
    const validation = validateMZPhone(phoneNumber);
    if (!validation.valid) {
      toast({
        title: "Número inválido",
        message: validation.error || "Por favor, insira um número válido",
        variant: "error"
      });
      return;
    }

    // Validate customer info
    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Dados incompletos",
        message: "Por favor, preencha todos os dados do cliente",
        variant: "error"
      });
      return;
    }

    // Validate customer info
    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Dados incompletos",
        message: "Por favor, preencha todos os dados do cliente",
        variant: "error"
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🇲🇿 Creating SISLOG payment...', {
        amount,
        provider: selectedProvider,
        phone: phoneNumber
      });

      // Calculate seller commission
      const commissionRate = product.commission ? parseFloat(product.commission) / 100 : 0.90;
      const sellerCommission = Math.round(amount * commissionRate * 100) / 100;

      const response = await supabase.functions.invoke('create-sislog-payment', {
        body: {
          amount,
          productId: product.id,
          customerData: {
            name: customerInfo.name.trim(),
            email: customerInfo.email.toLowerCase().trim(),
            phone: phoneNumber
          },
          phoneNumber,
          provider: selectedProvider,
          orderData: {
            affiliate_code: affiliateCode,
            affiliate_commission: affiliateCommission,
            cohort_id: cohortId,
            order_bump_data: orderBumpData,
            seller_commission: sellerCommission
          }
        }
      });

      if (response.error) {
        console.error('❌ SISLOG error:', response.error);
        toast({
          title: "Erro ao gerar referência",
          message: response.error.message || "Tente novamente mais tarde",
          variant: "error"
        });
        setIsProcessing(false);
        return;
      }

      const data = response.data;
      console.log('✅ SISLOG response:', data);

      // Check if SISLOG returned an error in the response body
      if (data.error) {
        console.error('❌ SISLOG API error:', data);
        toast({
          title: "Erro do provedor",
          message: data.error,
          variant: "error"
        });
        setIsProcessing(false);
        return;
      }

      if (data.success && data.sislog) {
        setReferenceData({
          entity: data.sislog.entity,
          reference: data.sislog.reference,
          transactionId: data.sislog.transactionId,
          orderId: data.order.order_id
        });

        toast({
          title: "Referência gerada!",
          message: `Abra o app ${selectedProvider === 'emola' ? 'e-Mola' : 'M-Pesa'} para completar o pagamento`,
          variant: "success"
        });

        if (onPaymentComplete) {
          onPaymentComplete(data.order.order_id);
        }
      } else {
        throw new Error('Resposta inválida do servidor');
      }

    } catch (error: any) {
      console.error('❌ Error creating payment:', error);
      toast({
        title: "Erro",
        message: error.message || "Erro ao processar pagamento",
        variant: "error"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Show reference data if already generated
  if (referenceData) {
    return (
      <Card className="border-2 border-green-500/20 bg-green-50/50">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-700">Referência Gerada!</h3>
            <p className="text-muted-foreground mt-1">
              Use os dados abaixo no app {selectedProvider === 'emola' ? 'e-Mola' : 'M-Pesa'}
            </p>
          </div>

          <div className="space-y-4 bg-white rounded-lg p-4 border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Entidade</p>
                <p className="text-2xl font-mono font-bold">{referenceData.entity}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(referenceData.entity, 'entity')}
              >
                {copiedEntity ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Referência</p>
                <p className="text-2xl font-mono font-bold">{referenceData.reference}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(referenceData.reference, 'reference')}
              >
                {copiedReference ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Valor a pagar</p>
              <p className="text-xl font-bold text-primary">{formatPrice(amount, true)}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Como pagar
            </h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Abra o app {selectedProvider === 'emola' ? 'e-Mola' : 'M-Pesa'}</li>
              <li>Selecione "Pagamento por Referência"</li>
              <li>Insira a entidade: <strong>{referenceData.entity}</strong></li>
              <li>Insira a referência: <strong>{referenceData.reference}</strong></li>
              <li>Confirme o valor e complete o pagamento</li>
            </ol>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Pedido: {referenceData.orderId} | Após o pagamento, você receberá a confirmação por email.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardContent className="p-6 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img 
              src={getPaymentMethodImage(selectedProvider)} 
              alt={selectedProvider === 'emola' ? 'e-Mola' : 'M-Pesa'} 
              className="h-10 w-auto object-contain"
            />
            <h3 className="text-lg font-semibold">
              Pagamento {selectedProvider === 'emola' ? 'e-Mola' : 'M-Pesa'}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">Moçambique</p>
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="mz-phone">Número de telefone</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0">
              <span className="text-lg">🇲🇿</span>
              <span className="ml-2 text-sm font-medium">+258</span>
            </div>
            <Input
              id="mz-phone"
              type="tel"
              placeholder={selectedProvider === 'emola' ? "84 ou 86 XXX XXXX" : "84/85/86/87 XXX XXXX"}
              value={phoneNumber.replace(/^(\+?258)?/, '')}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setPhoneNumber(value.substring(0, 9));
              }}
              className="rounded-l-none"
              maxLength={11}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedProvider === 'emola' 
              ? "Use um número 84 ou 86 associado à sua conta e-Mola"
              : "Número associado à sua conta M-Pesa"
            }
          </p>
        </div>

        {/* Amount Display */}
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Valor a pagar</p>
          <p className="text-2xl font-bold text-primary">{formatPrice(amount, true)}</p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateReference}
          disabled={isProcessing || !phoneNumber || phoneNumber.length < 9}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Gerando referência...
            </>
          ) : (
            <>
              <Smartphone className="w-5 h-5 mr-2" />
              Gerar Referência
            </>
          )}
        </Button>

        {/* Security Notice */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Pagamento seguro processado pela SISLOG. Você receberá uma notificação push no seu 
            app {selectedProvider === 'emola' ? 'e-Mola' : 'M-Pesa'} para confirmar a transação.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
