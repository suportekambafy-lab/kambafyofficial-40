import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Sparkles, Tag, ArrowRight, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { formatPrice } from '@/utils/priceFormatting';

interface MemberAreaOffer {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: string;
  discount_percentage: number;
  enabled: boolean;
  custom_prices?: Record<string, string>;
  hasAccess?: boolean;
}

interface MemberAreaOffersProps {
  memberAreaId: string;
}

export function MemberAreaOffers({
  memberAreaId
}: MemberAreaOffersProps) {
  const [offers, setOffers] = useState<MemberAreaOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { userCountry, isReady } = useGeoLocation();

  useEffect(() => {
    getUserEmail();
    loadOffers();
  }, [memberAreaId]);

  const getUserEmail = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const email = session.user.email.toLowerCase().trim();
        setUserEmail(email);
        // Recarregar ofertas com verificação de acesso
        await loadOffersWithAccess(email);
      }
    } catch (error) {
      console.error('Erro ao buscar email do usuário:', error);
    }
  };

  const loadOffersWithAccess = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('member_area_offers')
        .select(`
          *,
          products!inner(custom_prices)
        `)
        .eq('member_area_id', memberAreaId)
        .eq('enabled', true)
        .order('order_number');
      
      if (error) throw error;
      
      const offersWithCustomPrices = (data || []).map(offer => ({
        id: offer.id,
        product_id: offer.product_id,
        title: offer.title,
        description: offer.description,
        image_url: offer.image_url,
        price: offer.price,
        discount_percentage: offer.discount_percentage,
        enabled: offer.enabled,
        custom_prices: (offer.products?.custom_prices as Record<string, string>) || {}
      }));
      
      // Verificar acesso do usuário para cada oferta
      const productIds = offersWithCustomPrices.map(o => o.product_id);
      
      const { data: accessData } = await supabase
        .from('customer_access')
        .select('product_id, customer_email, is_active')
        .ilike('customer_email', email)
        .in('product_id', productIds)
        .eq('is_active', true);
      
      const accessedProductIds = new Set(accessData?.map(a => a.product_id) || []);
      
      const offersWithAccess = offersWithCustomPrices.map(offer => ({
        ...offer,
        hasAccess: accessedProductIds.has(offer.product_id)
      }));
      
      setOffers(offersWithAccess);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao carregar ofertas com acesso:', error);
      setIsLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('member_area_offers')
        .select(`
          *,
          products!inner(custom_prices)
        `)
        .eq('member_area_id', memberAreaId)
        .eq('enabled', true)
        .order('order_number');
      
      if (error) throw error;
      
      const offersWithCustomPrices = (data || []).map(offer => ({
        id: offer.id,
        product_id: offer.product_id,
        title: offer.title,
        description: offer.description,
        image_url: offer.image_url,
        price: offer.price,
        discount_percentage: offer.discount_percentage,
        enabled: offer.enabled,
        custom_prices: (offer.products?.custom_prices as Record<string, string>) || {},
        hasAccess: false // Default sem acesso
      }));
      
      setOffers(offersWithCustomPrices);
    } catch (error) {
      console.error('Erro ao carregar ofertas:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleOfferClick = (offer: MemberAreaOffer) => {
    // Construir URL do checkout
    const checkoutUrl = `/checkout/${offer.product_id}`;
    window.open(checkoutUrl, '_blank');
  };
  const getFormattedPrice = (offer: MemberAreaOffer) => {
    const priceInKZ = parseFloat(offer.price.replace(/[^\d.-]/g, ''));
    return formatPrice(priceInKZ, userCountry, true, offer.custom_prices);
  };

  const getDiscountedPrice = (offer: MemberAreaOffer) => {
    const priceInKZ = parseFloat(offer.price.replace(/[^\d.-]/g, ''));
    const discountedPriceInKZ = priceInKZ - (priceInKZ * offer.discount_percentage / 100);
    return formatPrice(discountedPriceInKZ, userCountry, true, offer.custom_prices);
  };
  if (isLoading) {
    return null;
  }
  if (offers.length === 0) {
    return null;
  }
  return <section className="py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header - Seguindo padrão dos módulos */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-white mb-3">
            Aproveite Nossas Ofertas
          </h2>
          <p className="text-gray-400 text-lg">
            Produtos especiais selecionados para você continuar sua jornada
          </p>
        </motion.div>

        {/* Carrossel de Ofertas - Estilo Netflix */}
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide scroll-smooth">
            <div className="flex gap-4 min-w-max">
              {offers.map((offer, index) => (
                <motion.div 
                  key={offer.id} 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  className="group cursor-pointer flex-shrink-0 w-64"
                >
                  <Card className="overflow-hidden bg-gray-900 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 border border-gray-800 hover:border-emerald-500/50 transform-gpu">
                    {/* Imagem */}
                    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-emerald-500/10 to-purple-500/10">
                      {offer.image_url ? (
                        <img 
                          src={offer.image_url} 
                          alt={offer.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-600" />
                        </div>
                      )}
                      
                      {offer.discount_percentage > 0 && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-500 text-white font-bold shadow-lg text-xs">
                            -{offer.discount_percentage}%
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <CardContent className="p-4">
                      <h3 className="text-base font-bold mb-1 text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {offer.title}
                      </h3>
                      
                      {offer.description && (
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                          {offer.description}
                        </p>
                      )}

                      {/* Preço */}
                      <div className="flex items-center gap-2 mb-3">
                        {offer.discount_percentage > 0 ? (
                          <>
                            <span className="text-xs text-gray-500 line-through">
                              {getFormattedPrice(offer)}
                            </span>
                            <span className="text-lg font-bold text-emerald-400">
                              {getDiscountedPrice(offer)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-emerald-400">
                            {getFormattedPrice(offer)}
                          </span>
                        )}
                      </div>

                      {/* Botão de Ação */}
                      {offer.hasAccess ? (
                        <Button 
                          size="sm"
                          disabled
                          className="w-full bg-gray-700 text-gray-300 cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Você já tem acesso
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleOfferClick(offer)} 
                          size="sm"
                          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Ver Oferta
                          <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>;
}