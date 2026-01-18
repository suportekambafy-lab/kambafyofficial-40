import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  Loader2, 
  Percent, 
  ExternalLink,
  Copy,
  CheckCircle,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { toast } from '@/hooks/useCustomToast';

interface AffiliateProduct {
  id: string;
  name: string;
  cover: string;
  price: string;
  status: string;
  affiliate_code: string;
  commission_rate: string;
}

export function MyAffiliationsTab() {
  const { user } = useAuth();

  const { data: affiliations = [], isLoading } = useOptimizedQuery(
    ['my-affiliations', user?.id],
    async () => {
      if (!user) return [];

      // Buscar relações de afiliação ativas
      const { data: affiliateRelations, error: affiliateError } = await supabase
        .from('affiliates')
        .select('commission_rate, status, product_id, affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'ativo');

      if (affiliateError) {
        console.error('Erro ao buscar afiliações:', affiliateError);
        throw affiliateError;
      }

      if (!affiliateRelations || affiliateRelations.length === 0) {
        return [];
      }

      // Buscar os produtos correspondentes
      const productIds = affiliateRelations.map(rel => rel.product_id);
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, cover, price, status')
        .in('id', productIds);

      if (productsError) {
        console.error('Erro ao buscar produtos:', productsError);
        throw productsError;
      }

      // Combinar dados
      return (products || []).map(product => {
        const relation = affiliateRelations.find(rel => rel.product_id === product.id);
        return {
          ...product,
          affiliate_code: relation?.affiliate_code || '',
          commission_rate: relation?.commission_rate || '10%'
        } as AffiliateProduct;
      });
    },
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const copyAffiliateLink = (product: AffiliateProduct) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/checkout/${product.id}?ref=${product.affiliate_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link de afiliado foi copiado para a área de transferência."
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (affiliations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma afiliação ativa
          </h3>
          <p className="text-muted-foreground max-w-md">
            Explore o marketplace para encontrar produtos e solicitar afiliação. 
            Você receberá comissões por cada venda realizada através do seu link.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {affiliations.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {product.cover ? (
                <img 
                  src={product.cover} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}
              <Badge className="absolute top-2 right-2 bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Afiliado
              </Badge>
            </div>
            
            <CardContent className="p-4 space-y-3">
              <h3 className="font-medium line-clamp-2">{product.name}</h3>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Percent className="w-3.5 h-3.5" />
                  <span>Comissão:</span>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {product.commission_rate}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyAffiliateLink(product)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar Link
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  asChild
                >
                  <a href={`/checkout/${product.id}?ref=${product.affiliate_code}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
