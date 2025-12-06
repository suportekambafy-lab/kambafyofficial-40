import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, Copy, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Module } from '@/types/memberArea';
import { getPaymentMethodsByCountry } from '@/utils/paymentMethods';
import { OptimizedStripeCardPayment } from '@/components/checkout/OptimizedCheckoutComponents';
import { useGeoLocation } from '@/hooks/useGeoLocation';

interface ModulePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: Module | null;
  memberAreaId: string;
  studentEmail: string;
  onPaymentSuccess: () => void;
}

export function ModulePaymentModal({
  open,
  onOpenChange,
  module,
  memberAreaId,
  studentEmail,
  onPaymentSuccess
}: ModulePaymentModalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [country, setCountry] = useState('AO');
  const [customerName, setCustomerName] = useState('');
  const [referenceData, setReferenceData] = useState<any>(null);
  const [copiedReference, setCopiedReference] = useState(false);
  const [accountHolder, setAccountHolder] = useState('');
  const [accountIban, setAccountIban] = useState('');
  const { userCountry, formatPrice, convertPrice, supportedCountries } = useGeoLocation();

  const paidPrice = (module as any)?.paid_price || '0';
  const moduleTitle = module?.title || '';
  
  // Calcular preço e moeda baseado no país
  const getDisplayPriceAndCurrency = () => {
    const basePrice = parseFloat(paidPrice?.replace(/[^0-9,]/g, '').replace(',', '.') || '0');
    const targetCountry = supportedCountries[country as keyof typeof supportedCountries];
    
    if (country === 'PT') {
      const eurPrice = convertPrice(basePrice, targetCountry);
      return {
        displayPrice: formatPrice(basePrice, targetCountry),
        currency: 'EUR',
        amount: eurPrice
      };
    }
    
    if (country === 'MZ') {
      const mznPrice = convertPrice(basePrice, targetCountry);
      return {
        displayPrice: formatPrice(basePrice, targetCountry),
        currency: 'MZN',
        amount: mznPrice
      };
    }
    
    return {
      displayPrice: `${paidPrice} KZ`,
      currency: 'AOA',
      amount: basePrice
    };
  };
  
  const { displayPrice, currency, amount } = getDisplayPriceAndCurrency();

  // Dados bancários da Kambafy
  const BANK_DATA = {
    name: 'BCI - Banco Comercial e de Investimentos',
    iban: '0005 0000 09802546101 15',
    accountNumber: '10980254610001',
    accountHolder: 'KAMBAFY COMERCIO E SERVICOS LDA',
    logo: '/lovable-uploads/451d9e0e-6608-409a-910a-ec955cb5223c.png'
  };

  // Buscar métodos de pagamento baseados no país
  const availablePaymentMethods = useMemo(() => {
    const methods = getPaymentMethodsByCountry(country);
    
    // Se for Portugal, adicionar métodos Stripe
    if (country === 'PT') {
      const stripeMethods = [
        { id: 'card', name: 'Cartão de Crédito/Débito', enabled: true, isPortugal: true },
        { id: 'klarna', name: 'Klarna', enabled: true, isPortugal: true },
        { id: 'multibanco', name: 'Multibanco', enabled: true, isPortugal: true },
        { id: 'mbway', name: 'MB Way', enabled: true, isPortugal: true }
      ];
      
      // Adicionar métodos Stripe se ainda não existirem
      stripeMethods.forEach(stripeMethod => {
        if (!methods.find(m => m.id === stripeMethod.id)) {
          methods.push(stripeMethod);
        }
      });
    }
    
    return methods;
  }, [country]);

  const getPaymentGridClasses = () => {
    const methodCount = availablePaymentMethods.length;
    if (methodCount === 1) return "grid-cols-1";
    if (methodCount === 2) return "grid-cols-2";
    if (methodCount === 3) return "grid-cols-3";
    return "grid-cols-4";
  };

  const copyReferenceNumber = () => {
    if (referenceData?.reference_number) {
      navigator.clipboard.writeText(referenceData.reference_number);
      setCopiedReference(true);
      toast.success('Referência copiada!');
      setTimeout(() => setCopiedReference(false), 2000);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleCardPaymentSuccess = async (orderId: string) => {
    console.log('✅ Stripe payment successful for module:', orderId);
    
    toast.success('Pagamento realizado!', {
      description: 'Seu pagamento foi confirmado. Você já tem acesso ao módulo.'
    });
    
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
    onOpenChange(false);
  };

  const handleCardPaymentError = (error: string) => {
    console.error('❌ Stripe payment error:', error);
    toast.error('Erro no pagamento', {
      description: error || 'Ocorreu um erro ao processar seu pagamento'
    });
    setIsProcessing(false);
  };

  const handlePayment = async () => {
    if (!module) return;

    // Para métodos Stripe, não processar aqui - o componente StripeCardPayment cuidará disso
    if (['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk'].includes(selectedPaymentMethod)) {
      console.log('⏳ Stripe payment will be handled by StripeCardPayment component');
      return;
    }

    console.log('💰 [ModulePaymentModal] Iniciando pagamento:', {
      moduleId: module.id,
      paymentMethod: selectedPaymentMethod,
      paidPrice,
      studentEmail,
      country
    });

    // Validações
    if (!customerName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error('Selecione um método de pagamento');
      return;
    }

    setIsProcessing(true);

    try {
      // Express e Reference usam AppyPay (geram automaticamente)
      if (selectedPaymentMethod === 'express' || selectedPaymentMethod === 'reference') {
        // Validar telefone
        const phone = selectedPaymentMethod === 'express' ? phoneNumber : phoneNumber;
        if (!phone || phone.length < 9) {
          toast.error('Número de telefone inválido');
          setIsProcessing(false);
          return;
        }

        // Chamar AppyPay via edge function
        const { data, error } = await supabase.functions.invoke('process-module-payment', {
          body: {
            moduleId: module.id,
            memberAreaId,
            studentEmail,
            customerName,
            paymentMethod: selectedPaymentMethod,
            amount: parseFloat(paidPrice),
            phoneNumber: phone,
            country
          }
        });

        if (error) throw error;

        if (data?.success) {
          // Se for pagamento por referência, exibir a referência gerada
          if (selectedPaymentMethod === 'reference' && data.reference_number) {
            setReferenceData(data);
            toast.success('Referência gerada com sucesso!', {
              description: `Referência: ${data.reference_number}`
            });
          } else if (selectedPaymentMethod === 'express') {
            toast.success('Pagamento processado!', {
              description: 'Seu acesso ao módulo foi liberado'
            });
            onPaymentSuccess();
            onOpenChange(false);
          }
        } else {
          throw new Error(data?.error || 'Erro ao processar pagamento');
        }
      } else {
        // Outros métodos exigem comprovante
        if (!transferProof) {
          toast.error('Adicione o comprovante de pagamento');
          setIsProcessing(false);
          return;
        }

        // Para transferência, validar dados do titular
        if (selectedPaymentMethod === 'transfer') {
          if (!accountHolder.trim()) {
            toast.error('Nome do titular é obrigatório');
            setIsProcessing(false);
            return;
          }
          if (!accountIban.trim()) {
            toast.error('IBAN do titular é obrigatório');
            setIsProcessing(false);
            return;
          }
        }

        // Upload do comprovante
        const fileExt = transferProof.name.split('.').pop();
        const fileName = `${memberAreaId}/${module.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, transferProof);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        // Registrar pagamento pendente
        const { data, error } = await supabase.functions.invoke('process-module-payment', {
          body: {
            moduleId: module.id,
            memberAreaId,
            studentEmail,
            customerName,
            paymentMethod: selectedPaymentMethod,
            amount: parseFloat(paidPrice),
            transferProofUrl: publicUrl,
            accountHolder: selectedPaymentMethod === 'transfer' ? accountHolder : undefined,
            accountIban: selectedPaymentMethod === 'transfer' ? accountIban : undefined,
            country
          }
        });

        if (error) throw error;

        toast.info('Pagamento em análise', {
          description: 'Seu comprovante foi enviado e está sendo analisado'
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('❌ [ModulePaymentModal] Erro:', error);
      toast.error('Erro ao processar pagamento', {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Se temos dados de referência, mostrar a tela de pagamento por referência
  if (referenceData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento por Referência</DialogTitle>
            <DialogDescription>
              Utilize a referência abaixo para efetuar o pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Referência Multicaixa</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{referenceData.reference_number}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyReferenceNumber}
                >
                  {copiedReference ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {referenceData.entity && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Entidade</p>
                <p className="font-medium">{referenceData.entity}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Valor a Pagar</p>
              <p className="text-lg font-bold">{displayPrice}</p>
            </div>

            {referenceData.due_date && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Validade</p>
                <p className="font-medium">{new Date(referenceData.due_date).toLocaleDateString()}</p>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Após efetuar o pagamento, seu acesso será liberado automaticamente.
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              onPaymentSuccess();
              onOpenChange(false);
            }}
            className="w-full"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adquirir Módulo</DialogTitle>
          <DialogDescription>
            Complete o pagamento para desbloquear o módulo "{moduleTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preço */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor</span>
              <span className="text-2xl font-bold">{displayPrice}</span>
            </div>
          </div>

          {/* País */}
          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Select value={country} onValueChange={(value) => {
              setCountry(value);
              setSelectedPaymentMethod(''); // Resetar método ao trocar país
            }}>
              <SelectTrigger id="country">
                <SelectValue placeholder="Selecione o país" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AO">🇦🇴 Angola</SelectItem>
                <SelectItem value="MZ">🇲🇿 Moçambique</SelectItem>
                <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nome do Cliente */}
          <div className="space-y-2">
            <Label htmlFor="customer-name">Nome Completo</Label>
            <Input
              id="customer-name"
              type="text"
              placeholder="Seu nome completo"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          {/* Telefone (para Express e Reference) */}
          {(selectedPaymentMethod === 'express' || selectedPaymentMethod === 'reference' || !selectedPaymentMethod) && (
            <div className="space-y-2">
              <Label htmlFor="phone">Número de Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="923000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={9}
              />
              <p className="text-xs text-muted-foreground">
                Digite o número sem o código do país
              </p>
            </div>
          )}

          {/* Métodos de Pagamento */}
          <div className="space-y-3">
            <Label>Método de Pagamento</Label>
            <div className={`grid ${getPaymentGridClasses()} gap-3`}>
              {availablePaymentMethods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedPaymentMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={method.image}
                      alt={method.name}
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-sm font-medium text-center">
                      {method.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dados Bancários para Transferência */}
          {selectedPaymentMethod === 'transfer' && (
            <div className="space-y-4">
              <Alert className="border-primary/20 bg-primary/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Realize a transferência para a conta bancária abaixo.
                </AlertDescription>
              </Alert>

              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    {BANK_DATA.logo && (
                      <img 
                        src={BANK_DATA.logo} 
                        alt={BANK_DATA.name}
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <h4 className="font-semibold text-sm">DADOS BANCÁRIOS PARA PAGAMENTO</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-muted-foreground">IBAN:</span>
                        <div className="text-sm font-mono font-semibold">{BANK_DATA.iban}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(BANK_DATA.iban, 'IBAN')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-muted-foreground">NÚMERO DA CONTA:</span>
                        <div className="text-sm font-mono font-semibold">{BANK_DATA.accountNumber}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(BANK_DATA.accountNumber, 'Número da conta')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-muted-foreground">TITULAR DA CONTA:</span>
                        <div className="text-sm font-semibold">{BANK_DATA.accountHolder}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(BANK_DATA.accountHolder, 'Titular')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="account-holder">Titular da Conta (Quem Transfere)</Label>
                <Input
                  id="account-holder"
                  type="text"
                  placeholder="Nome completo do titular"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-iban">IBAN do Titular</Label>
                <Input
                  id="account-iban"
                  type="text"
                  placeholder="0000 0000 00000000000 00"
                  value={accountIban}
                  onChange={(e) => setAccountIban(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof">Comprovante de Pagamento</Label>
                <Input
                  id="proof"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setTransferProof(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Após realizar o pagamento, envie o comprovante
                </p>
              </div>
            </div>
          )}

          {/* Comprovante para outros métodos que não são Express/Reference/Transfer */}
          {selectedPaymentMethod && selectedPaymentMethod !== 'express' && selectedPaymentMethod !== 'reference' && selectedPaymentMethod !== 'transfer' && !['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk'].includes(selectedPaymentMethod) && (
            <div className="space-y-2">
              <Label htmlFor="proof">Comprovante de Pagamento</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setTransferProof(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Após realizar o pagamento, envie o comprovante
              </p>
            </div>
          )}

          {/* Stripe Payment Methods */}
          {['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk'].includes(selectedPaymentMethod) && (
            <div className="mt-4">
              <OptimizedStripeCardPayment
                amount={amount}
                currency={currency}
                productId={(module as any)?.paid_product_id || module?.id || ''}
                customerData={{
                  name: customerName,
                  email: studentEmail,
                  phone: phoneNumber
                }}
                paymentMethod={selectedPaymentMethod}
                onSuccess={handleCardPaymentSuccess}
                onError={handleCardPaymentError}
                processing={isProcessing}
                setProcessing={setIsProcessing}
                displayPrice={displayPrice}
                convertedAmount={amount}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!['card', 'klarna', 'multibanco', 'mbway', 'card_uk', 'klarna_uk'].includes(selectedPaymentMethod) && (
            <Button
              onClick={handlePayment}
              className="w-full h-12 text-lg font-semibold"
              disabled={isProcessing || !customerName || !selectedPaymentMethod}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                `Pagar ${displayPrice}`
              )}
            </Button>
          )}

          <div className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">Pagamento 100% seguro</span>
          </div>

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
