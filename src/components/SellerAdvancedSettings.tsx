
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building, CreditCard } from "lucide-react";
import ProtectedAction from "./ProtectedAction";

export function SellerAdvancedSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    iban: "",
    account_holder: "",
  });

  useEffect(() => {
    if (user) {
      loadBankDetails();
    }
  }, [user]);

  const loadBankDetails = async () => {
    if (!user) return;

    try {
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
    }
  };

  const updateBankDetails = async () => {
    if (!user) return;

    console.log('🏦 Iniciando atualização de dados bancários');
    
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
            iban: bankDetails.iban,
            account_holder: bankDetails.account_holder,
          })
          .eq('user_id', user.id);
      } else {
        result = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            iban: bankDetails.iban,
            account_holder: bankDetails.account_holder,
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
        console.log('✅ Dados bancários atualizados com sucesso');
        toast({
          title: "Dados atualizados",
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

  const handleInputChange = (field: string, value: string) => {
    setBankDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Dados Bancários</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account_holder">Nome do Titular</Label>
            <Input
              id="account_holder"
              placeholder="Nome completo do titular da conta"
              value={bankDetails.account_holder}
              onChange={(e) => handleInputChange("account_holder", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              placeholder="AO06 0000 0000 0000 0000 0000 0"
              value={bankDetails.iban}
              onChange={(e) => handleInputChange("iban", e.target.value)}
            />
          </div>

          <ProtectedAction
            eventType="bank_details_change"
            onAction={updateBankDetails}
            className="w-full"
          >
            <Button 
              disabled={loading} 
              className="w-full"
            >
              {loading ? "Salvando..." : "Salvar Dados Bancários"}
            </Button>
          </ProtectedAction>
        </div>
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
              As comissões são calculadas automaticamente com base no plano escolhido.
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
