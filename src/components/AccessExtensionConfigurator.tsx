import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Package } from "lucide-react";
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
  bumpProductName?: string;
  bumpProductPrice?: string;
  productId: string;
  // Removidas as propriedades de extensão - só produto adicional
  onConfigChange: (config: {
    bumpType: string;
    bumpProductName?: string;
    bumpProductPrice?: string;
  }) => void;
}

export const AccessExtensionConfigurator = ({
  bumpProductName = '',
  bumpProductPrice = '',
  productId,
  onConfigChange
}: AccessExtensionConfiguratorProps) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  // Removidos os estados locais de extensão - só produto adicional
  const [localProductName, setLocalProductName] = useState(bumpProductName);
  const [localProductPrice, setLocalProductPrice] = useState(bumpProductPrice);

  useEffect(() => {
    fetchProducts();
  }, [productId]);

  // Sincronizar estados locais quando as props mudam
  useEffect(() => {
    console.log('🔄 AccessExtensionConfigurator: Sincronizando props:', {
      bumpProductName,
      bumpProductPrice
    });
    
    setLocalProductName(bumpProductName || '');
    setLocalProductPrice(bumpProductPrice || '');
  }, [bumpProductName, bumpProductPrice]);

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
      
      // Usar o ID real do produto para buscar outros produtos do mesmo vendedor
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

  // Removida a função generateExtensionDescription - não é mais necessária

  const updateConfig = () => {
    console.log('🔄 updateConfig called with:', {
      bumpType: 'product',
      bumpProductName: localProductName,
      bumpProductPrice: localProductPrice
    });

    onConfigChange({
      bumpType: 'product',
      bumpProductName: localProductName,
      bumpProductPrice: localProductPrice
    });
  };

  // Removidas as funções de extensão - só produto adicional

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
          <div className="p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <Label className="font-medium">Produto Adicional</Label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione produtos do seu catálogo como oferta especial no checkout
            </p>
          </div>
        </div>

        {/* Configuração para Produto Adicional */}
        {(
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
        {/* Final da seção de produtos adicionais */}
      </CardContent>
    </Card>
  );
};