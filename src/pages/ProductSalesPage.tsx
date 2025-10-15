import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, CheckCircle2, User } from "lucide-react";
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

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <img 
              src={kambaFyLogo}
              alt="Kambafy" 
              className="h-8"
            />
            <Button onClick={handleGoToCheckout} size="sm">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Ir para Checkout
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
              {/* Product Image */}
              <div className="order-2 md:order-1">
                <div className="aspect-square rounded-xl overflow-hidden shadow-2xl">
                  <img
                    src={product.cover}
                    alt={product.image_alt || product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Product Info */}
              <div className="order-1 md:order-2 space-y-6">
                <Badge className="text-sm">{product.type}</Badge>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                  {product.name}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
                
                {/* Price */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="text-sm text-muted-foreground mb-2">Preço</div>
                  <div className="text-4xl font-bold text-primary mb-4">
                    {priceFormatted} KZ
                  </div>
                  <Button 
                    onClick={handleGoToCheckout} 
                    size="lg" 
                    className="w-full text-lg h-14"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Comprar Agora
                  </Button>
                </div>

                {/* Seller Info */}
                {product.profiles && (
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {product.profiles.avatar_url ? (
                        <img src={product.profiles.avatar_url} alt={product.profiles.business_name || product.profiles.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Vendido por</div>
                      <div className="font-semibold">{product.profiles.business_name || product.profiles.full_name}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12">O que você vai receber</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Acesso Imediato</h3>
                <p className="text-muted-foreground">Receba acesso ao produto assim que o pagamento for confirmado</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Suporte Dedicado</h3>
                <p className="text-muted-foreground">Tire suas dúvidas diretamente com o vendedor</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Garantia de Qualidade</h3>
                <p className="text-muted-foreground">Produto verificado pela plataforma Kambafy</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pronto para começar?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Garanta seu acesso agora por apenas {priceFormatted} KZ
            </p>
            <Button 
              onClick={handleGoToCheckout} 
              size="lg" 
              variant="secondary"
              className="text-lg h-14 px-8"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Comprar Agora
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-card py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© 2025 Kambafy. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
