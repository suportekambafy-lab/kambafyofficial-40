
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PiggyBank, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomToast } from "@/hooks/useCustomToast";
import { useCustomerBalance } from "@/hooks/useCustomerBalance";

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  onWithdrawalSuccess?: () => void;
}

export function WithdrawalModal({ 
  open, 
  onOpenChange, 
  availableBalance, 
  onWithdrawalSuccess 
}: WithdrawalModalProps) {
  const { user } = useAuth();
  const { toast } = useCustomToast();
  const { useBalance } = useCustomerBalance();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const calculateReceiveAmount = (amount: number) => {
    // Desconta 8% da taxa da plataforma
    return amount * 0.92;
  };

  // Sempre usar o saldo disponível total
  const withdrawalValue = availableBalance;
  const receiveValue = withdrawalValue > 0 ? calculateReceiveAmount(withdrawalValue) : 0;

  const handleSubmit = async () => {
    if (!user) {
      setError("Usuário não autenticado");
      return;
    }

    // ✅ Verificar se o usuário tem IBAN configurado antes de permitir saque
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('iban, account_holder')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.iban || !profile?.account_holder) {
      setError("Para solicitar um saque, você precisa configurar seu IBAN e nome do titular da conta nas configurações do perfil");
      return;
    }

    // ✅ Verificar se o usuário tem identidade verificada
    const { data: identity, error: identityError } = await supabase
      .from('identity_verification')
      .select('status')
      .eq('user_id', user.id)
      .single();

    if (identityError || !identity || identity.status !== 'aprovado') {
      setError("Para solicitar um saque, você precisa ter sua identidade verificada e aprovada. Acesse as configurações para enviar seus documentos.");
      return;
    }

    const amount = availableBalance;
    
    if (!amount || amount <= 0) {
      setError("Não há saldo disponível para saque");
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔍 Iniciando solicitação de saque:', {
        user_id: user.id,
        amount: amount,
        receiveValue: receiveValue,
        availableBalance: availableBalance
      });

      // ✅ Criar solicitação de saque com o valor BRUTO (será descontado do saldo)
      // O trigger irá descontar automaticamente este valor do saldo disponível
      // O vendedor receberá o valor líquido (após 8%) quando aprovado
      const { data: insertData, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: amount, // Valor BRUTO que será descontado do saldo
          status: 'pendente'
        })
        .select();

      console.log('📝 Resultado da inserção:', { insertData, insertError });

      if (insertError) {
        console.error('❌ Erro ao criar solicitação de saque:', insertError);
        setError("Erro ao processar solicitação de saque: " + insertError.message);
        return;
      }

      console.log('✅ Solicitação de saque criada com sucesso:', insertData);

      toast({
        title: 'Sucesso',
        message: "Solicitação de saque criada com sucesso! Seu saldo será atualizado em instantes.",
        variant: 'success'
      });
      onOpenChange(false);
      
      // Chamar callback para atualizar dados na página pai
      if (onWithdrawalSuccess) {
        onWithdrawalSuccess();
      }
      
      // Aguardar um pouco para garantir que o trigger foi executado
      setTimeout(() => {
        if (onWithdrawalSuccess) {
          onWithdrawalSuccess();
        }
      }, 500);
      
    } catch (error) {
      console.error('💥 Erro inesperado:', error);
      setError("Erro inesperado ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Solicitar Saque
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Saldo Disponível para Saque</p>
            <p className="text-3xl font-bold text-primary mb-3">
              {availableBalance.toLocaleString()} KZ
            </p>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {withdrawalValue > 0 && (
            <div className="space-y-2">
              <Label>Valor a Receber (após taxa de 8%)</Label>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-800">
                  {receiveValue.toLocaleString()} KZ
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Valor líquido que será transferido para sua conta
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Informação:</strong> Os saques são processados em até 3 dias úteis após a solicitação.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={loading || availableBalance === 0}
            >
              {loading ? "Processando..." : "Solicitar Saque"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
