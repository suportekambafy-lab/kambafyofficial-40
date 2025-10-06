import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VerifyModulePaymentButtonProps {
  paymentId: string;
  referenceNumber?: string;
  paymentMethod: string;
  onVerified?: () => void;
}

export const VerifyModulePaymentButton = ({ 
  paymentId, 
  referenceNumber,
  paymentMethod, 
  onVerified 
}: VerifyModulePaymentButtonProps) => {
  const [isVerifying, setIsVerifying] = useState(false);

  // Só mostrar para pagamentos AppyPay (express ou reference)
  if (!['express', 'reference'].includes(paymentMethod)) {
    return null;
  }

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      console.log('[VERIFY-MODULE] Verifying payment:', { paymentId, referenceNumber });
      
      const { data, error } = await supabase.functions.invoke('verify-module-payment', {
        body: { paymentId, referenceNumber }
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
      console.error('[VERIFY-MODULE] Error:', error);
      const errorMessage = error?.message || 'Erro ao verificar pagamento';
      toast.error(errorMessage);
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
