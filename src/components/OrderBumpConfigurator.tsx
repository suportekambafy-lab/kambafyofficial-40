import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSelector } from "@/components/ProductSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Plus, Trash2, Check } from "lucide-react";

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
  price: string;
  cover?: string;
}

interface OrderBumpConfiguratorProps {
  productId: string;
  onSaveSuccess: () => void;
}

interface OrderBumpItem {
  id?: string;
  bump_product_id?: string;
  bump_product_name: string;
  bump_product_price: string;
  bump_product_image: string | null;
  discount: number;
  order_position: number;
}

interface OrderBumpSettings {
  id?: string;
  enabled: boolean;
  title: string;
  description: string;
  position: string;
  items: OrderBumpItem[];
}

export function OrderBumpConfigurator({ productId, onSaveSuccess }: OrderBumpConfiguratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  
  const [settings, setSettings] = useState<OrderBumpSettings>({
    enabled: false,
    title: "Aproveite esta oferta especial!",
    description: "Adicione este produto por apenas mais:",
    position: "after_payment_method",
    items: []
  });

  useEffect(() => {
    fetchExistingSettings();
    fetchProducts();
  }, [productId]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, status, price, cover')
        .eq('status', 'Ativo')
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

  const fetchExistingSettings = async () => {
    try {
      console.log('🔍 Buscando configurações existentes para produto:', productId);
      const { data: settingsData, error: settingsError } = await supabase
        .from('order_bump_settings')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      if (settingsData) {
        // Buscar items relacionados se existirem
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_bump_items')
          .select('*')
          .eq('order_bump_id', settingsData.id)
          .order('order_position');

        if (itemsError) throw itemsError;

        setSettings({
          id: settingsData.id,
          enabled: settingsData.enabled,
          title: settingsData.title,
          description: settingsData.description,
          position: settingsData.position,
          items: itemsData || []
        });
      }
    } catch (error) {
      console.error('Error fetching order bump settings:', error);
    }
  };

  const handleAddItem = () => {
    setSelectedItemIndex(settings.items.length);
    setShowProductSelector(true);
  };

  const handleEditItem = (index: number) => {
    setSelectedItemIndex(index);
    setShowProductSelector(true);
  };

  const handleRemoveItem = (index: number) => {
    setSettings(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleProductSelect = (product: Product) => {
    if (selectedItemIndex !== null) {
      const newItem: OrderBumpItem = {
        bump_product_id: product.id,
        bump_product_name: product.name,
        bump_product_price: product.price,
        bump_product_image: product.cover || null,
        discount: 0,
        order_position: selectedItemIndex
      };

      setSettings(prev => {
        const newItems = [...prev.items];
        if (selectedItemIndex < newItems.length) {
          newItems[selectedItemIndex] = newItem;
        } else {
          newItems.push(newItem);
        }
        return { ...prev, items: newItems };
      });
    }
    setShowProductSelector(false);
    setSelectedItemIndex(null);
  };

  const updateItemDiscount = (index: number, discount: number) => {
    setSettings(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, discount } : item
      )
    }));
  };

  const handleSave = async () => {
    console.log('🔄 Iniciando salvamento do Order Bump...');
    console.log('📋 Settings atuais:', settings);
    
    try {
      setLoading(true);

      if (settings.enabled && settings.items.length === 0) {
        console.log('❌ Erro: Order bump ativado mas sem itens');
        toast({
          title: "Erro",
          description: "Adicione pelo menos um produto extra para ativar",
          variant: "destructive"
        });
        return;
      }

      console.log('👤 Verificando autenticação...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('👤 Usuário:', user?.id, 'Erro:', authError);
      if (!user) throw new Error('Usuário não autenticado');

      // Salvar configurações principais
      const orderBumpData = {
        user_id: user.id,
        product_id: productId,
        enabled: settings.enabled,
        title: settings.title,
        description: settings.description,
        position: settings.position,
        // Manter compatibilidade com campos antigos
        bump_product_name: settings.items[0]?.bump_product_name || "",
        bump_product_price: settings.items[0]?.bump_product_price || "",
        bump_product_image: settings.items[0]?.bump_product_image || null,
        discount: settings.items[0]?.discount || 0
      };

      console.log('💾 Salvando configurações principais:', orderBumpData);
      console.log('📍 Posição a ser salva:', settings.position);
      const { data: savedSettings, error } = await supabase
        .from('order_bump_settings')
        .upsert(orderBumpData, { onConflict: 'product_id' })
        .select()
        .single();

      console.log('💾 Resultado do salvamento:', { savedSettings, error });
      if (error) throw error;

      // Salvar items
      if (settings.items.length > 0) {
        console.log('📦 Salvando', settings.items.length, 'itens...');
        // Remover items antigos
        const { error: deleteError } = await supabase
          .from('order_bump_items')
          .delete()
          .eq('order_bump_id', savedSettings.id);

        console.log('🗑️ Remoção de itens antigos:', { deleteError });
        if (deleteError) throw deleteError;

        // Inserir novos items
        const itemsToInsert = settings.items.map((item, index) => ({
          order_bump_id: savedSettings.id,
          bump_product_id: item.bump_product_id,
          bump_product_name: item.bump_product_name,
          bump_product_price: item.bump_product_price,
          bump_product_image: item.bump_product_image,
          discount: item.discount,
          order_position: index
        }));

        console.log('📦 Inserindo novos itens:', itemsToInsert);
        const { error: insertError } = await supabase
          .from('order_bump_items')
          .insert(itemsToInsert);

        console.log('📦 Resultado da inserção:', { insertError });
        if (insertError) throw insertError;
      }

      console.log('✅ Salvamento concluído com sucesso!');
      toast({
        title: "Sucesso!",
        description: "Configurações do Order Bump salvas com sucesso",
      });

      // Disparar evento para atualizar lista de integrações
      window.dispatchEvent(new CustomEvent('integrationCreated'));
      window.dispatchEvent(new CustomEvent('integrationUpdated'));

      onSaveSuccess();
    } catch (error) {
      console.error('❌ Erro ao salvar order bump settings:', error);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Order Bump</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ativar/Desativar */}
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
            />
            <Label htmlFor="enabled">Ativar Order Bump</Label>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={settings.title}
              onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Aproveite esta oferta especial!"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Adicione este produto por apenas mais:"
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

          {/* Produtos Extras */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Produtos Extras</Label>
              <Button onClick={handleAddItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Extra
              </Button>
            </div>

            {settings.items.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <p className="text-muted-foreground">Nenhum produto extra adicionado</p>
                <Button onClick={handleAddItem} className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Extra
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {item.bump_product_image && (
                        <img 
                          src={item.bump_product_image} 
                          alt={item.bump_product_name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.bump_product_name}</h4>
                        <p className="text-sm text-muted-foreground">{item.bump_product_price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <Label htmlFor={`discount-${index}`} className="text-xs text-muted-foreground mb-1">
                            Desconto
                          </Label>
                          <div className="flex items-center gap-1">
                            <Input
                              id={`discount-${index}`}
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) => updateItemDiscount(index, Number(e.target.value))}
                              className="w-16 text-center"
                              placeholder="0"
                            />
                            <span className="text-sm text-muted-foreground">% OFF</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditItem(index)}
                      >
                        Alterar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {settings.enabled && settings.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview do Order Bump</CardTitle>
            <p className="text-sm text-muted-foreground">
              Como aparecerá no checkout real
            </p>
          </CardHeader>
          <CardContent>
            {/* Ofertas limitadas header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-gray-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
                <span>🏷️</span>
                Ofertas limitadas
              </div>
            </div>
            
            {/* Order Bump Card - matching real checkout design */}
            <div className="border-2 border-dashed border-orange-200 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-950/20 dark:to-orange-900/10 p-4">
                {/* Header com título e botão */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                    {settings.title}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white text-gray-600 border-gray-300 hover:bg-gray-50 border-2"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Conteúdo principal */}
                <div className="flex items-start gap-4">
                  {settings.items[0]?.bump_product_image && (
                    <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm border">
                      <img 
                        src={settings.items[0].bump_product_image} 
                        alt={settings.items[0].bump_product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100 line-clamp-2">
                      {settings.items[0]?.bump_product_name}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {settings.description}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {settings.items[0]?.discount > 0 
                          ? calculateDiscountedPrice(settings.items[0].bump_product_price, settings.items[0].discount)
                          : settings.items[0]?.bump_product_price
                        }
                      </span>
                      {settings.items[0]?.discount > 0 && (
                        <>
                          <span className="text-gray-500 line-through text-base">
                            {settings.items[0].bump_product_price}
                          </span>
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            -{settings.items[0].discount}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Botão de ação */}
                <Button 
                  className="w-full mt-4 transition-all rounded-xl py-3 font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}