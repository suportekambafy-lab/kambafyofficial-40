import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PiggyBank, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomToast } from "@/hooks/useCustomToast";
import { use2FA } from "@/hooks/use2FA";
import TwoFactorVerification from "@/components/TwoFactorVerification";
import { CURRENCY_CONFIG } from "@/hooks/useCurrencyBalances";

export const WITHDRAWAL_2FA_KEY = 'withdrawal_2fa_pending';

interface PendingWithdrawal {
  amount: number;
  roundedAmount: number;
  currency: string;
  expiresAt: number;
}

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  currency?: string;
  onWithdrawalSuccess?: () => void;
}

export function WithdrawalModal({ 
  open, 
  onOpenChange, 
  availableBalance,
  currency = 'KZ',
  onWithdrawalSuccess 
}: WithdrawalModalProps) {
  const { user } = useAuth();
  const { toast } = useCustomToast();
  const { requires2FA, logSecurityEvent } = use2FA();
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  
  // 2FA states
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  const currencyConfig = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['KZ'];
  const MINIMUM_WITHDRAWAL = currencyConfig.minimumWithdrawal;

  // Restore pending 2FA state
  useEffect(() => {
    if (open && user) {
      const stored = sessionStorage.getItem(WITHDRAWAL_2FA_KEY);
      if (stored) {
        try {
          const data: PendingWithdrawal = JSON.parse(stored);
          const timerKey = `2fa_timer_withdrawal_${user.email}`;
          const timerData = sessionStorage.getItem(timerKey);
          
          let isExpired = data.expiresAt <= Date.now();
          
          if (timerData && !isExpired) {
            try {
              const { timeLeft, timestamp } = JSON.parse(timerData);
              const elapsed = Math.floor((Date.now() - timestamp) / 1000);
              if (timeLeft - elapsed <= 0) isExpired = true;
            } catch {}
          }
          
          if (!isExpired) {
            setPendingWithdrawal(data);
            setShow2FAVerification(true);
            setWithdrawalAmount(data.roundedAmount.toFixed(2));
            setIsReturningUser(true);
          } else {
            sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);
            sessionStorage.removeItem(timerKey);
          }
        } catch {
          sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);
        }
      }
    }
  }, [open, user]);

  // Clear states when modal closes
  useEffect(() => {
    if (!open && !show2FAVerification) {
      setWithdrawalAmount("");
      setError("");
      setIsReturningUser(false);
    }
  }, [open, show2FAVerification]);

  const formatCurrencyDisplay = (amount: number): string => {
    const formatted = amount.toLocaleString(currencyConfig.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    if (currency === 'EUR') return `€${formatted}`;
    if (currency === 'USD') return `$${formatted}`;
    if (currency === 'GBP') return `£${formatted}`;
    if (currency === 'BRL') return `R$${formatted}`;
    if (currency === 'MZN') return `${formatted} MT`;
    return `${formatted} ${currencyConfig.symbol}`;
  };

  const validateAndPrepareWithdrawal = async (): Promise<{ amount: number; roundedAmount: number } | null> => {
    if (!user) {
      setError("Usuário não autenticado");
      return null;
    }

    const amount = parseFloat(withdrawalAmount);
    
    if (!withdrawalAmount || isNaN(amount) || amount <= 0) {
      setError("Digite um valor válido para saque");
      return null;
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedAvailableBalance = Math.round(availableBalance * 100) / 100;

    if (roundedAmount < MINIMUM_WITHDRAWAL) {
      setError(`O valor mínimo para saque é ${formatCurrencyDisplay(MINIMUM_WITHDRAWAL)}`);
      return null;
    }

    if (roundedAmount > roundedAvailableBalance) {
      setError(`Valor máximo disponível: ${formatCurrencyDisplay(availableBalance)}`);
      return null;
    }

    // Check payment methods
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('iban, account_holder, withdrawal_methods')
      .eq('user_id', user.id)
      .single();

    const hasIban = profile?.iban && profile?.account_holder;
    const hasWithdrawalMethods = profile?.withdrawal_methods && 
      Array.isArray(profile.withdrawal_methods) && 
      profile.withdrawal_methods.length > 0;

    if (profileError || (!hasIban && !hasWithdrawalMethods)) {
      setError("Para solicitar um saque, você precisa configurar pelo menos um método de recebimento nas configurações avançadas");
      return null;
    }

    // Check identity verification
    const { data: identity, error: identityError } = await supabase
      .from('identity_verification')
      .select('status')
      .eq('user_id', user.id)
      .single();

    if (identityError || !identity || identity.status !== 'aprovado') {
      setError("Para solicitar um saque, você precisa ter sua identidade verificada e aprovada.");
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
        currency,
        availableBalance
      });

      const { data: insertData, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: roundedAmount,
          currency: currency,
          status: 'pendente'
        })
        .select();

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

      console.log('✅ Solicitação de saque criada:', insertData);

      await logSecurityEvent('withdrawal', true);
      sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);

      toast({
        title: "Saque solicitado com sucesso!",
        message: `Seu saque de ${formatCurrencyDisplay(roundedAmount)} será processado em até 3 dias úteis.`,
      });

      setShow2FAVerification(false);
      setPendingWithdrawal(null);
      setWithdrawalAmount("");
      
      onOpenChange(false);
      onWithdrawalSuccess?.();
      
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
      const withdrawalData = await validateAndPrepareWithdrawal();
      if (!withdrawalData) {
        setLoading(false);
        return;
      }

      const needs2FA = await requires2FA('withdrawal');
      
      if (needs2FA) {
        const pendingData: PendingWithdrawal = {
          ...withdrawalData,
          currency,
          expiresAt: Date.now() + (5 * 60 * 1000)
        };
        
        sessionStorage.setItem(WITHDRAWAL_2FA_KEY, JSON.stringify(pendingData));
        setPendingWithdrawal(pendingData);
        setShow2FAVerification(true);
        setLoading(false);
      } else {
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
    sessionStorage.removeItem(WITHDRAWAL_2FA_KEY);
    setShow2FAVerification(false);
    setPendingWithdrawal(null);
    setWithdrawalAmount("");
    setError("");
  };

  // 2FA verification screen
  if (show2FAVerification && user?.email && pendingWithdrawal) {
    return (
      <Drawer open={open} onOpenChange={(isOpen) => {
        if (!isOpen) onOpenChange(false);
      }}>
        <DrawerContent className="sm:max-w-md mx-auto">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handle2FABack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Verificação de Segurança
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="p-4">
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-1">Valor do Saque</p>
              <p className="text-xl font-bold text-primary flex items-center gap-2">
                <span>{currencyConfig.flag}</span>
                {formatCurrencyDisplay(pendingWithdrawal.roundedAmount)}
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
              skipInitialSend={isReturningUser}
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
            Solicitar Saque em {currency}
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="space-y-4 p-4">
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
            <p className="text-2xl font-bold text-primary flex items-center gap-2">
              <span className="text-xl">{currencyConfig.flag}</span>
              {formatCurrencyDisplay(availableBalance)}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="withdrawal-amount" className="text-sm font-medium">
              Valor a Sacar ({currencyConfig.symbol})
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
              placeholder={`Máximo: ${formatCurrencyDisplay(availableBalance)}`}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            
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
              Saque mínimo: {formatCurrencyDisplay(MINIMUM_WITHDRAWAL)}
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
              {loading ? "Processando..." : `Sacar em ${currency}`}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
