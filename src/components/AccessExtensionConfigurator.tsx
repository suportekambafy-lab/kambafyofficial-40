import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, Plus, Package } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ProductSelector } from "@/components/ProductSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
  price: string;
  cover?: string;
}

interface AccessExtensionConfiguratorProps {
  bumpType: string;
  bumpProductName?: string;
  bumpProductPrice?: string;
  extensionType?: string;
  extensionValue?: number;
  extensionDescription?: string;
  extensionPrice?: string;
  productId: string;
  onConfigChange: (config: {
    bumpType: string;
    bumpProductName?: string;
    bumpProductPrice?: string;
    extensionType?: string;
    extensionValue?: number;
    extensionDescription?: string;
    extensionPrice?: string;
  }) => void;
}

export const AccessExtensionConfigurator = ({
  bumpType,
  bumpProductName = '',
  bumpProductPrice = '',
  extensionType = 'months',
  extensionValue = 6,
  extensionDescription = '',
  extensionPrice = '',
  productId,
  onConfigChange
}: AccessExtensionConfiguratorProps) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [localBumpType, setLocalBumpType] = useState(bumpType || 'product');
  const [localProductName, setLocalProductName] = useState(bumpProductName);
  const [localProductPrice, setLocalProductPrice] = useState(bumpProductPrice);
  const [localExtensionType, setLocalExtensionType] = useState(extensionType);
  const [localExtensionValue, setLocalExtensionValue] = useState(extensionValue);
  const [localExtensionDescription, setLocalExtensionDescription] = useState(extensionDescription);
  const [localExtensionPrice, setLocalExtensionPrice] = useState(extensionPrice);

  useEffect(() => {
    fetchProducts();
  }, [productId]);

  // Sincronizar estados locais quando as props mudam
  useEffect(() => {
    console.log('🔄 AccessExtensionConfigurator: Sincronizando props:', {
      bumpType,
      bumpProductName,
      bumpProductPrice,
      extensionType,
      extensionValue,
      extensionDescription,
      extensionPrice
    });
    
    setLocalBumpType(bumpType || 'product');
    setLocalProductName(bumpProductName || '');
    setLocalProductPrice(bumpProductPrice || '');
    
    // Valores padrão para extensão - sempre começar com 6 meses se não especificado
    setLocalExtensionType(extensionType || 'months');
    setLocalExtensionValue(extensionValue || 6);
    setLocalExtensionDescription(extensionDescription || '');
    setLocalExtensionPrice(extensionPrice || '');
  }, [bumpType, bumpProductName, bumpProductPrice, extensionType, extensionValue, extensionDescription, extensionPrice]);

  const fetchProducts = async () => {
    try {
      // Buscar produtos do mesmo vendedor, excluindo o produto atual
      const { data: ownerProduct, error: ownerError } = await supabase
        .from('products')
        .select('user_id')
        .eq('id', productId)
        .single();

      if (ownerError) throw ownerError;
      const sellerId = ownerProduct?.user_id;

      if (!sellerId) {
        console.warn('Não foi possível obter o vendedor do produto');
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, status, price, cover')
        .eq('status', 'Ativo')
        .eq('user_id', sellerId)
        .neq('id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      
      // Se há um produto selecionado anteriormente, encontrar ele na lista
      if (bumpProductName) {
        const existingProduct = (data || []).find(p => p.name === bumpProductName);
        if (existingProduct) {
          setSelectedProduct(existingProduct);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar produtos",
        variant: "destructive"
      });
    }
  };

  const generateExtensionDescription = (type: string, value: number): string => {
    if (type === 'lifetime') return 'Acesso Vitalício';
    if (type === 'months' && value === 6) return 'Extensão de 6 meses';
    if (type === 'years' && value === 1) return 'Extensão de 1 ano';
    
    // Fallback para casos antigos ou customizados
    const unit = type === 'days' ? 'dia' : type === 'months' ? 'mês' : 'ano';
    const unitPlural = type === 'days' ? 'dias' : type === 'months' ? 'meses' : 'anos';
    
    return `Extensão de ${value} ${value === 1 ? unit : unitPlural}`;
  };

  const updateConfig = () => {
    const description = localBumpType === 'access_extension' 
      ? generateExtensionDescription(localExtensionType, localExtensionValue)
      : localExtensionDescription;

      console.log('🔄 updateConfig called with:', {
        bumpType: localBumpType,
        bumpProductName: localProductName,
        bumpProductPrice: localProductPrice,
        extensionType: localExtensionType,
        extensionValue: localExtensionValue,
        extensionDescription: description,
        extensionPrice: localExtensionPrice
      });

    onConfigChange({
      bumpType: localBumpType,
      bumpProductName: localProductName,
      bumpProductPrice: localProductPrice,
      extensionType: localExtensionType,
      extensionValue: localExtensionValue,
      extensionDescription: description,
      extensionPrice: localExtensionPrice
    });
  };

  const handleBumpTypeChange = (newType: string) => {
    setLocalBumpType(newType);
    setTimeout(updateConfig, 0);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setLocalProductName(product.name);
    setLocalProductPrice(product.price);
    setShowProductSelector(false);
    setTimeout(updateConfig, 0);
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
                Extra
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

        {/* Configuração para Extra */}
        {localBumpType === 'product' && (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium">Produto Extra</h4>
            
            {showProductSelector ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Selecionar Produto</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowProductSelector(false)}
                  >
                    Cancelar
                  </Button>
                </div>
                <ProductSelector
                  products={products}
                  selectedProduct={selectedProduct}
                  onProductSelect={handleProductSelect}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProduct ? (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {selectedProduct.cover && (
                        <img 
                          src={selectedProduct.cover} 
                          alt={selectedProduct.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{selectedProduct.name}</h4>
                        <p className="text-sm text-muted-foreground">{selectedProduct.price}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowProductSelector(true)}
                      >
                        Alterar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">Nenhum produto selecionado</p>
                      <Button onClick={() => setShowProductSelector(true)}>
                      <Package className="w-4 h-4 mr-2" />
                      Selecionar Extra
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Configuração para Extensão de Acesso */}
        {localBumpType === 'access_extension' && (
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Extensão de Tempo (Opções Predefinidas)
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Escolha uma das opções de extensão mais populares para seus clientes
              </p>
            </div>
            
            <div>
              <Label htmlFor="extension-type">Opções de Extensão</Label>
              <Select 
                value={`${localExtensionType}-${localExtensionValue}`} 
                onValueChange={(value) => {
                  const [type, valueStr] = value.split('-');
                  const numValue = valueStr === 'lifetime' ? 0 : parseInt(valueStr);
                  setLocalExtensionType(type);
                  setLocalExtensionValue(numValue);
                  setTimeout(updateConfig, 0);
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
                      🔥 Acesso Vitalício
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
                value={localExtensionPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalExtensionPrice(value);
                  setTimeout(updateConfig, 0);
                }}
                placeholder="Ex: 5000"
              />
            </div>

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
                {localExtensionPrice && ` - ${localExtensionPrice} KZ`}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {localExtensionType === 'lifetime' 
                  ? 'Converte o acesso para vitalício - cliente nunca mais perde acesso'
                  : `Adiciona ${localExtensionValue} ${localExtensionType === 'months' ? 'meses' : 'anos'} ao tempo atual de acesso`
                }
              </p>
              {localExtensionType === 'lifetime' && (
                <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                  ⚠️ Recomendado: Defina um preço premium para acesso vitalício
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};