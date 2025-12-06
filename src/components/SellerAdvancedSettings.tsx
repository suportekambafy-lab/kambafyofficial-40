import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building, CreditCard, Plus, Trash2, Wallet, Bitcoin, Globe } from "lucide-react";
import ProtectedAction from "./ProtectedAction";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
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

export function SellerAdvancedSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [newMethodDetails, setNewMethodDetails] = useState<Record<string, string>>({});

  // Legacy fields for backward compatibility
  const [legacyIban, setLegacyIban] = useState("");
  const [legacyAccountHolder, setLegacyAccountHolder] = useState("");

  useEffect(() => {
    if (user) {
      loadWithdrawalMethods();
    }
  }, [user]);

  const loadWithdrawalMethods = async () => {
    if (!user) return;

    try {
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
        // Load new withdrawal methods - cast through unknown for type safety
        const rawMethods = data.withdrawal_methods;
        const methods: WithdrawalMethod[] = Array.isArray(rawMethods) 
          ? (rawMethods as unknown as WithdrawalMethod[]) 
          : [];
        setWithdrawalMethods(methods);

        // Store legacy data for migration
        setLegacyIban(data.iban || "");
        setLegacyAccountHolder(data.account_holder || "");

        // If has legacy IBAN but no withdrawal methods, migrate it
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
        }
      }
    } catch (error) {
      console.error('Error loading withdrawal methods:', error);
    }
  };

  const saveWithdrawalMethods = async (methods: WithdrawalMethod[]) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Also update legacy fields with primary method for backward compatibility
      const primaryMethod = methods[0];
      const legacyUpdate = primaryMethod ? {
        iban: primaryMethod.details.iban || primaryMethod.details.wallet_address || primaryMethod.details.pix_key || "",
        account_holder: primaryMethod.details.account_holder || "",
      } : {};

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
      } else {
        toast({
          title: "Salvo",
          description: "Métodos de recebimento atualizados com sucesso!"
        });
      }
    } catch (error) {
      console.error('Error saving withdrawal methods:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = () => {
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

    // Check if all required fields are filled
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
    setWithdrawalMethods(updatedMethods);
    saveWithdrawalMethods(updatedMethods);

    // Reset form
    setShowAddForm(false);
    setSelectedType("");
    setNewMethodDetails({});
  };

  const handleRemoveMethod = (methodId: string) => {
    const updatedMethods = withdrawalMethods.filter(m => m.id !== methodId);
    setWithdrawalMethods(updatedMethods);
    saveWithdrawalMethods(updatedMethods);
  };

  const getMethodTypeInfo = (typeId: string) => {
    return WITHDRAWAL_METHOD_TYPES.find(m => m.id === typeId);
  };

  const selectedMethodType = WITHDRAWAL_METHOD_TYPES.find(m => m.id === selectedType);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Métodos de Recebimento</h3>
          </div>
          {!showAddForm && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAddForm(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Lista de métodos existentes */}
        {withdrawalMethods.length > 0 && (
          <div className="space-y-3">
            {withdrawalMethods.map((method, index) => {
              const typeInfo = getMethodTypeInfo(method.type);
              const IconComponent = typeInfo?.icon || Building;
              
              return (
                <Card key={method.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{typeInfo?.flag}</span>
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{typeInfo?.label || method.label}</span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">Principal</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                          {Object.entries(method.details).map(([key, value]) => {
                            const fieldInfo = typeInfo?.fields.find(f => f.key === key);
                            return (
                              <div key={key}>
                                <span className="text-muted-foreground/70">{fieldInfo?.label || key}:</span>{" "}
                                <span>{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <ProtectedAction
                      eventType="bank_details_change"
                      onAction={() => handleRemoveMethod(method.id)}
                    >
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ProtectedAction>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Formulário para adicionar novo método */}
        {showAddForm && (
          <Card className="p-4 border-primary/30 bg-primary/5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Adicionar Método de Recebimento</h4>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowAddForm(false);
                  setSelectedType("");
                  setNewMethodDetails({});
                }}>
                  Cancelar
                </Button>
              </div>

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
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Input
                        id={field.key}
                        placeholder={field.placeholder}
                        value={newMethodDetails[field.key] || ""}
                        onChange={(e) => setNewMethodDetails(prev => ({
                          ...prev,
                          [field.key]: e.target.value
                        }))}
                      />
                    </div>
                  ))}

                  <ProtectedAction
                    eventType="bank_details_change"
                    onAction={handleAddMethod}
                    className="w-full"
                  >
                    <Button className="w-full" disabled={loading}>
                      {loading ? "Salvando..." : "Adicionar Método"}
                    </Button>
                  </ProtectedAction>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Mensagem quando não há métodos */}
        {withdrawalMethods.length === 0 && !showAddForm && (
          <Card className="p-6 text-center border-dashed">
            <Wallet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground mb-3">
              Nenhum método de recebimento configurado
            </p>
            <Button variant="outline" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Método
            </Button>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Configurações Avançadas</h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Comissões</h4>
            <p className="text-sm text-muted-foreground">
              As comissões são calculadas automaticamente (8,99% por venda). Sem mensalidades ou custos fixos.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Relatórios</h4>
            <p className="text-sm text-muted-foreground">
              Acompanhe suas vendas e ganhos na seção de Vendas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
