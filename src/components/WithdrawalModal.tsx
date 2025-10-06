
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
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (value: string) => {
    setWithdrawalAmount(value);
    setError("");
  };

  const calculateReceiveAmount = (amount: number) => {
    // Desconta 8% da taxa da plataforma
    return amount * 0.92;
  };

  const withdrawalValue = parseFloat(withdrawalAmount) || 0;
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

    const amount = parseFloat(withdrawalAmount);
    
    if (!amount || amount <= 0) {
      setError("Por favor, insira um valor válido");
      return;
    }
    
    if (amount > availableBalance) {
      setError(`Valor excede o saldo disponível (${availableBalance.toLocaleString()} KZ)`);
      return;
    }
    
    if (availableBalance === 0) {
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

      // ✅ Primeiro deduzir o saldo TOTAL (antes do desconto)
      const balanceDeducted = await useBalance(
        amount, 
        `Saque solicitado - Valor líquido: ${receiveValue.toLocaleString()} KZ`
      );

      if (!balanceDeducted) {
        setError("Erro ao processar dedução do saldo");
        return;
      }

      console.log('✅ Saldo deduzido com sucesso:', amount);

      // ✅ Criar solicitação de saque com o valor líquido (após desconto de 8%)
      const { data: insertData, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: receiveValue, // Valor que receberá após desconto de 8%
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
        message: "Solicitação de saque criada com sucesso!",
        variant: 'success'
      });
      setWithdrawalAmount("");
      onOpenChange(false);
      
      // Chamar callback para atualizar dados na página pai
      if (onWithdrawalSuccess) {
        onWithdrawalSuccess();
      }
      
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
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Saldo Disponível</p>
            <p className="text-lg font-semibold">{availableBalance.toLocaleString()} KZ</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="withdrawal-amount">Valor do Saque</Label>
            <div className="flex gap-2">
              <Input
                id="withdrawal-amount"
                type="number"
                placeholder="0"
                value={withdrawalAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={error ? "border-red-500" : ""}
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAmountChange(availableBalance.toString())}
                disabled={loading || availableBalance === 0}
                className="whitespace-nowrap"
              >
                Saldo Total
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {withdrawalValue > 0 && (
            <div className="space-y-2">
              <Label htmlFor="receive-amount">Valor a Receber (após taxa de 8%)</Label>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-lg font-semibold text-green-800">
                  {receiveValue.toLocaleString()} KZ
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Valor líquido após desconto da taxa da plataforma
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
              disabled={loading}
            >
              {loading ? "Processando..." : "Solicitar Saque"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
