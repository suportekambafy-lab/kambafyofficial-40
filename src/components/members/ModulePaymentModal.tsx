import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Module } from '@/types/memberArea';
import { getPaymentMethodsByCountry } from '@/utils/paymentMethods';

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
  const [reference, setReference] = useState('');

  const paidPrice = (module as any)?.paid_price || '0';
  const moduleTitle = module?.title || '';

  // Buscar métodos de pagamento baseados no país
  const availablePaymentMethods = getPaymentMethodsByCountry(country);

  const getPaymentGridClasses = () => {
    const methodCount = availablePaymentMethods.length;
    if (methodCount === 1) return "grid-cols-1";
    if (methodCount === 2) return "grid-cols-2";
    if (methodCount === 3) return "grid-cols-3";
    return "grid-cols-4";
  };

  const handlePayment = async () => {
    if (!module) return;

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
      if (selectedPaymentMethod === 'express') {
        if (!phoneNumber || phoneNumber.length < 9) {
          toast.error('Número de telefone inválido');
          setIsProcessing(false);
          return;
        }

        // Pagamento AppyPay Express
        const { data, error } = await supabase.functions.invoke('process-module-payment', {
          body: {
            moduleId: module.id,
            memberAreaId,
            studentEmail,
            customerName,
            paymentMethod: 'express',
            amount: parseFloat(paidPrice),
            phoneNumber,
            country
          }
        });

        if (error) throw error;

        if (data?.success) {
          toast.success('Pagamento processado!', {
            description: 'Seu acesso ao módulo foi liberado'
          });
          onPaymentSuccess();
          onOpenChange(false);
        } else {
          throw new Error(data?.error || 'Erro ao processar pagamento');
        }
      } else {
        // Para outros métodos, exigir comprovante
        if (!transferProof) {
          toast.error('Adicione o comprovante de pagamento');
          setIsProcessing(false);
          return;
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
            reference: reference || undefined,
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
              <span className="text-2xl font-bold">{paidPrice} KZ</span>
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

          {/* Campos específicos por método */}
          {selectedPaymentMethod === 'express' && (
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
                Digite o número sem o código do país (+244)
              </p>
            </div>
          )}

          {selectedPaymentMethod && selectedPaymentMethod !== 'express' && (
            <>
              {selectedPaymentMethod === 'reference' && (
                <div className="space-y-2">
                  <Label htmlFor="reference">Referência de Pagamento</Label>
                  <Input
                    id="reference"
                    type="text"
                    placeholder="Digite a referência"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              )}
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
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
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
              `Pagar ${paidPrice} KZ`
            )}
          </Button>

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
