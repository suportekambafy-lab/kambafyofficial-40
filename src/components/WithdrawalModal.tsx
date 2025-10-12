
import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
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
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");

  // ✅ Saldo disponível já tem 8% descontado (seller_commission)
  // O vendedor receberá exatamente este valor escolhido quando o saque for aprovado

  // Limpar input quando o modal fechar
  useEffect(() => {
    if (!open) {
      setWithdrawalAmount("");
      setError("");
    }
  }, [open]);

  // 🚨 SISTEMA DE SAQUES TEMPORARIAMENTE EM MANUTENÇÃO
  const WITHDRAWALS_MAINTENANCE = true;

  const handleSubmit = async () => {
    if (WITHDRAWALS_MAINTENANCE) {
      setError("Sistema de saques temporariamente em manutenção. Por favor, tente novamente em breve.");
      return;
    }

    if (!user) {
      setError("Usuário não autenticado");
      return;
    }

    // Validar valor escolhido
    const amount = parseFloat(withdrawalAmount);
    
    if (!withdrawalAmount || isNaN(amount) || amount <= 0) {
      setError("Digite um valor válido para saque");
      return;
    }

    if (amount > availableBalance) {
      setError(`Valor máximo disponível: ${availableBalance.toLocaleString()} KZ`);
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

    try {
      setLoading(true);
      
      console.log('🔍 Iniciando solicitação de saque:', {
        user_id: user.id,
        amount: amount,
        availableBalance: availableBalance
      });

      // ✅ Criar solicitação de saque
      // O saldo disponível já está com 8% descontado (seller_commission)
      // O vendedor receberá exatamente este valor quando aprovado
      const { data: insertData, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: amount, // Valor exato que será transferido (já tem 8% descontado)
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
          {/* 🚨 AVISO DE MANUTENÇÃO */}
          <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 mb-2">Sistema de Saques em Manutenção</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Estamos realizando uma manutenção programada no sistema de saques para melhorar a segurança e precisão dos cálculos. 
                  <strong className="block mt-2">Fique tranquilo: seu saldo está seguro e protegido.</strong>
                </p>
                <p className="text-sm text-amber-800 mt-2">
                  Os saques serão liberados em breve. Agradecemos pela compreensão! 🙏
                </p>
              </div>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg opacity-60">
            <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
            <p className="text-2xl font-bold text-primary mb-3">
              {availableBalance.toLocaleString()} KZ
            </p>
          </div>

          <div className="space-y-2 opacity-60">
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
              placeholder={`Máximo: ${availableBalance.toLocaleString()} KZ`}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={true}
            />
            
            {/* Botões de atalho para valores */}
            <div className="flex gap-2 flex-wrap opacity-60">
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
                  disabled={true}
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
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Informação:</strong> Os saques são processados em até 3 dias úteis após a solicitação.
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
              disabled={true}
            >
              Sistema em Manutenção
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
