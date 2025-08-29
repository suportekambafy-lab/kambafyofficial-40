import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';

interface AppyPayPaymentFormProps {
  productId: string;
  amount: string;
  orderId: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export const AppyPayPaymentForm: React.FC<AppyPayPaymentFormProps> = ({
  productId,
  amount,
  orderId,
  onSuccess,
  onError
}) => {
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [referenceData, setReferenceData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleCreateReference = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerData.name || !customerData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome e email.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-appypay-reference', {
        body: {
          productId,
          customerEmail: customerData.email,
          customerName: customerData.name,
          customerPhone: customerData.phone,
          amount,
          orderId
        }
      });

      if (error) throw error;

      if (data.success) {
        setReferenceData(data.data);
        toast({
          title: "Referência criada com sucesso",
          description: "Use a referência abaixo para fazer o pagamento."
        });
      } else {
        throw new Error(data.error || 'Erro ao criar referência');
      }

    } catch (error: any) {
      console.error('Error creating AppyPay reference:', error);
      const errorMessage = error.message || 'Erro ao criar referência de pagamento';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!referenceData) return;

    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-appypay-payment', {
        body: {
          referencePaymentId: referenceData.reference_payment_id
        }
      });

      if (error) throw error;

      if (data.success) {
        if (data.data.status === 'paid') {
          toast({
            title: "Pagamento confirmado!",
            description: "Seu pagamento foi processado com sucesso."
          });
          onSuccess?.(data.data);
        } else {
          toast({
            title: "Pagamento pendente",
            description: "O pagamento ainda não foi confirmado. Tente novamente em alguns minutos."
          });
        }
      } else {
        throw new Error(data.error || 'Erro ao verificar pagamento');
      }

    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Erro",
        description: error.message || 'Erro ao verificar pagamento',
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Referência copiada para a área de transferência."
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (referenceData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Referência Criada
          </CardTitle>
          <CardDescription>
            Use a referência abaixo para fazer o pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Referência de Pagamento</Label>
            <div className="flex items-center gap-2">
              <Input
                value={referenceData.reference_number}
                readOnly
                className="font-mono text-lg text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referenceData.reference_number)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Valor</Label>
            <Input
              value={`${referenceData.amount} ${referenceData.currency}`}
              readOnly
              className="text-center"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Expira em</Label>
            <Input
              value={new Date(referenceData.expires_at).toLocaleString('pt-AO')}
              readOnly
              className="text-center text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Como pagar:</p>
                <p>{referenceData.payment_instructions}</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleVerifyPayment}
            disabled={verifying}
            className="w-full"
          >
            {verifying ? (
              <>
                <LoadingSpinner className="mr-2" />
                Verificando pagamento...
              </>
            ) : (
              'Verificar Pagamento'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Pagamento por Referência</CardTitle>
        <CardDescription>
          Preencha os dados para gerar uma referência de pagamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateReference} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              type="text"
              value={customerData.name}
              onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={customerData.email}
              onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
              placeholder="Digite seu email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={customerData.phone}
              onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
              placeholder="Digite seu telefone (opcional)"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Criando referência...
              </>
            ) : (
              'Gerar Referência de Pagamento'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};