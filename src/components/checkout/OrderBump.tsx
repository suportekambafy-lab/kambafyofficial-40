
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
  // Campos para extensões de acesso
  bump_type?: string;
  access_extension_type?: string;
  access_extension_value?: number;
  access_extension_description?: string;
}

interface OrderBumpProps {
  productId: string;
  position: "before_payment_method" | "after_payment_method" | "after_customer_info";
  onToggle?: (isSelected: boolean, bumpData: OrderBumpData | null) => void;
  userCountry: CountryInfo;
  formatPrice: (priceInKZ: number, targetCountry?: CountryInfo) => string;
}

export function OrderBump({ productId, position, onToggle, userCountry, formatPrice }: OrderBumpProps) {
  const [orderBumps, setOrderBumps] = useState<OrderBumpData[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderBumps();
  }, [productId]);

  const fetchOrderBumps = async () => {
    try {
      setLoading(true);
      console.log(`🔍 OrderBump: Buscando order bumps para produto ${productId}, posição ${position}`);
      
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

      // Usar o ID real do produto para buscar os order bumps
      const actualProductId = productData.id;

      // Buscar todos os order bumps do mesmo vendedor na posição especificada
      const { data, error } = await supabase
        .from('order_bump_settings')
        .select('*')
        .eq('product_id', actualProductId)
        .eq('enabled', true)
        .eq('position', position)
        .eq('user_id', productData.user_id) // Garantir que seja do mesmo vendedor
        .order('created_at', { ascending: true }); // Ordenar por data de criação

      console.log(`📊 OrderBump: Resultado da busca:`, { data, error, productId, position, enabled: true });

      if (error) {
        console.error('❌ OrderBump: Erro ao buscar order bumps:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`✅ OrderBump: ${data.length} order bump(s) encontrado(s):`, data);
        data.forEach((bump, index) => {
          console.log(`📋 Bump ${index + 1} - Tipo:`, bump.bump_type);
          console.log(`⏰ Extensão - Tipo:`, bump.access_extension_type, `Valor:`, bump.access_extension_value);
        });
      } else {
        console.log(`❌ OrderBump: Nenhum order bump encontrado para produto ${productId} na posição ${position}`);
      }

      setOrderBumps(data || []);
    } catch (error) {
      console.error('Error fetching order bumps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (bumpId: string, orderBump: OrderBumpData) => {
    const newSelectedBumps = new Set(selectedBumps);
    const isCurrentlySelected = newSelectedBumps.has(bumpId);
    
    if (isCurrentlySelected) {
      newSelectedBumps.delete(bumpId);
    } else {
      newSelectedBumps.add(bumpId);
    }
    
    setSelectedBumps(newSelectedBumps);
    
    // Notificar o componente pai sobre todas as seleções
    const selectedBumpData = Array.from(newSelectedBumps).map(id => 
      orderBumps.find(bump => bump.id === id)
    ).filter(Boolean);
    
    onToggle?.(newSelectedBumps.size > 0, selectedBumpData.length > 0 ? selectedBumpData[0] : null);
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
  
  if (orderBumps.length === 0) {
    console.log(`❌ OrderBump: Nenhum order bump para renderizar (produto ${productId}, posição ${position})`);
    return null;
  }
  
  console.log(`✅ OrderBump: Renderizando ${orderBumps.length} order bump(s):`, orderBumps);

  return (
    <div className="space-y-4">
      {/* Ofertas limitadas header */}
      <div className="flex items-center gap-2">
        <div className="bg-gray-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">
          <span>🏷️</span>
          Ofertas limitadas
        </div>
      </div>
      
      {/* Renderizar todos os order bumps */}
      {orderBumps.map((orderBump) => {
        const isSelected = selectedBumps.has(orderBump.id);
        
        return (
          <div key={orderBump.id}>
            {/* Order Bump Card - Layout diferente para extensões */}
            {orderBump.bump_type === 'access_extension' ? (
              // Layout especial para extensões de acesso - design azul simples
              <div 
                className={`border-2 rounded-xl transition-all cursor-pointer overflow-hidden max-w-md ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg' 
                    : 'border-blue-200 bg-white dark:bg-gray-900 hover:border-blue-300 hover:shadow-md'
                }`}
                onClick={() => handleToggle(orderBump.id, orderBump)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`transition-all ${
                        isSelected 
                          ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                          : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(orderBump.id, orderBump);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Título */}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {orderBump.access_extension_type === 'lifetime' 
                      ? 'Acesso Vitalício'
                      : `+ ${orderBump.access_extension_value} ${
                          orderBump.access_extension_type === 'days' 
                            ? (orderBump.access_extension_value === 1 ? 'mês' : 'meses')
                            : orderBump.access_extension_type === 'months' 
                            ? (orderBump.access_extension_value === 1 ? 'mês' : 'meses')
                            : 'de acesso'
                        }`
                    }
                  </h3>
                  
                  {/* Descrição */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {orderBump.access_extension_description || orderBump.description}
                  </p>
                  
                  {/* Preço */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {getDisplayPrice(orderBump.bump_product_price, orderBump.discount)}
                    </span>
                    {orderBump.discount > 0 && (
                      <>
                        <span className="text-gray-500 line-through text-sm">
                          {getOriginalPrice(orderBump.bump_product_price)}
                        </span>
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                          -{orderBump.discount}% OFF
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Layout padrão para produtos normais
              <div 
                className={`border-2 border-dashed rounded-lg transition-all cursor-pointer overflow-hidden max-w-md ${
                  isSelected 
                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/10 shadow-lg' 
                    : 'border-orange-200 bg-white dark:bg-gray-900 hover:border-orange-300 hover:shadow-md'
                }`}
                onClick={() => handleToggle(orderBump.id, orderBump)}
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
                          ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(orderBump.id, orderBump);
                      }}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Conteúdo principal */}
                  <div className="flex items-center gap-3">
                    {orderBump.bump_product_image && (
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
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
