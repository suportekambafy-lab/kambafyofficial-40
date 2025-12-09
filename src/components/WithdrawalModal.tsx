
import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PiggyBank, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomToast } from "@/hooks/useCustomToast";
import { useCustomerBalance } from "@/hooks/useCustomerBalance";
import { use2FA } from "@/hooks/use2FA";
import TwoFactorVerification from "@/components/TwoFactorVerification";

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
  const { requires2FA, logSecurityEvent } = use2FA();
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  
  // Estados para 2FA
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<{
    amount: number;
    roundedAmount: number;
  } | null>(null);

  // ✅ Saldo disponível já tem 8% descontado (seller_commission)
  // O vendedor receberá exatamente este valor escolhido quando o saque for aprovado

  // Limpar input quando o modal fechar
  useEffect(() => {
    if (!open) {
      setWithdrawalAmount("");
      setError("");
      setShow2FAVerification(false);
      setPendingWithdrawal(null);
    }
  }, [open]);

  const validateAndPrepareWithdrawal = async (): Promise<{ amount: number; roundedAmount: number } | null> => {
    if (!user) {
      setError("Usuário não autenticado");
      return null;
    }

    // Validar valor escolhido
    const amount = parseFloat(withdrawalAmount);
    
    if (!withdrawalAmount || isNaN(amount) || amount <= 0) {
      setError("Digite um valor válido para saque");
      return null;
    }

    // Arredondar ambos valores para 2 casas decimais para evitar erros de precisão
    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedAvailableBalance = Math.round(availableBalance * 100) / 100;

    if (roundedAmount > roundedAvailableBalance) {
      setError(`Valor máximo disponível: ${availableBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ`);
      return null;
    }

    // ✅ Verificar se o usuário tem IBAN configurado antes de permitir saque
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('iban, account_holder')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.iban || !profile?.account_holder) {
      setError("Para solicitar um saque, você precisa configurar seu IBAN e nome do titular da conta nas configurações do perfil");
      return null;
    }

    // ✅ Verificar se o usuário tem identidade verificada
    const { data: identity, error: identityError } = await supabase
      .from('identity_verification')
      .select('status')
      .eq('user_id', user.id)
      .single();

    if (identityError || !identity || identity.status !== 'aprovado') {
      setError("Para solicitar um saque, você precisa ter sua identidade verificada e aprovada. Acesse as configurações para enviar seus documentos.");
      return null;
    }

    return { amount, roundedAmount };
  };

  const submitWithdrawal = async (roundedAmount: number) => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('🔍 Iniciando solicitação de saque:', {
        user_id: user.id,
        amount: roundedAmount,
        availableBalance: availableBalance
      });

      // ✅ Criar solicitação de saque
      // O saldo disponível já está com 8% descontado (seller_commission)
      // O vendedor receberá exatamente este valor quando aprovado
      const { data: insertData, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: roundedAmount, // Valor arredondado para evitar erros de precisão
          status: 'pendente'
        })
        .select();

      console.log('📝 Resultado da inserção:', { insertData, insertError });

      if (insertError) {
        console.error('❌ Erro ao criar solicitação de saque:', insertError);
        
        // Verificar se é erro de validação de saldo retido
        if (insertError.message?.includes('excede o saldo disponível') || 
            insertError.message?.includes('retido até')) {
          setError(insertError.message);
        } else if (insertError.message?.includes('Saldo insuficiente')) {
          setError('Saldo insuficiente para realizar este saque.');
        } else {
          setError('Erro ao processar solicitação de saque: ' + insertError.message);
        }
        return;
      }

      console.log('✅ Solicitação de saque criada com sucesso:', insertData);

      // Registrar evento de segurança
      await logSecurityEvent('withdrawal', true);

      toast({
        title: "Saque solicitado com sucesso!",
        message: `Seu saque de ${roundedAmount.toFixed(2).replace('.', ',')} KZ será processado em até 3 dias úteis.`,
      });

      onOpenChange(false);
      
      // Chamar callback UMA VEZ para atualizar dados na página pai
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

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      // Validar dados antes de verificar 2FA
      const withdrawalData = await validateAndPrepareWithdrawal();
      if (!withdrawalData) {
        setLoading(false);
        return;
      }

      // Verificar se precisa de 2FA
      const needs2FA = await requires2FA('withdrawal');
      
      if (needs2FA) {
        // Salvar dados do saque e mostrar tela de 2FA
        setPendingWithdrawal(withdrawalData);
        setShow2FAVerification(true);
        setLoading(false);
      } else {
        // Submeter diretamente
        await submitWithdrawal(withdrawalData.roundedAmount);
      }
    } catch (error) {
      console.error('Erro ao processar saque:', error);
      setError("Erro ao processar solicitação");
      setLoading(false);
    }
  };

  const handle2FASuccess = async () => {
    if (!pendingWithdrawal) return;
    
    setShow2FAVerification(false);
    await submitWithdrawal(pendingWithdrawal.roundedAmount);
    setPendingWithdrawal(null);
  };

  const handle2FABack = () => {
    setShow2FAVerification(false);
    setPendingWithdrawal(null);
  };

  // Renderizar tela de verificação 2FA
  if (show2FAVerification && user?.email) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="sm:max-w-md mx-auto">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handle2FABack}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Verificação de Segurança
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="p-4">
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-1">Valor do Saque</p>
              <p className="text-xl font-bold text-primary">
                {pendingWithdrawal?.roundedAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ
              </p>
            </div>
            
            <TwoFactorVerification
              email={user.email}
              onVerificationSuccess={handle2FASuccess}
              onBack={handle2FABack}
              context="withdrawal"
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-md mx-auto">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Solicitar Saque
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="space-y-4 p-4">
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
            <p className="text-2xl font-bold text-primary mb-3">
              {availableBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="withdrawal-amount" className="text-sm font-medium">
              Valor a Sacar (KZ)
            </label>
            <input
              id="withdrawal-amount"
              type="number"
              min="0"
              max={availableBalance}
              step="0.01"
              value={withdrawalAmount}
              onChange={(e) => {
                setWithdrawalAmount(e.target.value);
                setError("");
              }}
              placeholder={`Máximo: ${availableBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ`}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            
            {/* Botões de atalho para valores */}
            <div className="flex gap-2 flex-wrap">
              {[25, 50, 75, 100].map((percentage) => (
                <Button
                  key={percentage}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const value = (availableBalance * percentage) / 100;
                    setWithdrawalAmount(value.toFixed(2));
                    setError("");
                  }}
                  disabled={loading}
                  className="text-xs"
                >
                  {percentage}%
                </Button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Digite o valor que deseja sacar (será descontado do seu saldo disponível)
            </p>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Informação:</strong> Os saques são processados em até 3 dias úteis após a solicitação.
            </p>
          </div>
          
          <div className="flex gap-2 pb-4">
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
              disabled={loading || availableBalance === 0 || !withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
            >
              {loading ? "Processando..." : "Solicitar Saque"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
