
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReferencePaymentProps {
  productId: string;
  amount: number;
  customerData: {
    name: string;
    email: string;
    phone: string;
  };
  onSuccess: (orderId: string) => void;
  onError: (error: string) => void;
}

export function ReferencePayment({ 
  productId, 
  amount, 
  customerData, 
  onSuccess, 
  onError 
}: ReferencePaymentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [referenceData, setReferenceData] = useState<{
    reference: string;
    amount: number;
    orderId: string;
    instructions?: string;
  } | null>(null);

  const generateReference = async () => {
    setLoading(true);
    
    try {
      const orderId = `REF_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      console.log('Generating reference payment:', {
        productId,
        amount,
        customerData,
        orderId
      });

      const { data, error } = await supabase.functions.invoke('create-reference-payment', {
        body: {
          productId,
          amount,
          customerData,
          orderId
        }
      });

      if (error) {
        console.error('Reference payment error:', error);
        throw new Error(error.message || 'Erro ao gerar referência');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log('Reference generated:', data);
      
      setReferenceData({
        reference: data.reference,
        amount: data.amount,
        orderId: data.order_id,
        instructions: data.instructions
      });

      toast({
        title: "Referência gerada!",
        description: "Use a referência para efetuar o pagamento.",
      });

    } catch (error) {
      console.error('Error generating reference:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar referência';
      onError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReference = () => {
    if (referenceData?.reference) {
      navigator.clipboard.writeText(referenceData.reference);
      toast({
        title: "Copiado!",
        description: "Referência copiada para a área de transferência.",
      });
    }
  };

  const confirmPayment = () => {
    if (referenceData?.orderId) {
      onSuccess(referenceData.orderId);
    }
  };

  if (!referenceData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Pagamento por Referência</h3>
              <p className="text-gray-600 mt-2">
                Valor: <span className="font-bold">{amount.toLocaleString('pt-BR')} KZ</span>
              </p>
            </div>
            <Button 
              onClick={generateReference} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Gerando referência...' : 'Gerar Referência de Pagamento'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-green-700">Referência Gerada!</h3>
            <p className="text-gray-600 mt-2">
              Use esta referência para efetuar o pagamento
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Referência:</span>
              <Button variant="outline" size="sm" onClick={copyReference}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
            <div className="text-2xl font-bold text-center text-blue-600 font-mono">
              {referenceData.reference}
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold">
              Valor: {referenceData.amount.toLocaleString('pt-BR')} KZ
            </p>
          </div>

          {referenceData.instructions && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Instruções:</p>
                  <p>{referenceData.instructions}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Após efetuar o pagamento, clique no botão abaixo para confirmar.
            </p>
            <Button onClick={confirmPayment} className="w-full">
              Já efetuei o pagamento
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
