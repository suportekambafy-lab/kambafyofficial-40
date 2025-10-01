import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Sparkles, Tag, ArrowRight, Package } from 'lucide-react';
import { toast } from 'sonner';
interface MemberAreaOffer {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: string;
  discount_percentage: number;
  enabled: boolean;
}
interface MemberAreaOffersProps {
  memberAreaId: string;
}
export function MemberAreaOffers({
  memberAreaId
}: MemberAreaOffersProps) {
  const [offers, setOffers] = useState<MemberAreaOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    loadOffers();
  }, [memberAreaId]);
  const loadOffers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('member_area_offers').select('*').eq('member_area_id', memberAreaId).eq('enabled', true).order('order_number');
      if (error) throw error;
      setOffers(data || []);
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
  const calculateDiscountedPrice = (price: string, discount: number) => {
    const numPrice = parseFloat(price.replace(/[^\d.-]/g, ''));
    const discountedPrice = numPrice - numPrice * discount / 100;
    return discountedPrice.toFixed(2);
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
                              {offer.price} KZ
                            </span>
                            <span className="text-lg font-bold text-emerald-400">
                              {calculateDiscountedPrice(offer.price, offer.discount_percentage)} KZ
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-emerald-400">
                            {offer.price} KZ
                          </span>
                        )}
                      </div>

                      {/* Botão de Ação */}
                      <Button 
                        onClick={() => handleOfferClick(offer)} 
                        size="sm"
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Ver Oferta
                        <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
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