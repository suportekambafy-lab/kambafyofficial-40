import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, ShoppingCart, CheckCircle2, Star, Menu, ChevronRight, HelpCircle, Search, ChevronDown, Home, Share2, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Helmet } from "react-helmet-async";
import useEmblaCarousel from "embla-carousel-react";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { formatPrice } from "@/utils/priceFormatting";
import kambaFyLogo from "@/assets/kambafy-marketplace-logo.png";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  cover: string;
  type: string;
  user_id: string;
  slug?: string;
  image_alt?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  custom_prices?: Record<string, string>;
  profiles?: {
    full_name: string;
    business_name?: string;
    avatar_url?: string;
    bio?: string;
    created_at?: string;
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
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [reviewsEmblaRef] = useEmblaCarousel({ loop: true, align: 'start' });
  const [productsEmblaRef] = useEmblaCarousel({ loop: false, align: 'start' });
  const { userCountry } = useGeoLocation();
  
  const reviews = [
    {
      rating: 5,
      comment: "Excelente produto! Superou minhas expectativas. Recomendo muito!",
      author: "Cliente verificado"
    },
    {
      rating: 5,
      comment: "Muito bom! Conteúdo de qualidade e bem explicado.",
      author: "Cliente verificado"
    },
    {
      rating: 4,
      comment: "Produto bom, valeu a pena o investimento.",
      author: "Cliente verificado"
    },
    {
      rating: 5,
      comment: "Adorei! Material completo e de fácil compreensão.",
      author: "Cliente verificado"
    },
    {
      rating: 5,
      comment: "Melhor compra que fiz este ano. Vale cada centavo!",
      author: "Cliente verificado"
    }
  ];
  
  const categories = [
    "Animais e Pets",
    "Autoconhecimento e espiritualidade",
    "Carreira e desenvolvimento pessoal",
    "Culinária e gastronomia",
    "Design e fotografia",
    "Educação infantil e família",
    "Engenharia e arquitetura",
    "Ensino e estudo académico",
    "Finanças e negócios",
    "Hobbies e Lazer",
    "Manutenção de equipamentos",
    "Marketing e vendas"
  ];
  
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
          custom_prices,
          profiles:user_id (
            full_name,
            business_name,
            avatar_url,
            bio,
            created_at
          )
        `)
        .eq(isUUID ? 'id' : 'slug', productId)
        .eq('status', 'Ativo')
        .single();

      if (error) throw error;
      
      // Cast custom_prices para o tipo correto
      const productData = {
        ...data,
        custom_prices: data.custom_prices as unknown as Record<string, string>
      } as Product;
      
      setProduct(productData);
      
      // Carregar outros produtos do mesmo vendedor
      if (productData?.user_id) {
        const { data: related } = await supabase
          .from('products')
          .select('id, name, description, price, cover, type, slug, user_id, custom_prices')
          .eq('user_id', productData.user_id)
          .eq('status', 'Ativo')
          .neq('id', productData.id)
          .limit(3);
        
        if (related) {
          // Cast custom_prices para o tipo correto
          const relatedWithCorrectTypes = related.map(p => ({
            ...p,
            custom_prices: p.custom_prices as unknown as Record<string, string>
          }));
          setRelatedProducts(relatedWithCorrectTypes);
        }
      }
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

  const priceInKZ = parseFloat(product.price);
  const priceFormatted = formatPrice(priceInKZ, userCountry, true, product.custom_prices);
  
  // Calcular tempo de cadastro no Kambafy
  const getTimeOnPlatform = () => {
    if (!product.profiles?.created_at) return { value: 0, unit: 'Dias' };
    const createdDate = new Date(product.profiles.created_at);
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return { value: Math.max(1, diffDays), unit: diffDays === 1 ? 'Dia' : 'Dias' };
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return { value: weeks, unit: weeks === 1 ? 'Semana' : 'Semanas' };
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return { value: months, unit: months === 1 ? 'Mês' : 'Meses' };
    } else {
      const years = Math.floor(diffDays / 365);
      return { value: years, unit: years === 1 ? 'Ano' : 'Anos' };
    }
  };
  
  const timeOnPlatform = getTimeOnPlatform();

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
          <div className="container mx-auto px-4 py-3">
            {/* Mobile Header */}
            <div className="flex items-center justify-between md:hidden">
              {/* Menu Button - Left */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full">
                  {/* Action Buttons */}
                  <div className="flex gap-3 mb-6 px-2 pt-6">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs whitespace-normal h-auto py-3"
                      onClick={() => {
                        navigate('/cliente/meus-produtos');
                        setMenuOpen(false);
                      }}
                    >
                      Acessar meu curso
                    </Button>
                    <Button 
                      className="flex-1 text-xs whitespace-normal h-auto py-3"
                      onClick={() => {
                        navigate('/vendedor/produtos');
                        setMenuOpen(false);
                      }}
                    >
                      Criar um curso
                    </Button>
                  </div>

                  {/* Categories */}
                  <nav className="space-y-1">
                    {categories.map((category) => (
                      <button
                        key={category}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted rounded-lg transition-colors"
                        onClick={() => {
                          // Navegação futura para categorias
                          setMenuOpen(false);
                        }}
                      >
                        <span className="text-sm">{category}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Logo - Center */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <img 
                  src={kambaFyLogo}
                  alt="Kambafy Marketplace" 
                  className="h-10"
                />
              </div>

              {/* Cart Button - Right */}
              <Button onClick={handleGoToCheckout} size="sm" variant="ghost">
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex items-center gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                <img 
                  src={kambaFyLogo}
                  alt="Kambafy Marketplace" 
                  className="h-10"
                />
              </div>

              {/* Categories Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    Categorias
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {categories.map((category) => (
                    <DropdownMenuItem key={category}>
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search Bar */}
              <div className="flex-1 max-w-xl relative">
                <Input 
                  type="text"
                  placeholder="O que você quer aprender?"
                  className="w-full pr-10"
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-0 top-0 h-full"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/cliente/meus-produtos')}
                >
                  Acessar meu curso
                </Button>
                <Button 
                  onClick={() => navigate('/vendedor/produtos')}
                >
                  Criar um curso
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Two Column Layout on Desktop */}
        <section className="py-4 md:py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Breadcrumb - Desktop Only */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Home className="w-4 h-4" />
              <span>Home</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground line-clamp-1">{product.name}</span>
            </div>

            <div className="md:grid md:grid-cols-[1fr_350px] md:gap-8">
              {/* Left Column - Product Info */}
              <div>
                {/* Product Header - Mobile Only */}
                <div className="flex gap-3 items-start mb-4 md:hidden">
                  <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden shadow-md">
                    <img
                      src={product.cover}
                      alt={product.image_alt || product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold leading-tight mb-1">
                      {product.name}
                    </h1>
                    {product.profiles && (
                      <div className="text-xs text-muted-foreground">
                        {product.profiles.business_name || product.profiles.full_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Title */}
                <div className="hidden md:block mb-6">
                  <h1 className="text-3xl font-bold">
                    {product.name}
                  </h1>
                </div>

                {/* Desktop: Image + Description Side by Side */}
                <div className="hidden md:grid md:grid-cols-[240px_1fr] md:gap-6 md:mb-6">
                  {/* Product Image - Smaller */}
                  <div className="flex-shrink-0">
                    <img
                      src={product.cover}
                      alt={product.image_alt || product.name}
                      className="w-full rounded-lg shadow-md"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Mobile Product Details Card */}
                <Card className="mb-4 md:hidden">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Formato:</span>
                      <span className="font-medium">{product.type}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Mobile Description */}
                <div className="mb-6 md:hidden">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Detalhes Section - Desktop */}
                <div className="hidden md:block mb-6">
                  <h2 className="text-xl font-bold mb-4">Detalhes</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold">Garantia de 15 dias</h3>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Smartphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-semibold">Estude do seu jeito e em qualquer dispositivo</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benefits - Mobile Only */}
                <div className="space-y-3 mb-6 md:hidden">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-semibold">Acesso Imediato</h3>
                      <p className="text-xs text-muted-foreground">Receba acesso após confirmação</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-semibold">Suporte Dedicado</h3>
                      <p className="text-xs text-muted-foreground">Tire dúvidas com o vendedor</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-semibold">Garantia de Qualidade</h3>
                      <p className="text-xs text-muted-foreground">Produto verificado pela Kambafy</p>
                    </div>
                  </div>
                </div>

                {/* About the Creator Section */}
                {product.profiles && (
                  <div className="mb-6">
                    <h2 className="text-base md:text-lg font-bold mb-4">Saiba mais sobre quem criou o conteúdo</h2>
                    <Card>
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start gap-4">
                          {product.profiles.avatar_url && (
                            <div className="flex-shrink-0">
                              <img
                                src={product.profiles.avatar_url}
                                alt={product.profiles.business_name || product.profiles.full_name}
                                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-semibold mb-2">
                              {product.profiles.business_name || product.profiles.full_name}
                            </h3>
                            {product.profiles.bio && (
                              <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                                {product.profiles.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Reviews Section - Carousel */}
                <div className="mb-6">
                  <h2 className="text-base md:text-lg font-bold mb-4">Avaliações do produto</h2>
                  <div className="overflow-hidden" ref={reviewsEmblaRef}>
                    <div className="flex gap-4">
                      {reviews.map((review, index) => (
                        <div key={index} className="flex-[0_0_85%] md:flex-[0_0_45%] min-w-0">
                          <Card>
                            <CardContent className="p-4 md:p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                      key={star} 
                                      className={`w-4 h-4 ${star <= review.rating ? 'fill-primary text-primary' : 'text-muted'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 min-h-[60px]">
                                "{review.comment}"
                              </p>
                              <span className="text-xs text-muted-foreground">- {review.author}</span>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="flex gap-1">
                      {reviews.map((_, index) => (
                        <div 
                          key={index} 
                          className="w-2 h-2 rounded-full bg-muted"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Related Products Section - Carousel */}
                {relatedProducts.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-base md:text-lg font-bold mb-4">Outros produtos de quem criou esse conteúdo</h2>
                    <div className="overflow-hidden" ref={productsEmblaRef}>
                      <div className="flex gap-4">
                        {relatedProducts.map((relatedProduct) => (
                          <div key={relatedProduct.id} className="flex-[0_0_85%] md:flex-[0_0_30%] min-w-0">
                            <Card 
                              className="cursor-pointer hover:shadow-lg transition-shadow h-full"
                              onClick={() => navigate(`/produto/${relatedProduct.slug || relatedProduct.id}`)}
                            >
                              <CardContent className="p-4">
                                <img
                                  src={relatedProduct.cover}
                                  alt={relatedProduct.name}
                                  className="w-full h-32 object-cover rounded-md mb-3"
                                />
                                <h3 className="text-sm font-semibold mb-2 line-clamp-2 min-h-[40px]">
                                  {relatedProduct.name}
                                </h3>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-primary">
                                    {formatPrice(parseFloat(relatedProduct.price), userCountry, true, relatedProduct.custom_prices)}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {relatedProduct.type}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* FAQ Section - Mobile Modal / Desktop Accordion */}
                <div className="mb-4">
                  {/* Mobile: Button to open modal */}
                  <div className="md:hidden">
                    <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
                      <DialogTrigger asChild>
                        <button className="w-full">
                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <HelpCircle className="w-5 h-5 text-primary" />
                                <span className="font-semibold">Dúvidas frequentes</span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-lg">
                            <HelpCircle className="w-5 h-5" />
                            Dúvidas frequentes
                          </DialogTitle>
                        </DialogHeader>
                        <Accordion type="single" collapsible className="w-full">
                          {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                              <AccordionTrigger className="text-left text-sm py-3">
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent className="text-sm text-muted-foreground">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Disclaimer text - Outside modal */}
                    <div className="mt-3 px-2 text-center text-xs text-muted-foreground">
                      <p>O conteúdo deste produto não representa a opinião da Kambafy.</p>
                      <p>
                        Se você vir informações inadequadas,{' '}
                        <button
                          onClick={() => navigate('/denuncia')}
                          className="text-primary underline hover:text-primary/80"
                        >
                          denuncie aqui
                        </button>
                      </p>
                    </div>
                  </div>

                  {/* Desktop: Regular Accordion */}
                  <div className="hidden md:block">
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
              </div>

              {/* Right Column - Purchase Card (Desktop Only) */}
              <div className="hidden md:block">
                <Card className="sticky top-24">
                  <CardContent className="p-6 space-y-4">
                    {/* Price */}
                    <div>
                      <div className="text-3xl font-bold text-primary mb-1">
                        {priceFormatted}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        por mês
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button 
                      onClick={handleGoToCheckout} 
                      size="lg"
                      className="w-full"
                    >
                      Ir para o carrinho
                    </Button>

                    {/* Features */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Garantia de 15 dias</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Smartphone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Estude do seu jeito e em qualquer dispositivo</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Format & Category */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Formato: </span>
                        <span className="text-sm font-medium">{product.type}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Categoria: </span>
                        <span className="text-sm font-medium">Finanças e Investimentos</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Creator Profile */}
                    {product.profiles && (
                      <div>
                        <div className="flex items-center gap-3">
                          {product.profiles.avatar_url && (
                            <img
                              src={product.profiles.avatar_url}
                              alt={product.profiles.business_name || product.profiles.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold">
                              {product.profiles.business_name || product.profiles.full_name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {timeOnPlatform.value} {timeOnPlatform.unit} Kambafy
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Disclaimer */}
                    <div className="text-xs text-muted-foreground">
                      Ao comprar o produto, as instruções de acesso serão enviadas para o seu email.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Price and CTA - Sticky Bottom on Mobile Only */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg md:hidden z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Preço</div>
                <div className="text-xl font-bold text-primary">
                  {priceFormatted}
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
