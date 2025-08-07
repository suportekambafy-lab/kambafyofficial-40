import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Edit, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TwoFactorVerification from "./TwoFactorVerification";
import { use2FA } from "@/hooks/use2FA";

export function BankingInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, requires2FA, logSecurityEvent } = use2FA();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'viewing' | 'requesting_2fa' | 'editing'>('viewing');
  const [showFullIban, setShowFullIban] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    iban: "",
    account_holder: "",
  });
  const [editingBankDetails, setEditingBankDetails] = useState({
    iban: "",
    account_holder: "",
  });

  // Debug logs
  console.log('🏦 BankingInfo render - currentStep:', currentStep);
  console.log('🏦 BankingInfo render - settings:', settings);

  useEffect(() => {
    if (user) {
      loadBankDetails();
      // Verificar se há uma sessão 2FA ativa para alteração de IBAN (sem enviar código automaticamente)
      const stored2FASession = sessionStorage.getItem('banking_2fa_session');
      if (stored2FASession && !sessionRestored) {
        const sessionData = JSON.parse(stored2FASession);
        if (sessionData.userId === user.id && sessionData.action === 'bank_details_change') {
          const sessionAge = Date.now() - sessionData.timestamp;
          // Se a sessão tem menos de 10 minutos, restaurar o estado
          if (sessionAge < 10 * 60 * 1000) {
            console.log('🔒 Restaurando sessão 2FA para alteração de IBAN (sem enviar código)');
            setCurrentStep('requesting_2fa');
            setSessionRestored(true);
            // Restaurar dados de edição se existirem
            if (sessionData.editingData) {
              setEditingBankDetails(sessionData.editingData);
            }
          } else {
            // Sessão expirada, limpar
            sessionStorage.removeItem('banking_2fa_session');
          }
        }
      }
    }
  }, [user, sessionRestored]);

  const loadBankDetails = async () => {
    if (!user) return;

    try {
      setInitialLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('iban, account_holder')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading bank details:', error);
        return;
      }

      if (data) {
        setBankDetails({
          iban: data.iban || "",
          account_holder: data.account_holder || "",
        });
      }
    } catch (error) {
      console.error('Error loading bank details:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const updateBankDetails = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let result;
      
      if (existingProfile) {
        result = await supabase
          .from('profiles')
          .update({
            iban: editingBankDetails.iban,
            account_holder: editingBankDetails.account_holder,
          })
          .eq('user_id', user.id);
      } else {
        result = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            iban: editingBankDetails.iban,
            account_holder: editingBankDetails.account_holder,
          });
      }

      if (result.error) {
        console.error('Error updating bank details:', result.error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar dados bancários: " + result.error.message,
          variant: "destructive"
        });
      } else {
        setBankDetails(editingBankDetails);
        setCurrentStep('viewing');
        // Limpar sessão 2FA após sucesso
        sessionStorage.removeItem('banking_2fa_session');
        setSessionRestored(false);
        await logSecurityEvent('bank_details_change', true);
        toast({
          title: "IBAN atualizado",
          description: "Seus dados bancários foram salvos com sucesso!"
        });
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar dados bancários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🏦 handleEditClick - iniciando alteração');
    
    if (!user?.email) return;

    // Preparar dados para edição
    setEditingBankDetails(bankDetails);

    // Verificar se precisa de 2FA
    if (settings?.enabled) {
      const needs2FA = await requires2FA('bank_details_change');
      console.log('🔒 Precisa de 2FA para dados bancários:', needs2FA);
      
      if (needs2FA) {
        console.log('🔒 Mudando para requesting_2fa');
        // Armazenar sessão 2FA no sessionStorage
        const sessionData = {
          userId: user.id,
          action: 'bank_details_change',
          timestamp: Date.now(),
          editingData: bankDetails
        };
        sessionStorage.setItem('banking_2fa_session', JSON.stringify(sessionData));
        setCurrentStep('requesting_2fa');
        setSessionRestored(false); // Reset para permitir envio de código
        return;
      }
    }

    // Se não precisa de 2FA, ir direto para edição
    console.log('✅ Indo direto para edição');
    setCurrentStep('editing');
  };

  const handle2FASuccess = () => {
    console.log('✅ 2FA verificado - permitindo edição de dados bancários');
    // Limpar sessão 2FA
    sessionStorage.removeItem('banking_2fa_session');
    setSessionRestored(false);
    setCurrentStep('editing');
  };

  const handle2FACancel = () => {
    console.log('❌ 2FA cancelado');
    // Limpar sessão 2FA
    sessionStorage.removeItem('banking_2fa_session');
    setSessionRestored(false);
    setCurrentStep('viewing');
    setEditingBankDetails({ iban: "", account_holder: "" });
  };

  const handleCancelEdit = () => {
    console.log('❌ Cancelando edição');
    setCurrentStep('viewing');
    setEditingBankDetails({ iban: "", account_holder: "" });
  };

  const maskIban = (iban: string) => {
    if (!iban || iban.length < 8) return iban;
    const lastFour = iban.slice(-4);
    return `${'*'.repeat(iban.length - 4)}${lastFour}`;
  };

  const hasIban = bankDetails.iban && bankDetails.account_holder;

  // Se está mostrando verificação 2FA
  if (currentStep === 'requesting_2fa' && user?.email) {
    console.log('🔒 Renderizando TwoFactorVerification');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            Alterar Dados Bancários - Verificação Necessária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TwoFactorVerification
            email={user.email}
            context="bank_details_change"
            onVerificationSuccess={handle2FASuccess}
            onBack={handle2FACancel}
            skipInitialSend={sessionRestored}
          />
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'editing') {
    console.log('✏️ Renderizando formulário de edição');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            Alterar Informações Bancárias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account_holder" className="text-sm">Nome do Titular</Label>
            <Input
              id="account_holder"
              placeholder="Nome completo do titular da conta"
              value={editingBankDetails.account_holder}
              onChange={(e) => setEditingBankDetails(prev => ({ ...prev, account_holder: e.target.value }))}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban" className="text-sm">IBAN (insira sem AO06)</Label>
            <Input
              id="iban"
              placeholder="0000 0000 0000 0000 0000 0000 0"
              value={editingBankDetails.iban}
              onChange={(e) => setEditingBankDetails(prev => ({ ...prev, iban: e.target.value }))}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              disabled={loading || !editingBankDetails.iban || !editingBankDetails.account_holder} 
              className="flex-1 text-sm"
              onClick={updateBankDetails}
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleCancelEdit}
              disabled={loading}
              className="text-sm"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('👀 Renderizando visualização');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
          Informações Bancárias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {initialLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : hasIban ? (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium text-green-800">IBAN adicionado</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs sm:text-sm break-all text-muted-foreground">
                      AO06 {showFullIban ? bankDetails.iban : maskIban(bankDetails.iban)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullIban(!showFullIban)}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      {showFullIban ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-xs text-green-600 break-words">Titular: {bankDetails.account_holder}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditClick}
                  className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto flex-shrink-0"
                >
                  <Edit className="h-3 w-3 flex-shrink-0" />
                  <span>Alterar IBAN</span>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Para alterar suas informações bancárias, será necessário verificação de segurança.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-xs sm:text-sm">
                Configure seu IBAN para receber pagamentos diretamente em sua conta bancária.
              </p>
            </div>
            <Button onClick={handleEditClick} className="w-full text-sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Adicionar IBAN
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
