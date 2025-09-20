
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Check } from "lucide-react";

interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  flag: string;
  exchangeRate: number;
}

interface OrderBumpData {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  discount: number;
  position: string;
  bump_product_name: string;
  bump_product_price: string;
  bump_product_image: string | null;
  user_id: string;
  bump_product_id?: string;
  // Campos para extensões de acesso
  bump_type?: string;
  access_extension_type?: string;
  access_extension_value?: number;
  access_extension_description?: string;
  // Preços personalizados do produto do order bump
  bump_product_custom_prices?: Record<string, string>;
}

interface OrderBumpProps {
  productId: string;
  position: "before_payment_method" | "after_payment_method" | "after_customer_info";
  onToggle?: (isSelected: boolean, bumpData: OrderBumpData | null) => void;
  userCountry: CountryInfo;
  formatPrice: (priceInKZ: number, targetCountry?: CountryInfo, customPrices?: Record<string, string>) => string;
}

export function OrderBump({ productId, position, onToggle, userCountry, formatPrice }: OrderBumpProps) {
  const [orderBump, setOrderBump] = useState<OrderBumpData | null>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderBump();
  }, [productId]);

  const fetchOrderBump = async () => {
    try {
      setLoading(true);
      console.log(`🔍 OrderBump: Buscando order bump para produto ${productId}, posição ${position}`);
      
      // Verificar se é UUID ou slug
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(productId);
      
      // Buscar o produto principal para obter o user_id do vendedor
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, user_id')
        .eq(isUUID ? 'id' : 'slug', productId)
        .single();

      if (productError) {
        console.error('❌ OrderBump: Erro ao buscar produto:', productError);
        return;
      }

      if (!productData) {
        console.log('❌ OrderBump: Produto não encontrado');
        return;
      }

      // Usar o ID real do produto para buscar o order bump
      const actualProductId = productData.id;

      // Buscar order bump com preços personalizados do produto do bump
      const { data, error } = await supabase
        .from('order_bump_settings')
        .select('*')
        .eq('product_id', actualProductId)
        .eq('enabled', true)
        .eq('position', position)
        .eq('user_id', productData.user_id) // Garantir que seja do mesmo vendedor
        .maybeSingle();

      console.log(`📊 OrderBump: Resultado da busca:`, { data, error, productId, position, enabled: true });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ OrderBump: Erro ao buscar order bump:', error);
        return;
      }

      if (data) {
        console.log(`✅ OrderBump: Order bump encontrado:`, data);
        console.log(`📋 Tipo do bump:`, data.bump_type);
        console.log(`⏰ Extensão - Tipo:`, data.access_extension_type, `Valor:`, data.access_extension_value);
        
        // Se o bump tem um produto associado, buscar seus preços personalizados
        if (data.bump_product_id) {
          console.log(`💰 Buscando preços personalizados do produto:`, data.bump_product_id);
          const { data: bumpProductData, error: bumpProductError } = await supabase
            .from('products')
            .select('custom_prices')
            .eq('id', data.bump_product_id)
            .maybeSingle();
          
          if (!bumpProductError && bumpProductData?.custom_prices) {
            console.log(`💰 Custom Prices encontrados para produto do bump:`, bumpProductData.custom_prices);
            
            // Adicionar custom_prices ao order bump
            const orderBumpWithCustomPrices = {
              ...data,
              bump_product_custom_prices: bumpProductData.custom_prices as Record<string, string>
            };
            setOrderBump(orderBumpWithCustomPrices);
          } else {
            console.log(`💰 Nenhum preço personalizado encontrado para produto do bump`);
            setOrderBump(data);
          }
        } else {
          console.log(`💰 Order bump não tem produto referenciado - usando conversão automática`);
          setOrderBump(data);
        }
      } else {
        console.log(`❌ OrderBump: Nenhum order bump encontrado para produto ${productId} na posição ${position}`);
        setOrderBump(null);
      }
    } catch (error) {
      console.error('Error fetching order bump:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const newIsSelected = !isSelected;
    setIsSelected(newIsSelected);
    onToggle?.(newIsSelected, newIsSelected ? orderBump : null);
  };

  const calculateDiscountedPriceInKZ = (originalPrice: string, discount: number): number => {
    // Remove caracteres não numéricos exceto vírgula e converte para número
    const numericPrice = parseFloat(originalPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (discount === 0) return numericPrice;
    
    const discountedPrice = numericPrice * (1 - discount / 100);
    return discountedPrice;
  };

  const getDisplayPrice = (originalPrice: string, discount: number): string => {
    const priceInKZ = calculateDiscountedPriceInKZ(originalPrice, discount);
    console.log(`💰 OrderBump Display Price - Original: ${originalPrice}, Discounted: ${priceInKZ}, Country: ${userCountry?.code}, Custom Prices:`, orderBump?.bump_product_custom_prices);
    return formatPrice(priceInKZ, userCountry, orderBump?.bump_product_custom_prices);
  };

  const getOriginalPrice = (originalPrice: string): string => {
    const numericPrice = parseFloat(originalPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return formatPrice(numericPrice, userCountry, orderBump?.bump_product_custom_prices);
  };

  if (loading) {
    console.log(`⏳ OrderBump: Loading para produto ${productId}, posição ${position}`);
    return null;
  }
  
  if (!orderBump) {
    console.log(`❌ OrderBump: Nenhum order bump para renderizar (produto ${productId}, posição ${position})`);
    return null;
  }
  
  console.log(`✅ OrderBump: Renderizando order bump:`, orderBump);

  return (
    <div className="space-y-3">
      {/* Ofertas limitadas header */}
      <div className="flex items-center gap-2">
        <div className="bg-gray-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
          <span>🏷️</span>
          Ofertas limitadas
        </div>
      </div>
      
      {/* Order Bump Card */}
      <div 
        className={`border-2 border-dashed rounded-lg transition-all cursor-pointer overflow-hidden max-w-md ${
          isSelected 
            ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/10 shadow-lg' 
            : 'border-orange-200 bg-white dark:bg-gray-900 hover:border-orange-300 hover:shadow-md'
        }`}
        onClick={handleToggle}
      >
        <div className="bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-950/20 dark:to-orange-900/10 p-2">
          {/* Header com título e botão */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {orderBump.title}
            </h3>
            <Button
              size="sm"
              variant="outline"
              className={`transition-all border-2 ${
                isSelected 
                  ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Conteúdo principal */}
          <div className="flex items-center gap-3">
            {orderBump.bump_product_image && orderBump.bump_type !== 'access_extension' && (
              <div className="w-12 h-12 bg-white rounded-md overflow-hidden flex-shrink-0 shadow-sm border">
                <img 
                  src={orderBump.bump_product_image} 
                  alt={orderBump.bump_product_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-0.5 text-gray-900 dark:text-gray-100 line-clamp-1">
                {orderBump.bump_product_name}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 line-clamp-1">
                {orderBump.description}
              </p>

              {/* Mostrar detalhes da extensão se for do tipo access_extension */}
              {orderBump.bump_type === 'access_extension' && (
                <div className="mb-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                    {orderBump.access_extension_type === 'lifetime' 
                      ? 'Acesso Vitalício'
                      : `⏰ +${orderBump.access_extension_value} ${
                          orderBump.access_extension_type === 'days' 
                            ? (orderBump.access_extension_value === 1 ? 'dia' : 'dias')
                            : orderBump.access_extension_type === 'months' 
                            ? (orderBump.access_extension_value === 1 ? 'mês' : 'meses')
                            : (orderBump.access_extension_value === 1 ? 'ano' : 'anos')
                        } de tempo de acesso`
                    }
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {getDisplayPrice(orderBump.bump_product_price, orderBump.discount)}
                  </span>
                  {orderBump.discount > 0 && (
                    <>
                      <span className="text-gray-500 line-through text-xs">
                        {getOriginalPrice(orderBump.bump_product_price)}
                      </span>
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                        -{orderBump.discount}% OFF
                      </span>
                    </>
                  )}
                </div>
                
                {/* Botão "Adicionar também" ao lado do preço */}
                {!isSelected && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle();
                    }}
                    size="sm"
                    className="bg-checkout-orange hover:bg-checkout-orange/90 text-white px-3 py-1 text-xs font-medium transition-all"
                  >
                    Adicionar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
