
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

export const WITHDRAWAL_2FA_KEY = 'withdrawal_2fa_pending';

interface PendingWithdrawal {
  amount: number;
  roundedAmount: number;
  expiresAt: number; // timestamp
}

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
  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false); // Usuário está voltando após sair da página

  // ✅ Restaurar estado de 2FA pendente do sessionStorage quando o modal abre
  useEffect(() => {
    if (open && user) {
      const stored = sessionStorage.getItem(WITHDRAWAL_2FA_KEY);
      if (stored) {
        try {
          const data: PendingWithdrawal = JSON.parse(stored);
          
          // Verificar se ainda não expirou
          // Também verificar o timer do TwoFactorVerification
          const timerKey = `2fa_timer_withdrawal_${user.email}`;
          const timerData = sessionStorage.getItem(timerKey);
          
          let isExpired = data.expiresAt <= Date.now();
          
          // Se o timer do 2FA também expirou, considerar expirado
          if (timerData) {
            try {
              const { timeLeft, timestamp } = JSON.parse(timerData);
              const elapsed = Math.floor((Date.now() - timestamp) / 1000);
              const remaining = timeLeft - elapsed;
              if (remaining <= 0) {
                isExpired = true;
              }
            } catch {}
          }
          
          if (!isExpired) {
            setPendingWithdrawal(data);
            setShow2FAVerification(true);
            setWithdrawalAmount(data.roundedAmount.toFixed(2));
            setIsReturningUser(true); // Marcar que está voltando - NÃO pular envio de código
          } else {
            // Expirado, limpar tudo
            sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);
            sessionStorage.removeItem(timerKey);
          }
        } catch {
          sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);
        }
      }
    }
  }, [open, user]);

  // Limpar estados quando o modal fechar (mas NÃO limpar sessionStorage se tiver 2FA pendente)
  useEffect(() => {
    if (!open && !show2FAVerification) {
      setWithdrawalAmount("");
      setError("");
      setIsReturningUser(false);
    }
  }, [open, show2FAVerification]);

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
      const { data: insertData, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: roundedAmount,
          status: 'pendente'
        })
        .select();

      console.log('📝 Resultado da inserção:', { insertData, insertError });

      if (insertError) {
        console.error('❌ Erro ao criar solicitação de saque:', insertError);
        
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

      // ✅ Limpar sessionStorage após sucesso
      sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);

      toast({
        title: "Saque solicitado com sucesso!",
        message: `Seu saque de ${roundedAmount.toFixed(2).replace('.', ',')} KZ será processado em até 3 dias úteis.`,
      });

      // Limpar estados
      setShow2FAVerification(false);
      setPendingWithdrawal(null);
      setWithdrawalAmount("");
      
      onOpenChange(false);
      
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
        // Salvar dados do saque no sessionStorage com expiração de 5 minutos
        const pendingData: PendingWithdrawal = {
          ...withdrawalData,
          expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutos
        };
        
        sessionStorage.setItem(WITHDRAWAL_2FA_KEY, JSON.stringify(pendingData));
        setPendingWithdrawal(pendingData);
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
  };

  const handle2FABack = () => {
    // Limpar tudo ao cancelar
    sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);
    setShow2FAVerification(false);
    setPendingWithdrawal(null);
    setWithdrawalAmount("");
    setError("");
  };

  // Renderizar tela de verificação 2FA
  if (show2FAVerification && user?.email && pendingWithdrawal) {
    return (
      <Drawer open={open} onOpenChange={(isOpen) => {
        // Permitir fechar o drawer, mas manter o estado no sessionStorage
        if (!isOpen) {
          // Não limpa o sessionStorage, assim o usuário pode voltar
          onOpenChange(false);
        }
      }}>
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
                {pendingWithdrawal.roundedAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Dica:</strong> Você pode sair desta página para verificar seu email. O código permanecerá válido por 5 minutos.
              </p>
            </div>
            
            <TwoFactorVerification
              email={user.email}
              onVerificationSuccess={handle2FASuccess}
              onBack={handle2FABack}
              context="withdrawal"
              skipInitialSend={false}
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
