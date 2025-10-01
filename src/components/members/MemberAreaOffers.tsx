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
  const handleOfferClick = async (offer: MemberAreaOffer) => {
    try {
      // Buscar dados completos do produto
      const {
        data: product,
        error
      } = await supabase.from('products').select('share_link').eq('id', offer.product_id).single();
      if (error) throw error;
      if (product?.share_link) {
        window.open(product.share_link, '_blank');
      } else {
        toast.error('Link do produto não encontrado');
      }
    } catch (error) {
      console.error('Erro ao abrir produto:', error);
      toast.error('Erro ao abrir produto');
    }
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
        {/* Header */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center mb-12">
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Aproveite Nossas Ofertas
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Produtos especiais selecionados para você continuar sua jornada
          </p>
        </motion.div>

        {/* Grid de Ofertas */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer, index) => <motion.div key={offer.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: index * 0.1
        }}>
              <Card className="group overflow-hidden border-border/50 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                <CardContent className="p-0">
                  {/* Imagem */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-500/10 to-purple-500/10">
                    {offer.image_url ? <img src={offer.image_url} alt={offer.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground/30" />
                      </div>}
                    
                    {offer.discount_percentage > 0 && <div className="absolute top-4 right-4">
                        <Badge className="bg-red-500 text-white font-bold shadow-lg">
                          -{offer.discount_percentage}%
                        </Badge>
                      </div>}
                  </div>

                  {/* Conteúdo */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                      {offer.title}
                    </h3>
                    
                    {offer.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {offer.description}
                      </p>}

                    {/* Preço */}
                    <div className="flex items-center gap-3 mb-4">
                      {offer.discount_percentage > 0 ? <>
                          <span className="text-sm text-muted-foreground line-through">
                            {offer.price} KZ
                          </span>
                          <span className="text-2xl font-bold text-emerald-400">
                            {calculateDiscountedPrice(offer.price, offer.discount_percentage)} KZ
                          </span>
                        </> : <span className="text-2xl font-bold text-emerald-400">
                          {offer.price} KZ
                        </span>}
                    </div>

                    {/* Botão de Ação */}
                    <Button onClick={() => handleOfferClick(offer)} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 group">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Ver Oferta
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>)}
        </div>
      </div>
    </section>;
}