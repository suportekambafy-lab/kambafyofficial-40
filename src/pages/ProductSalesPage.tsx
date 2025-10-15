import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import kambaFyLogo from "@/assets/kambafy-logo.png";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  cover: string;
  type: string;
  user_id: string;
  image_alt?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  profiles?: {
    full_name: string;
    business_name?: string;
    avatar_url?: string;
  };
}

interface FAQ {
  question: string;
  answer: string;
}

export default function ProductSalesPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [faqs] = useState<FAQ[]>([
    {
      question: "Como funciona o acesso ao produto?",
      answer: "Após a confirmação do pagamento, você receberá um email com as instruções de acesso ao produto. O acesso é imediato para pagamentos aprovados."
    },
    {
      question: "Quais são as formas de pagamento aceitas?",
      answer: "Aceitamos pagamentos via transferência bancária, KambaPay e outros métodos disponíveis no checkout."
    },
    {
      question: "Posso solicitar reembolso?",
      answer: "Sim, temos uma política de reembolso. Entre em contato com o suporte através do vendedor para mais informações."
    },
    {
      question: "O produto tem garantia?",
      answer: "Sim, oferecemos garantia de satisfação. Caso não fique satisfeito, você pode solicitar reembolso conforme nossa política."
    }
  ]);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;

    try {
      setLoading(true);
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles:user_id (
            full_name,
            business_name,
            avatar_url
          )
        `)
        .eq(isUUID ? 'id' : 'slug', productId)
        .eq('status', 'Ativo')
        .single();

      if (error) throw error;
      
      setProduct(data);
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCheckout = () => {
    if (product) {
      navigate(`/checkout/${product.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Produto não encontrado</h2>
          <p className="text-muted-foreground mb-4">O produto que você está procurando não existe ou não está mais disponível.</p>
          <Button onClick={() => navigate('/')}>Voltar para Home</Button>
        </Card>
      </div>
    );
  }

  const priceFormatted = parseFloat(product.price).toLocaleString('pt-BR');

  return (
    <>
      <Helmet>
        <title>{product.seo_title || product.name}</title>
        <meta name="description" content={product.seo_description || product.description || ''} />
        {product.seo_keywords && product.seo_keywords.length > 0 && (
          <meta name="keywords" content={product.seo_keywords.join(', ')} />
        )}
        <meta property="og:title" content={product.seo_title || product.name} />
        <meta property="og:description" content={product.seo_description || product.description || ''} />
        {product.cover && <meta property="og:image" content={product.cover} />}
      </Helmet>

      <div className="min-h-screen bg-background pb-24 md:pb-0">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <img 
              src={kambaFyLogo}
              alt="Kambafy" 
              className="h-6 md:h-8"
            />
            <Button onClick={handleGoToCheckout} size="sm" variant="ghost" className="md:hidden">
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <section className="py-4 md:py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Product Header - Compact */}
            <div className="flex gap-3 md:gap-4 items-start mb-4">
              {/* Product Image - Smaller */}
              <div className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-lg overflow-hidden shadow-md">
                <img
                  src={product.cover}
                  alt={product.image_alt || product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Info - Beside Image */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold leading-tight mb-1">
                  {product.name}
                </h1>
                {product.profiles && (
                  <div className="text-xs md:text-sm text-muted-foreground">
                    {product.profiles.business_name || product.profiles.full_name}
                  </div>
                )}
              </div>
            </div>

            {/* Product Details Card */}
            <Card className="mb-4">
              <CardContent className="p-3 md:p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <span className="text-muted-foreground">Formato:</span>
                  <span className="font-medium">{product.type}</span>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <div className="mb-4">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Benefits - Compact */}
            <div className="space-y-2 md:space-y-3 mb-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs md:text-sm font-semibold">Acesso Imediato</h3>
                  <p className="text-xs text-muted-foreground">Receba acesso após confirmação</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs md:text-sm font-semibold">Suporte Dedicado</h3>
                  <p className="text-xs text-muted-foreground">Tire dúvidas com o vendedor</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs md:text-sm font-semibold">Garantia de Qualidade</h3>
                  <p className="text-xs text-muted-foreground">Produto verificado pela Kambafy</p>
                </div>
              </div>
            </div>

            {/* FAQ Section - Compact */}
            <div className="mb-4">
              <h2 className="text-base md:text-lg font-bold mb-3">Perguntas Frequentes</h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-xs md:text-sm py-3">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Price and CTA - Sticky Bottom on Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg md:static md:border-0 md:shadow-none z-40">
          <div className="container mx-auto px-4 py-3 md:py-6 max-w-4xl">
            <div className="flex items-center justify-between gap-3 md:gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Preço</div>
                <div className="text-xl md:text-2xl font-bold text-primary">
                  {priceFormatted} KZ
                </div>
              </div>
              <Button 
                onClick={handleGoToCheckout} 
                size="lg"
                className="flex-shrink-0"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Comprar
              </Button>
            </div>
          </div>
        </div>

        {/* Footer - Hidden on mobile due to sticky bottom */}
        <footer className="border-t bg-card py-4 mt-8 hidden md:block">
          <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
            <p>© 2025 Kambafy. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
