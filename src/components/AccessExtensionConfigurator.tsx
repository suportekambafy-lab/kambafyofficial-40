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
    if (type === 'lifetime') return 'Extensão para acesso vitalício';
    
    const unit = type === 'days' ? 'dia' : type === 'months' ? 'mês' : 'ano';
    const unitPlural = type === 'days' ? 'dias' : type === 'months' ? 'meses' : 'anos';
    
    return `Extensão de ${value} ${value === 1 ? unit : unitPlural} de acesso`;
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
      extensionDescription: description
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
                      Selecionar Produto
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
              <Label htmlFor="extension-price">Preço da Extensão (KZ)</Label>
              <Input
                id="extension-price"
                type="text"
                value={localExtensionPrice}
                onChange={(e) => {
                  setLocalExtensionPrice(e.target.value);
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