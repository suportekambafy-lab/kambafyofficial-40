import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Save, Loader2 } from "lucide-react";

interface AddressData {
  country: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
}

const COUNTRIES = [
  { code: "AO", name: "Angola" },
  { code: "BR", name: "Brasil" },
  { code: "PT", name: "Portugal" },
  { code: "MZ", name: "Moçambique" },
  { code: "CV", name: "Cabo Verde" },
  { code: "GW", name: "Guiné-Bissau" },
  { code: "ST", name: "São Tomé e Príncipe" },
  { code: "TL", name: "Timor-Leste" },
  { code: "OTHER", name: "Outro" }
];

export function AddressCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasIdentity, setHasIdentity] = useState(false);
  const [address, setAddress] = useState<AddressData>({
    country: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
    address_postal_code: ""
  });

  useEffect(() => {
    if (user) {
      loadAddress();
    }
  }, [user]);

  const loadAddress = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Primeiro verificar se tem dados de identity_verification
      const { data: identityData } = await supabase
        .from('identity_verification')
        .select('country, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_postal_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (identityData) {
        setHasIdentity(true);
        setAddress({
          country: identityData.country || "",
          address_street: identityData.address_street || "",
          address_number: identityData.address_number || "",
          address_complement: identityData.address_complement || "",
          address_neighborhood: identityData.address_neighborhood || "",
          address_city: identityData.address_city || "",
          address_state: identityData.address_state || "",
          address_postal_code: identityData.address_postal_code || ""
        });
      }
    } catch (error) {
      console.error('Error loading address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Se já tem identity_verification, atualizar lá
      if (hasIdentity) {
        const { error } = await supabase
          .from('identity_verification')
          .update({
            country: address.country || null,
            address_street: address.address_street || null,
            address_number: address.address_number || null,
            address_complement: address.address_complement || null,
            address_neighborhood: address.address_neighborhood || null,
            address_city: address.address_city || null,
            address_state: address.address_state || null,
            address_postal_code: address.address_postal_code || null
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Se não tem, criar um registro básico
        const { error } = await supabase
          .from('identity_verification')
          .insert({
            user_id: user.id,
            full_name: user.email?.split('@')[0] || 'Usuário',
            document_type: 'Pendente',
            document_number: 'Pendente',
            birth_date: '2000-01-01',
            status: 'pendente',
            country: address.country || null,
            address_street: address.address_street || null,
            address_number: address.address_number || null,
            address_complement: address.address_complement || null,
            address_neighborhood: address.address_neighborhood || null,
            address_city: address.address_city || null,
            address_state: address.address_state || null,
            address_postal_code: address.address_postal_code || null
          });

        if (error) throw error;
        setHasIdentity(true);
      }

      toast({
        title: "Endereço atualizado",
        description: "Seus dados de endereço foram salvos com sucesso."
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o endereço. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AddressData, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const hasAddressData = address.address_street || address.address_city || address.country;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <MapPin className="h-4 w-4 md:h-5 md:w-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <MapPin className="h-4 w-4 md:h-5 md:w-5" />
          Endereço
        </CardTitle>
        <CardDescription>
          {hasAddressData 
            ? "Seus dados de endereço" 
            : "Adicione seu endereço para completar seu perfil"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* País */}
        <div className="space-y-2">
          <Label>País</Label>
          <Select 
            value={address.country} 
            onValueChange={(value) => handleChange('country', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o país" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rua e Número */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label>Rua / Avenida</Label>
            <Input
              value={address.address_street}
              onChange={(e) => handleChange('address_street', e.target.value)}
              placeholder="Nome da rua ou avenida"
            />
          </div>
          <div className="space-y-2">
            <Label>Número</Label>
            <Input
              value={address.address_number}
              onChange={(e) => handleChange('address_number', e.target.value)}
              placeholder="Nº"
            />
          </div>
        </div>

        {/* Complemento e Bairro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input
              value={address.address_complement}
              onChange={(e) => handleChange('address_complement', e.target.value)}
              placeholder="Apt, Bloco, etc. (opcional)"
            />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input
              value={address.address_neighborhood}
              onChange={(e) => handleChange('address_neighborhood', e.target.value)}
              placeholder="Bairro ou distrito"
            />
          </div>
        </div>

        {/* Cidade e Estado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={address.address_city}
              onChange={(e) => handleChange('address_city', e.target.value)}
              placeholder="Cidade"
            />
          </div>
          <div className="space-y-2">
            <Label>Estado / Província</Label>
            <Input
              value={address.address_state}
              onChange={(e) => handleChange('address_state', e.target.value)}
              placeholder="Estado ou província"
            />
          </div>
        </div>

        {/* Código Postal */}
        <div className="space-y-2">
          <Label>Código Postal</Label>
          <Input
            value={address.address_postal_code}
            onChange={(e) => handleChange('address_postal_code', e.target.value)}
            placeholder="Código postal / CEP"
            className="max-w-[200px]"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Endereço
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
