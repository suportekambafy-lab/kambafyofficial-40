import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AppyPayReferencePaymentProps {
  productId: string;
  customerData: {
    name: string;
    email: string;
    phone: string;
  };
  amount: number;
  orderId: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
}

export const AppyPayReferencePayment = ({
  productId,
  customerData,
  amount,
  orderId,
  onSuccess,
  onError,
  processing,
  setProcessing
}: AppyPayReferencePaymentProps) => {
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReference = async () => {
    setIsGenerating(true);
    setProcessing(true);

    try {
      console.log('🏦 Gerando referência AppyPay:', {
        productId,
        customerData,
        amount,
        orderId
      });

      console.log('🔄 Chamando função create-appypay-payment...');
      
      const { data, error } = await supabase.functions.invoke('create-appypay-payment', {
        body: {
          productId,
          customerEmail: customerData.email,
          customerName: customerData.name,
          customerPhone: customerData.phone,
          amount,
          orderId
        }
      });

      console.log('📥 Resposta da função:', { data, error });

      if (error) {
        console.error('❌ Erro ao gerar referência:', error);
        throw new Error(error.message || 'Erro ao gerar referência de pagamento');
      }

      if (!data || !data.success) {
        console.error('❌ Resposta inválida:', data);
        throw new Error(data?.error || 'Falha ao gerar referência');
      }

      console.log('✅ Referência gerada com sucesso:', data);
      
      setPaymentData(data);
      
      toast({
        title: "Referência Gerada",
        description: "Use o número de referência para completar o pagamento",
        variant: "default"
      });

    } catch (error: any) {
      console.error('❌ Erro completo:', error);
      console.error('❌ Stack trace:', error.stack);
      const errorMessage = error.message || 'Erro ao gerar referência de pagamento';
      onError(errorMessage);
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiado",
        description: "Número de referência copiado para a área de transferência",
        variant: "default"
      });
    });
  };

  const handleConfirmPayment = () => {
    if (paymentData) {
      onSuccess({
        orderId,
        referenceNumber: paymentData.referenceNumber,
        transactionId: paymentData.transactionId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: 'appypay_reference'
      });
    }
  };

  if (!paymentData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto">
              <div className="w-8 h-8 bg-blue-500 rounded"></div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Pagamento por Referência</h3>
              <p className="text-gray-600 text-sm mb-4">
                Gere uma referência para pagar em qualquer banco ou agente AppyPay em Angola
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg text-left">
              <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Clique em "Gerar Referência"</li>
                <li>• Use o número gerado em qualquer banco</li>
                <li>• O pagamento é confirmado automaticamente</li>
                <li>• Válido por 24 horas</li>
              </ul>
            </div>

            <Button 
              onClick={generateReference}
              disabled={isGenerating || processing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? "Gerando..." : "Gerar Referência"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatExpirationTime = (expiresAt: string) => {
    const expirationDate = new Date(expiresAt);
    return expirationDate.toLocaleString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-800">Referência Gerada!</h3>
            <p className="text-sm text-gray-600">Use este número para completar seu pagamento</p>
          </div>

          {/* Reference Number */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <div className="text-center space-y-3">
              <p className="text-sm font-medium text-blue-900">DADOS DO PAGAMENTO</p>
              
              {paymentData.entity && (
                <div className="mb-3">
                  <p className="text-xs text-blue-700 mb-1">ENTIDADE</p>
                  <span className="text-lg font-bold text-blue-800">{paymentData.entity}</span>
                </div>
              )}
              
              <div>
                <p className="text-xs text-blue-700 mb-1">REFERÊNCIA</p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl font-bold text-blue-800 tracking-wider">
                    {paymentData.referenceNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(paymentData.referenceNumber)}
                    className="p-2"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-blue-700">
                Valor: <span className="font-semibold">{paymentData.amount} KZ</span>
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Como pagar:</h4>
            <div className="grid gap-3">
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">1</div>
                <div>
                  <p className="font-medium text-sm">No banco ou agente</p>
                  <p className="text-xs text-gray-600">Vá a qualquer banco ou agente AppyPay</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">2</div>
                <div>
                  <p className="font-medium text-sm">Informe os dados</p>
                  <p className="text-xs text-gray-600">
                    {paymentData.entity ? `Entidade: ${paymentData.entity} | ` : ''}Referência: {paymentData.referenceNumber}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">3</div>
                <div>
                  <p className="font-medium text-sm">Confirme o pagamento</p>
                  <p className="text-xs text-gray-600">Pague {paymentData.amount} KZ e guarde o comprovativo</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expiration Warning */}
          <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-800">Válido até:</p>
              <p className="text-xs text-orange-700">{formatExpirationTime(paymentData.expiresAt)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleConfirmPayment}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Já paguei - Confirmar Pedido
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              * O pagamento será confirmado automaticamente quando processado pelo banco
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};