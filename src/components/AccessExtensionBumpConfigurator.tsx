import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrderBumpSettings } from "@/hooks/useOrderBumpSettings";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Clock, Plus } from "lucide-react";

interface OrderBumpSettings {
  id?: string;
  enabled: boolean;
  title: string;
  description: string;
  position: string;
  bump_category: string;
  bump_type?: string;
  bump_product_id?: string;
  bump_product_name?: string;
  bump_product_price?: string;
  bump_product_image?: string;
  discount?: number;
  access_extension_type?: string;
  access_extension_value?: number;
  access_extension_description?: string;
  product_id?: string;
  bump_order?: number;
}

interface AccessExtensionBumpConfiguratorProps {
  productId: string;
  onSaveSuccess: () => void;
  editingOrderBump?: OrderBumpSettings | null;
}

interface AccessExtensionSettings {
  id?: string;
  enabled: boolean;
  description: string;
  position: string;
  extensionType: string;
  extensionValue: number;
  extensionPrice: string;
  extensionDescription: string;
}

export function AccessExtensionBumpConfigurator({ productId, onSaveSuccess, editingOrderBump }: AccessExtensionBumpConfiguratorProps) {
  const { toast } = useToast();
  const { saveOrderBump } = useOrderBumpSettings(productId);
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState<AccessExtensionSettings>({
    enabled: false,
    description: "Garante mais tempo para estudar:",
    position: "after_payment_method",
    extensionType: "months",
    extensionValue: 6,
    extensionPrice: "",
    extensionDescription: "",
  });

  useEffect(() => {
    if (editingOrderBump) {
      // Load existing data for editing
      setSettings({
        enabled: editingOrderBump.enabled,
        description: editingOrderBump.description,
        position: editingOrderBump.position,
        extensionType: editingOrderBump.access_extension_type || 'months',
        extensionValue: editingOrderBump.access_extension_value || 6,
        extensionPrice: editingOrderBump.bump_product_price || '',
        extensionDescription: editingOrderBump.access_extension_description || '',
      });
    }
  }, [editingOrderBump]);


  const generateExtensionDescription = (type: string, value: number): string => {
    if (type === 'lifetime') return 'Acesso Vitalício';
    if (type === 'months' && value === 6) return 'Extensão de 6 meses';
    if (type === 'years' && value === 1) return 'Extensão de 1 ano';
    
    const unit = type === 'months' ? 'mês' : 'ano';
    const unitPlural = type === 'months' ? 'meses' : 'anos';
    
    return `Extensão de ${value} ${value === 1 ? unit : unitPlural}`;
  };

  const handleExtensionChange = (type: string, value: number) => {
    const description = generateExtensionDescription(type, value);
    setSettings(prev => ({
      ...prev,
      extensionType: type,
      extensionValue: value,
      extensionDescription: description,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (settings.enabled && (!settings.extensionPrice || settings.extensionPrice.trim() === '')) {
        toast({
          title: "Erro",
          description: "Configure o preço da extensão antes de ativar",
          variant: "destructive"
        });
        return;
      }

      const orderBumpData = {
        product_id: productId,
        bump_category: 'access_extension',
        enabled: settings.enabled,
        title: settings.description || 'Extensão de Acesso',
        description: settings.description,
        position: settings.position,
        bump_type: 'access_extension',
        access_extension_type: settings.extensionType,
        access_extension_value: settings.extensionValue,
        access_extension_description: settings.extensionDescription,
        bump_product_name: settings.extensionDescription,
        bump_product_price: settings.extensionPrice,
        bump_product_image: null,
        discount: 0
      };

      const success = await saveOrderBump(orderBumpData, editingOrderBump?.id);
      
      if (success) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error('Error saving access extension settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Order Bump - Extensão de Acesso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ativar/Desativar */}
        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
          />
          <Label htmlFor="enabled">Ativar Order Bump de Extensão de Acesso</Label>
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={settings.description}
            onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Garante mais tempo para estudar:"
            rows={3}
          />
        </div>

        {/* Posição */}
        <div className="space-y-2">
          <Label htmlFor="position">Posição no Checkout</Label>
          <Select
            value={settings.position}
            onValueChange={(position) => setSettings(prev => ({ ...prev, position }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a posição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="after_payment_method">Após métodos de pagamento</SelectItem>
              <SelectItem value="before_payment_method">Antes dos métodos de pagamento</SelectItem>
              <SelectItem value="after_customer_info">Após informações do cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Configuração de Extensão */}
        <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Opções de Extensão Predefinidas
            </h4>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Escolha uma das opções de extensão mais populares
            </p>
          </div>
          
          <div>
            <Label htmlFor="extension-type">Opções de Extensão</Label>
            <Select 
              value={`${settings.extensionType}-${settings.extensionValue}`} 
              onValueChange={(value) => {
                const [type, valueStr] = value.split('-');
                const numValue = valueStr === 'lifetime' ? 0 : parseInt(valueStr);
                handleExtensionChange(type, numValue);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="months-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    +6 Meses
                  </div>
                </SelectItem>
                <SelectItem value="years-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    +1 Ano
                  </div>
                </SelectItem>
                <SelectItem value="lifetime-0">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Acesso Vitalício
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="extension-price">Preço da Extensão (KZ)</Label>
            <Input
              id="extension-price"
              type="number"
              min="0"
              step="1"
              value={settings.extensionPrice}
              onChange={(e) => setSettings(prev => ({ ...prev, extensionPrice: e.target.value }))}
              placeholder="Ex: 5000"
            />
          </div>

          <div>
            <Label htmlFor="extension-description">Descrição Personalizada (Opcional)</Label>
            <Textarea
              id="extension-description"
              value={settings.extensionDescription}
              onChange={(e) => setSettings(prev => ({ ...prev, extensionDescription: e.target.value }))}
              placeholder="Ex: Extensão especial de 6 meses com acesso a todos os bônus"
              rows={3}
            />
          </div>

          <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
              Preview: {generateExtensionDescription(settings.extensionType, settings.extensionValue)}
              {settings.extensionPrice && ` - ${settings.extensionPrice} KZ`}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {settings.extensionType === 'lifetime' 
                ? 'Converte o acesso para vitalício - cliente nunca mais perde acesso'
                : `Adiciona ${settings.extensionValue} ${settings.extensionType === 'months' ? 'meses' : 'anos'} ao tempo atual de acesso`
              }
            </p>
            {settings.extensionType === 'lifetime' && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                ⚠️ Recomendado: Defina um preço premium para acesso vitalício
              </div>
            )}
          </div>
        </div>

        {/* Botão Salvar */}
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? <LoadingSpinner text="Salvando..." /> : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}