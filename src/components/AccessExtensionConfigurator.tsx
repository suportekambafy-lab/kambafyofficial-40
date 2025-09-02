import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, Plus, Package } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface AccessExtensionConfiguratorProps {
  bumpType: string;
  bumpProductName?: string;
  bumpProductPrice?: string;
  extensionType?: string;
  extensionValue?: number;
  extensionDescription?: string;
  onConfigChange: (config: {
    bumpType: string;
    bumpProductName?: string;
    bumpProductPrice?: string;
    extensionType?: string;
    extensionValue?: number;
    extensionDescription?: string;
  }) => void;
}

export const AccessExtensionConfigurator = ({
  bumpType,
  bumpProductName = '',
  bumpProductPrice = '',
  extensionType = 'months',
  extensionValue = 6,
  extensionDescription = '',
  onConfigChange
}: AccessExtensionConfiguratorProps) => {
  const [localBumpType, setLocalBumpType] = useState(bumpType || 'product');
  const [localProductName, setLocalProductName] = useState(bumpProductName);
  const [localProductPrice, setLocalProductPrice] = useState(bumpProductPrice);
  const [localExtensionType, setLocalExtensionType] = useState(extensionType);
  const [localExtensionValue, setLocalExtensionValue] = useState(extensionValue);
  const [localExtensionDescription, setLocalExtensionDescription] = useState(extensionDescription);

  const generateExtensionDescription = (type: string, value: number): string => {
    if (type === 'lifetime') return 'Extensão para acesso vitalício';
    
    const unit = type === 'days' ? 'dia' : type === 'months' ? 'mês' : 'ano';
    const unitPlural = type === 'days' ? 'dias' : type === 'months' ? 'meses' : 'anos';
    
    return `Extensão de ${value} ${value === 1 ? unit : unitPlural} de acesso`;
  };

  const updateConfig = () => {
    const description = localBumpType === 'access_extension' 
      ? generateExtensionDescription(localExtensionType, localExtensionValue)
      : localExtensionDescription;

    onConfigChange({
      bumpType: localBumpType,
      bumpProductName: localProductName,
      bumpProductPrice: localProductPrice,
      extensionType: localExtensionType,
      extensionValue: localExtensionValue,
      extensionDescription: description
    });
  };

  const handleBumpTypeChange = (newType: string) => {
    setLocalBumpType(newType);
    setTimeout(updateConfig, 0);
  };

  const handleExtensionTypeChange = (newType: string) => {
    setLocalExtensionType(newType);
    const newValue = newType === 'lifetime' ? 0 : localExtensionValue;
    setLocalExtensionValue(newValue);
    setTimeout(updateConfig, 0);
  };

  const handleExtensionValueChange = (newValue: string) => {
    const numValue = parseInt(newValue);
    if (!isNaN(numValue) && numValue > 0) {
      setLocalExtensionValue(numValue);
      setTimeout(updateConfig, 0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Configuração do Order Bump
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo de Order Bump */}
        <div className="space-y-3">
          <Label>Tipo de Order Bump</Label>
          <RadioGroup 
            value={localBumpType} 
            onValueChange={handleBumpTypeChange}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="product" id="product" />
              <Label htmlFor="product" className="flex items-center gap-2 cursor-pointer">
                <Package className="w-4 h-4" />
                Produto Adicional
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="access_extension" id="access_extension" />
              <Label htmlFor="access_extension" className="flex items-center gap-2 cursor-pointer">
                <Clock className="w-4 h-4" />
                Extensão de Acesso
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Configuração para Produto Adicional */}
        {localBumpType === 'product' && (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium">Produto Adicional</h4>
            <div>
              <Label htmlFor="product-name">Nome do Produto</Label>
              <Input
                id="product-name"
                value={localProductName}
                onChange={(e) => {
                  setLocalProductName(e.target.value);
                  setTimeout(updateConfig, 0);
                }}
                placeholder="Ex: Módulo Avançado"
              />
            </div>
            <div>
              <Label htmlFor="product-price">Preço (KZ)</Label>
              <Input
                id="product-price"
                value={localProductPrice}
                onChange={(e) => {
                  setLocalProductPrice(e.target.value);
                  setTimeout(updateConfig, 0);
                }}
                placeholder="Ex: 15000"
              />
            </div>
          </div>
        )}

        {/* Configuração para Extensão de Acesso */}
        {localBumpType === 'access_extension' && (
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-medium">Extensão de Tempo de Acesso</h4>
            
            <div>
              <Label htmlFor="extension-type">Tipo de Extensão</Label>
              <Select value={localExtensionType} onValueChange={handleExtensionTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Dias</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                  <SelectItem value="years">Anos</SelectItem>
                  <SelectItem value="lifetime">Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {localExtensionType !== 'lifetime' && (
              <div>
                <Label htmlFor="extension-value">
                  Quantidade de {localExtensionType === 'days' ? 'Dias' : localExtensionType === 'months' ? 'Meses' : 'Anos'}
                </Label>
                <Input
                  id="extension-value"
                  type="number"
                  min="1"
                  value={localExtensionValue}
                  onChange={(e) => handleExtensionValueChange(e.target.value)}
                  placeholder="Ex: 6"
                />
              </div>
            )}

            <div>
              <Label htmlFor="extension-description">Descrição Personalizada (Opcional)</Label>
              <Textarea
                id="extension-description"
                value={localExtensionDescription}
                onChange={(e) => {
                  setLocalExtensionDescription(e.target.value);
                  setTimeout(updateConfig, 0);
                }}
                placeholder="Ex: Extensão especial de 6 meses com acesso a todos os bônus"
                rows={3}
              />
            </div>

            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Preview: {generateExtensionDescription(localExtensionType, localExtensionValue)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {localExtensionType === 'lifetime' 
                  ? 'Converte o acesso para vitalício'
                  : `Adiciona ${localExtensionValue} ${localExtensionType === 'days' ? 'dias' : localExtensionType === 'months' ? 'meses' : 'anos'} ao tempo atual de acesso`
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};