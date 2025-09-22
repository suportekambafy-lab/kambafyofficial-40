import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSelector } from "@/components/ProductSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrderBumpSettings } from "@/hooks/useOrderBumpSettings";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Package, Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
  price: string;
  cover?: string;
}

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

interface ProductExtraBumpConfiguratorProps {
  productId: string;
  onSaveSuccess: () => void;
  editingOrderBump?: OrderBumpSettings | null;
}

interface ProductExtraSettings {
  id?: string;
  enabled: boolean;
  title: string;
  description: string;
  position: string;
  selectedProductId?: string;
  selectedProductName: string;
  selectedProductPrice: string;
  selectedProductImage?: string;
  discount: number;
}

export function ProductExtraBumpConfigurator({ productId, onSaveSuccess, editingOrderBump }: ProductExtraBumpConfiguratorProps) {
  const { toast } = useToast();
  const { saveOrderBump } = useOrderBumpSettings(productId);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  
  const [settings, setSettings] = useState<ProductExtraSettings>({
    enabled: false,
    title: "🎁 Oferta Especial - Produto Extra",
    description: "Adicione este produto extra por apenas mais:",
    position: "after_payment_method",
    selectedProductName: "",
    selectedProductPrice: "",
    discount: 0,
  });

  useEffect(() => {
    if (editingOrderBump) {
      // Load existing data for editing
      setSettings({
        enabled: editingOrderBump.enabled,
        title: editingOrderBump.title,
        description: editingOrderBump.description,
        position: editingOrderBump.position,
        selectedProductId: editingOrderBump.bump_product_id,
        selectedProductName: editingOrderBump.bump_product_name || "",
        selectedProductPrice: editingOrderBump.bump_product_price || "",
        selectedProductImage: editingOrderBump.bump_product_image,
        discount: editingOrderBump.discount || 0,
      });
    }
    fetchProducts();
  }, [editingOrderBump, productId]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
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
        setProducts([]);
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
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar produtos",
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };


  const handleProductSelect = (product: Product) => {
    setSettings(prev => ({
      ...prev,
      selectedProductId: product.id,
      selectedProductName: product.name,
      selectedProductPrice: product.price,
      selectedProductImage: product.cover || undefined,
    }));
    setShowProductSelector(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (settings.enabled && !settings.selectedProductName) {
        toast({
          title: "Erro",
          description: "Selecione um produto extra para ativar",
          variant: "destructive"
        });
        return;
      }

      const orderBumpData = {
        product_id: productId,
        bump_category: 'product_extra',
        enabled: settings.enabled,
        title: settings.title,
        description: settings.description,
        position: settings.position,
        bump_type: 'product',
        bump_product_id: settings.selectedProductId,
        bump_product_name: settings.selectedProductName,
        bump_product_price: settings.selectedProductPrice,
        bump_product_image: settings.selectedProductImage || null,
        discount: settings.discount
      };

      const success = await saveOrderBump(orderBumpData, editingOrderBump?.id);
      
      if (success) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error('Error saving product extra settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscountedPrice = (originalPrice: string, discount: number) => {
    if (discount === 0) return originalPrice;
    
    const numericPrice = parseFloat(originalPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    const discountedPrice = numericPrice * (1 - discount / 100);
    
    return `${discountedPrice.toFixed(0).replace('.', ',')} KZ`;
  };

  if (loadingProducts) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Carregando produtos..." />
      </div>
    );
  }

  if (showProductSelector) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setShowProductSelector(false)}>
            ← Voltar
          </Button>
          <h3 className="text-lg font-semibold">Selecionar Produto Extra</h3>
        </div>
        <ProductSelector
          products={products}
          selectedProduct={null}
          onProductSelect={handleProductSelect}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Order Bump - Produto Extra
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
          <Label htmlFor="enabled">Ativar Order Bump de Produto Extra</Label>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={settings.title}
            onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
            placeholder="🎁 Oferta Especial - Produto Extra"
          />
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={settings.description}
            onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Adicione este produto extra por apenas mais:"
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

        {/* Seleção de Produto */}
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produto Extra
          </h4>
          
          {settings.selectedProductName ? (
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-4">
                {settings.selectedProductImage && (
                  <img 
                    src={settings.selectedProductImage} 
                    alt={settings.selectedProductName}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium">{settings.selectedProductName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {settings.discount > 0 ? (
                      <>
                        <span className="line-through mr-2">{settings.selectedProductPrice}</span>
                        <span className="text-green-600 font-medium">
                          {calculateDiscountedPrice(settings.selectedProductPrice, settings.discount)}
                        </span>
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          -{settings.discount}% OFF
                        </span>
                      </>
                    ) : (
                      settings.selectedProductPrice
                    )}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowProductSelector(true)}
                >
                  Alterar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    selectedProductId: undefined,
                    selectedProductName: "",
                    selectedProductPrice: "",
                    selectedProductImage: undefined,
                  }))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">Nenhum produto extra selecionado</p>
              <Button onClick={() => setShowProductSelector(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Selecionar Produto Extra
              </Button>
            </div>
          )}
        </div>

        {/* Desconto */}
        {settings.selectedProductName && (
          <div className="space-y-2">
            <Label htmlFor="discount">Desconto (%)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max="100"
              value={settings.discount}
              onChange={(e) => setSettings(prev => ({ ...prev, discount: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Desconto aplicado no produto extra (opcional)
            </p>
          </div>
        )}

        {/* Botão Salvar */}
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? <LoadingSpinner text="Salvando..." /> : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}