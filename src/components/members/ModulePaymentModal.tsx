import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CreditCard, Building2, Smartphone, Banknote, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Module } from '@/types/memberArea';

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
  const [paymentMethod, setPaymentMethod] = useState<'express' | 'transfer' | 'multicaixa' | 'iban'>('express');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [country, setCountry] = useState('AO');
  const [customerName, setCustomerName] = useState('');
  const [reference, setReference] = useState('');

  const paidPrice = (module as any)?.paid_price || '0';
  const moduleTitle = module?.title || '';

  const handlePayment = async () => {
    if (!module) return;

    console.log('💰 [ModulePaymentModal] Iniciando pagamento:', {
      moduleId: module.id,
      paymentMethod,
      paidPrice,
      studentEmail,
      country
    });

    setIsProcessing(true);

    try {
      // Validações comuns
      if (!customerName.trim()) {
        toast.error('Nome é obrigatório');
        setIsProcessing(false);
        return;
      }

      if (paymentMethod === 'express') {
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
      } else if (paymentMethod === 'transfer' || paymentMethod === 'multicaixa' || paymentMethod === 'iban') {
        if (!transferProof) {
          toast.error('Adicione o comprovante de pagamento');
          setIsProcessing(false);
          return;
        }

        if (paymentMethod === 'iban' && !reference.trim()) {
          toast.error('Referência é obrigatória para IBAN');
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
            paymentMethod,
            amount: parseFloat(paidPrice),
            transferProofUrl: publicUrl,
            reference: paymentMethod === 'iban' ? reference : undefined,
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
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="country">
                <SelectValue placeholder="Selecione o país" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AO">Angola</SelectItem>
                <SelectItem value="MZ">Moçambique</SelectItem>
                <SelectItem value="PT">Portugal</SelectItem>
                <SelectItem value="BR">Brasil</SelectItem>
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

          {/* Método de Pagamento */}
          <div className="space-y-3">
            <Label>Método de Pagamento</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="express" id="express" />
                <Label htmlFor="express" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Smartphone className="h-4 w-4" />
                  <span>Pagamento Expresso (AppyPay)</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="multicaixa" id="multicaixa" />
                <Label htmlFor="multicaixa" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Banknote className="h-4 w-4" />
                  <span>Multicaixa Express</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building2 className="h-4 w-4" />
                  <span>Transferência Bancária</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="iban" id="iban" />
                <Label htmlFor="iban" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4" />
                  <span>IBAN</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Campos específicos por método */}
          {paymentMethod === 'express' && (
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

          {(paymentMethod === 'transfer' || paymentMethod === 'multicaixa' || paymentMethod === 'iban') && (
            <>
              {paymentMethod === 'iban' && (
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

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handlePayment}
            className="flex-1"
            disabled={isProcessing}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
