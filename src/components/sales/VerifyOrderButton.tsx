import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VerifyOrderButtonProps {
  orderId: string;
  paymentMethod: string;
  onVerified?: () => void;
}

export const VerifyOrderButton = ({ orderId, paymentMethod, onVerified }: VerifyOrderButtonProps) => {
  const [isVerifying, setIsVerifying] = useState(false);

  // Só mostrar para pagamentos AppyPay
  if (!['express', 'reference'].includes(paymentMethod)) {
    return null;
  }

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-appypay-order', {
        body: { orderId }
      });

      if (error) throw error;

      if (data.cannotVerify) {
        toast.info(data.message);
        return;
      }

      if (data.updated) {
        toast.success(`Status atualizado: ${data.oldStatus} → ${data.newStatus}`);
        onVerified?.();
      } else {
        toast.info('Status já está atualizado');
      }
    } catch (error: any) {
      console.error('Error verifying order:', error);
      
      // Mensagens de erro mais específicas
      if (error.message?.includes('Order not found')) {
        toast.error('Pedido não encontrado. Este pedido pode ter sido removido.');
      } else if (error.message?.includes('Transaction not found')) {
        toast.error('Transação não encontrada no AppyPay. Aguarde alguns instantes e tente novamente.');
      } else {
        toast.error(error.message || 'Erro ao verificar encomenda');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleVerify}
      disabled={isVerifying}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
      Verificar Status
    </Button>
  );
};
