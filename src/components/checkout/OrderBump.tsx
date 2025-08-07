
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
  user_id: string; // Adicionado para garantir que apenas produtos do vendedor sejam exibidos
}

interface OrderBumpProps {
  productId: string;
  position: "before_payment_method" | "after_payment_method" | "after_customer_info";
  onToggle?: (isSelected: boolean, bumpData: OrderBumpData | null) => void;
  userCountry: CountryInfo;
  formatPrice: (priceInKZ: number, targetCountry?: CountryInfo) => string;
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
      
      // Buscar o produto principal para obter o user_id do vendedor
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('user_id')
        .eq('id', productId)
        .single();

      if (productError) {
        console.error('❌ OrderBump: Erro ao buscar produto:', productError);
        return;
      }

      if (!productData) {
        console.log('❌ OrderBump: Produto não encontrado');
        return;
      }

      // Buscar order bump apenas do mesmo vendedor
      const { data, error } = await supabase
        .from('order_bump_settings')
        .select('*')
        .eq('product_id', productId)
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
      } else {
        console.log(`❌ OrderBump: Nenhum order bump encontrado para produto ${productId} na posição ${position}`);
      }

      setOrderBump(data);
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
    return formatPrice(priceInKZ, userCountry);
  };

  const getOriginalPrice = (originalPrice: string): string => {
    const numericPrice = parseFloat(originalPrice.replace(/[^\d,]/g, '').replace(',', '.'));
    return formatPrice(numericPrice, userCountry);
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
        className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden ${
          isSelected 
            ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/10 shadow-lg' 
            : 'border-orange-200 bg-white dark:bg-gray-900 hover:border-orange-300 hover:shadow-md'
        }`}
        onClick={handleToggle}
      >
        <div className="bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-950/20 dark:to-orange-900/10 p-4">
          {/* Header com título e botão */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              {orderBump.title}
            </h3>
            <Button
              size="sm"
              variant="outline"
              className={`transition-all border-2 ${
                isSelected 
                  ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
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
          <div className="flex items-start gap-4">
            {orderBump.bump_product_image && (
              <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm border">
                <img 
                  src={orderBump.bump_product_image} 
                  alt={orderBump.bump_product_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100 line-clamp-2">
                {orderBump.bump_product_name}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                {orderBump.description}
              </p>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {getDisplayPrice(orderBump.bump_product_price, orderBump.discount)}
                </span>
                {orderBump.discount > 0 && (
                  <>
                    <span className="text-gray-500 line-through text-base">
                      {getOriginalPrice(orderBump.bump_product_price)}
                    </span>
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      -{orderBump.discount}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Botão de ação */}
          <Button 
            className={`w-full mt-4 transition-all rounded-xl py-3 font-semibold ${
              isSelected 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            {isSelected ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Produto Adicionado
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Produto
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
