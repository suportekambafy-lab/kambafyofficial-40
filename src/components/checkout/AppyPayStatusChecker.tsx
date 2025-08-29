import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

type PaymentStatus = 'checking' | 'pending' | 'paid' | 'error';

interface AppyPayStatusCheckerProps {
  referencePaymentId: string;
  onPaymentConfirmed?: (data: any) => void;
  autoCheck?: boolean;
  checkInterval?: number; // em segundos
}

export const AppyPayStatusChecker: React.FC<AppyPayStatusCheckerProps> = ({
  referencePaymentId,
  onPaymentConfirmed,
  autoCheck = true,
  checkInterval = 30
}) => {
  const [status, setStatus] = useState<PaymentStatus>('checking');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const { toast } = useToast();

  const checkPaymentStatus = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-appypay-payment', {
        body: { referencePaymentId }
      });

      if (error) throw error;

      if (data.success) {
        setPaymentData(data.data);
        setLastCheck(new Date());

        if (data.data.status === 'paid') {
          setStatus('paid');
          toast({
            title: "Pagamento confirmado!",
            description: "Seu pagamento foi processado com sucesso."
          });
          onPaymentConfirmed?.(data.data);
        } else {
          setStatus('pending');
        }
      } else {
        throw new Error(data.error || 'Erro ao verificar pagamento');
      }

    } catch (error: any) {
      console.error('Error checking payment status:', error);
      setStatus('error');
      toast({
        title: "Erro ao verificar pagamento",
        description: error.message || 'Tente novamente em alguns minutos',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-check quando habilitado
  useEffect(() => {
    if (!autoCheck) return;

    // Check inicial
    checkPaymentStatus();

    // Configurar intervalo apenas se não for pago
    const interval = setInterval(() => {
      checkPaymentStatus();
    }, checkInterval * 1000);

    return () => clearInterval(interval);
  }, [autoCheck, checkInterval, referencePaymentId]);

  // Parar o auto-check quando o pagamento for confirmado
  useEffect(() => {
    if (status === 'paid') {
      // O próximo useEffect não vai executar mais porque status mudou
    }
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <LoadingSpinner className="h-5 w-5" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'paid':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Verificando pagamento...';
      case 'pending':
        return 'Aguardando pagamento';
      case 'paid':
        return 'Pagamento confirmado';
      case 'error':
        return 'Erro na verificação';
      default:
        return 'Status desconhecido';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'bg-blue-50 border-blue-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'paid':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${getStatusColor()}`}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {getStatusIcon()}
          Status do Pagamento
        </CardTitle>
        <CardDescription>
          {getStatusText()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {paymentData && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referência:</span>
              <span className="font-mono">{paymentData.reference_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span>{paymentData.amount} KZ</span>
            </div>
            {paymentData.paid_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pago em:</span>
                <span>{new Date(paymentData.paid_at).toLocaleString('pt-AO')}</span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Última verificação: {lastCheck.toLocaleTimeString('pt-AO')}
        </div>

        {status === 'pending' && (
          <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Aguardando pagamento</p>
              <p>O sistema verificará automaticamente a cada {checkInterval} segundos.</p>
            </div>
          </div>
        )}

        {status === 'paid' && (
          <div className="bg-green-100 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Pagamento confirmado!</p>
              <p>Seu pedido foi processado com sucesso.</p>
            </div>
          </div>
        )}

        <Button
          onClick={checkPaymentStatus}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? (
            <>
              <LoadingSpinner className="mr-2" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar novamente
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};