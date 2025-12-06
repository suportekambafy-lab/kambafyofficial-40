import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Edit, Eye, EyeOff, Plus, Trash2, Building, Wallet, Bitcoin, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TwoFactorVerification from "./TwoFactorVerification";
import { use2FA } from "@/hooks/use2FA";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface WithdrawalMethod {
  id: string;
  type: string;
  label: string;
  details: Record<string, string>;
}

const WITHDRAWAL_METHOD_TYPES = [
  { 
    id: "angola_bank", 
    label: "Banco Angola", 
    flag: "🇦🇴",
    icon: Building,
    fields: [
      { key: "bank_name", label: "Nome do Banco", placeholder: "Ex: BFA, BAI, BIC" },
      { key: "account_number", label: "Número da Conta", placeholder: "Número da conta bancária" },
      { key: "iban", label: "IBAN", placeholder: "AO06 0000 0000 0000 0000 0000 0" },
      { key: "account_holder", label: "Nome do Titular", placeholder: "Nome completo" },
    ]
  },
  { 
    id: "portugal_iban", 
    label: "IBAN Portugal", 
    flag: "🇵🇹",
    icon: Building,
    fields: [
      { key: "iban", label: "IBAN", placeholder: "PT50 0000 0000 0000 0000 0000 0" },
      { key: "account_holder", label: "Nome do Titular", placeholder: "Nome completo" },
      { key: "bank_name", label: "Banco", placeholder: "Ex: CGD, Millennium, Santander" },
    ]
  },
  { 
    id: "brazil_pix", 
    label: "PIX Brasil", 
    flag: "🇧🇷",
    icon: Wallet,
    fields: [
      { key: "pix_key", label: "Chave PIX", placeholder: "CPF, Email, Telefone ou Chave Aleatória" },
      { key: "pix_type", label: "Tipo de Chave", placeholder: "CPF / Email / Telefone / Aleatória" },
      { key: "account_holder", label: "Nome do Titular", placeholder: "Nome completo" },
    ]
  },
  { 
    id: "belgium_iban", 
    label: "IBAN Bélgica", 
    flag: "🇧🇪",
    icon: Building,
    fields: [
      { key: "iban", label: "IBAN", placeholder: "BE00 0000 0000 0000" },
      { key: "bic", label: "BIC/SWIFT", placeholder: "Código BIC" },
      { key: "account_holder", label: "Nome do Titular", placeholder: "Nome completo" },
    ]
  },
  { 
    id: "us_bank", 
    label: "Banco EUA", 
    flag: "🇺🇸",
    icon: Building,
    fields: [
      { key: "routing_number", label: "Routing Number", placeholder: "9 dígitos" },
      { key: "account_number", label: "Account Number", placeholder: "Número da conta" },
      { key: "account_type", label: "Tipo de Conta", placeholder: "Checking / Savings" },
      { key: "account_holder", label: "Nome do Titular", placeholder: "Nome completo" },
    ]
  },
  { 
    id: "usdt", 
    label: "USDT (Crypto)", 
    flag: "₮",
    icon: Bitcoin,
    fields: [
      { key: "wallet_address", label: "Endereço da Carteira", placeholder: "0x... ou TRC20/ERC20" },
      { key: "network", label: "Rede", placeholder: "TRC20 / ERC20 / BEP20" },
    ]
  },
  { 
    id: "paypal", 
    label: "PayPal", 
    flag: "💳",
    icon: Globe,
    fields: [
      { key: "email", label: "Email PayPal", placeholder: "seu@email.com" },
      { key: "account_holder", label: "Nome da Conta", placeholder: "Nome no PayPal" },
    ]
  },
];

export function BankingInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, requires2FA, logSecurityEvent } = use2FA();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'viewing' | 'requesting_2fa' | 'adding' | 'editing'>('viewing');
  const [sessionRestored, setSessionRestored] = useState(false);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [newMethodDetails, setNewMethodDetails] = useState<Record<string, string>>({});
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'add' | 'delete' | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadWithdrawalMethods();
      // Verificar se há uma sessão 2FA ativa
      const stored2FASession = sessionStorage.getItem('banking_2fa_session');
      if (stored2FASession && !sessionRestored) {
        const sessionData = JSON.parse(stored2FASession);
        if (sessionData.userId === user.id && sessionData.action === 'bank_details_change') {
          const sessionAge = Date.now() - sessionData.timestamp;
          if (sessionAge < 10 * 60 * 1000) {
            setCurrentStep('requesting_2fa');
            setSessionRestored(true);
            setPendingAction(sessionData.pendingAction || 'add');
            if (sessionData.pendingDeleteId) {
              setPendingDeleteId(sessionData.pendingDeleteId);
            }
          } else {
            sessionStorage.removeItem('banking_2fa_session');
          }
        }
      }
    }
  }, [user, sessionRestored]);

  const loadWithdrawalMethods = async () => {
    if (!user) return;

    try {
      setInitialLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('withdrawal_methods, iban, account_holder')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading withdrawal methods:', error);
        return;
      }

      if (data) {
        const rawMethods = data.withdrawal_methods;
        const methods: WithdrawalMethod[] = Array.isArray(rawMethods) 
          ? (rawMethods as unknown as WithdrawalMethod[]) 
          : [];

        // Se tem IBAN legado mas não tem métodos, migrar
        if (data.iban && methods.length === 0) {
          const legacyMethod: WithdrawalMethod = {
            id: crypto.randomUUID(),
            type: "angola_bank",
            label: "Banco Angola",
            details: {
              iban: data.iban,
              account_holder: data.account_holder || "",
            }
          };
          setWithdrawalMethods([legacyMethod]);
        } else {
          setWithdrawalMethods(methods);
        }
      }
    } catch (error) {
      console.error('Error loading withdrawal methods:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const saveWithdrawalMethods = async (methods: WithdrawalMethod[]) => {
    if (!user) return false;

    try {
      setLoading(true);
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Atualizar campos legados para compatibilidade
      const primaryMethod = methods[0];
      const legacyUpdate = primaryMethod ? {
        iban: primaryMethod.details.iban || primaryMethod.details.wallet_address || primaryMethod.details.pix_key || "",
        account_holder: primaryMethod.details.account_holder || "",
      } : { iban: "", account_holder: "" };

      let result;
      
      if (existingProfile) {
        result = await supabase
          .from('profiles')
          .update({
            withdrawal_methods: JSON.parse(JSON.stringify(methods)),
            ...legacyUpdate
          })
          .eq('user_id', user.id);
      } else {
        result = await supabase
          .from('profiles')
          .insert([{
            user_id: user.id,
            withdrawal_methods: JSON.parse(JSON.stringify(methods)),
            ...legacyUpdate
          }]);
      }

      if (result.error) {
        console.error('Error saving withdrawal methods:', result.error);
        toast({
          title: "Erro",
          description: "Erro ao salvar métodos de recebimento",
          variant: "destructive"
        });
        return false;
      }
      
      await logSecurityEvent('bank_details_change', true);
      return true;
    } catch (error) {
      console.error('Error saving withdrawal methods:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = async () => {
    if (!user?.email) return;

    if (settings?.enabled) {
      const needs2FA = await requires2FA('bank_details_change');
      if (needs2FA) {
        const sessionData = {
          userId: user.id,
          action: 'bank_details_change',
          timestamp: Date.now(),
          pendingAction: 'add'
        };
        sessionStorage.setItem('banking_2fa_session', JSON.stringify(sessionData));
        setPendingAction('add');
        setCurrentStep('requesting_2fa');
        setSessionRestored(false);
        return;
      }
    }

    setCurrentStep('adding');
  };

  const handleDeleteClick = async (methodId: string) => {
    if (!user?.email) return;

    if (settings?.enabled) {
      const needs2FA = await requires2FA('bank_details_change');
      if (needs2FA) {
        const sessionData = {
          userId: user.id,
          action: 'bank_details_change',
          timestamp: Date.now(),
          pendingAction: 'delete',
          pendingDeleteId: methodId
        };
        sessionStorage.setItem('banking_2fa_session', JSON.stringify(sessionData));
        setPendingAction('delete');
        setPendingDeleteId(methodId);
        setCurrentStep('requesting_2fa');
        setSessionRestored(false);
        return;
      }
    }

    // Sem 2FA, deletar direto
    await performDelete(methodId);
  };

  const performDelete = async (methodId: string) => {
    const updatedMethods = withdrawalMethods.filter(m => m.id !== methodId);
    const success = await saveWithdrawalMethods(updatedMethods);
    if (success) {
      setWithdrawalMethods(updatedMethods);
      toast({
        title: "Removido",
        description: "Método de recebimento removido com sucesso!"
      });
    }
    sessionStorage.removeItem('banking_2fa_session');
    setPendingDeleteId(null);
    setPendingAction(null);
  };

  const handleAddMethod = async () => {
    if (!selectedType) {
      toast({
        title: "Selecione um tipo",
        description: "Por favor, selecione o tipo de método de recebimento",
        variant: "destructive"
      });
      return;
    }

    const methodType = WITHDRAWAL_METHOD_TYPES.find(m => m.id === selectedType);
    if (!methodType) return;

    const hasEmptyFields = methodType.fields.some(field => !newMethodDetails[field.key]?.trim());
    if (hasEmptyFields) {
      toast({
        title: "Preencha todos os campos",
        description: "Por favor, preencha todos os campos do método de recebimento",
        variant: "destructive"
      });
      return;
    }

    const newMethod: WithdrawalMethod = {
      id: crypto.randomUUID(),
      type: selectedType,
      label: methodType.label,
      details: { ...newMethodDetails }
    };

    const updatedMethods = [...withdrawalMethods, newMethod];
    const success = await saveWithdrawalMethods(updatedMethods);
    
    if (success) {
      setWithdrawalMethods(updatedMethods);
      toast({
        title: "Adicionado",
        description: "Método de recebimento adicionado com sucesso!"
      });
      resetForm();
    }
  };

  const resetForm = () => {
    setCurrentStep('viewing');
    setSelectedType("");
    setNewMethodDetails({});
    setEditingMethodId(null);
    sessionStorage.removeItem('banking_2fa_session');
    setSessionRestored(false);
    setPendingAction(null);
    setPendingDeleteId(null);
  };

  const handle2FASuccess = async () => {
    sessionStorage.removeItem('banking_2fa_session');
    setSessionRestored(false);
    
    if (pendingAction === 'delete' && pendingDeleteId) {
      await performDelete(pendingDeleteId);
      setCurrentStep('viewing');
    } else {
      setCurrentStep('adding');
    }
  };

  const handle2FACancel = () => {
    sessionStorage.removeItem('banking_2fa_session');
    resetForm();
  };

  const getMethodTypeInfo = (typeId: string) => {
    return WITHDRAWAL_METHOD_TYPES.find(m => m.id === typeId);
  };

  const selectedMethodType = WITHDRAWAL_METHOD_TYPES.find(m => m.id === selectedType);

  const maskValue = (value: string) => {
    if (!value || value.length < 6) return value;
    const lastFour = value.slice(-4);
    return `${'*'.repeat(Math.min(value.length - 4, 12))}${lastFour}`;
  };

  // Verificação 2FA
  if (currentStep === 'requesting_2fa' && user?.email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            Verificação de Segurança
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

  // Formulário de adicionar
  if (currentStep === 'adding') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Adicionar Método de Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Método</Label>
            <Select value={selectedType} onValueChange={(value) => {
              setSelectedType(value);
              setNewMethodDetails({});
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {WITHDRAWAL_METHOD_TYPES.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    <span className="flex items-center gap-2">
                      <span>{type.flag}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMethodType && (
            <div className="space-y-3 pt-2">
              {selectedMethodType.fields.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="text-sm">{field.label}</Label>
                  <Input
                    id={field.key}
                    placeholder={field.placeholder}
                    value={newMethodDetails[field.key] || ""}
                    onChange={(e) => setNewMethodDetails(prev => ({
                      ...prev,
                      [field.key]: e.target.value
                    }))}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              onClick={handleAddMethod}
              disabled={loading || !selectedType}
              className="flex-1"
            >
              {loading ? "Salvando..." : "Adicionar Método"}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetForm}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Visualização
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            Métodos de Recebimento
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddClick}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {initialLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : withdrawalMethods.length > 0 ? (
          <div className="space-y-3">
            {withdrawalMethods.map((method, index) => {
              const typeInfo = getMethodTypeInfo(method.type);
              const IconComponent = typeInfo?.icon || Building;
              const primaryKey = typeInfo?.fields[0]?.key || Object.keys(method.details)[0];
              const primaryValue = method.details[primaryKey] || "";
              
              return (
                <div 
                  key={method.id} 
                  className="p-3 sm:p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-lg sm:text-xl">{typeInfo?.flag}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm sm:text-base">{typeInfo?.label || method.label}</span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">Principal</Badge>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                          {Object.entries(method.details).slice(0, 2).map(([key, value]) => {
                            const fieldInfo = typeInfo?.fields.find(f => f.key === key);
                            const displayValue = key.includes('iban') || key.includes('account') || key.includes('wallet') || key.includes('pix')
                              ? maskValue(value)
                              : value;
                            return (
                              <div key={key} className="truncate">
                                <span className="text-muted-foreground/70">{fieldInfo?.label || key}:</span>{" "}
                                <span className="font-mono">{displayValue}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => handleDeleteClick(method.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <Wallet className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum método de recebimento configurado
            </p>
            <Button variant="outline" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Método
            </Button>
          </div>
        )}

        {withdrawalMethods.length > 0 && (
          <p className="text-xs text-muted-foreground pt-2">
            O método marcado como "Principal" será usado para saques. Para alterar, remova os métodos e adicione na ordem desejada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
