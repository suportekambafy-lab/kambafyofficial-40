import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Search, Filter, TrendingUp, Clock, Star, User, GraduationCap, DollarSign, UtensilsCrossed, Briefcase, Heart, Dumbbell, Palette, Code, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import marketplaceHeroImage from "@/assets/marketplace-hero.png";
import marketplaceLogo from "@/assets/marketplace-logo.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  cover: string | null;
  category: string | null;
  type: string;
  sales: number;
  slug: string;
  fantasy_name: string | null;
  profiles: {
    full_name: string | null;
    business_name: string | null;
    avatar_url: string | null;
  };
}

// Função para obter ícone baseado na categoria
const getCategoryIcon = (category: string) => {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('desenvolvimento') || categoryLower.includes('pessoal')) {
    return <User className="w-8 h-8" />;
  }
  if (categoryLower.includes('marketing')) {
    return <TrendingUp className="w-8 h-8" />;
  }
  if (categoryLower.includes('finança') || categoryLower.includes('investimento')) {
    return <DollarSign className="w-8 h-8" />;
  }
  if (categoryLower.includes('negócio') || categoryLower.includes('empreend')) {
    return <Briefcase className="w-8 h-8" />;
  }
  if (categoryLower.includes('saúde') || categoryLower.includes('bem-estar') || categoryLower.includes('nutricao')) {
    return <Heart className="w-8 h-8" />;
  }
  if (categoryLower.includes('design') || categoryLower.includes('grafico')) {
    return <Palette className="w-8 h-8" />;
  }
  if (categoryLower.includes('tecnologia') || categoryLower.includes('programação') || categoryLower.includes('inteligencia')) {
    return <Code className="w-8 h-8" />;
  }
  if (categoryLower.includes('relacionamento') || categoryLower.includes('amorosa') || categoryLower.includes('sexualidade')) {
    return <Heart className="w-8 h-8" />;
  }
  if (categoryLower.includes('fotografia') || categoryLower.includes('video')) {
    return <Palette className="w-8 h-8" />;
  }
  if (categoryLower.includes('idioma')) {
    return <GraduationCap className="w-8 h-8" />;
  }
  if (categoryLower.includes('venda')) {
    return <Briefcase className="w-8 h-8" />;
  }
  if (categoryLower.includes('viagem') || categoryLower.includes('estilo') || categoryLower.includes('espiritualidade')) {
    return <Star className="w-8 h-8" />;
  }
  if (categoryLower.includes('psicologia') || categoryLower.includes('comportamento')) {
    return <User className="w-8 h-8" />;
  }
  
  return <Star className="w-8 h-8" />;
};

export default function MarketplacePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["marketplace-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          cover,
          category,
          type,
          sales,
          slug,
          fantasy_name,
          profiles!inner(
            full_name,
            business_name,
            avatar_url
          )
        `)
        .eq("status", "Ativo")
        .eq("admin_approved", true)
        .neq("type", "Link de Pagamento")
        .order("sales", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  // Produtos mais acessados (top 8 por vendas)
  const topProducts = products?.slice(0, 8) || [];

  // Obter categorias únicas
  const categories = Array.from(
    new Set(products?.map((p) => p.category).filter(Boolean) || [])
  );

  // Filtrar produtos
  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  const handleProductClick = (product: Product) => {
    navigate(`/produto/${product.slug || product.id}`);
  };

  return (
    <>
      <Helmet>
        <title>Marketplace - Descubra produtos digitais | Kambafy</title>
        <meta
          name="description"
          content="Descubra e compre produtos digitais de especialistas angolanos. Marketplace com cursos online, ebooks, templates e infoprodutos para sua evolução pessoal e profissional."
        />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://kambafy.com/marketplace" />
        <meta property="og:title" content="Marketplace - Descubra produtos digitais | Kambafy" />
        <meta property="og:description" content="Descubra e compre produtos digitais de especialistas angolanos. Marketplace com cursos online, ebooks, templates e infoprodutos para sua evolução pessoal e profissional." />
        <meta property="og:image" content="https://kambafy.com/lovable-uploads/d8006597-4c28-4313-b50d-96a944e49040.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://kambafy.com/marketplace" />
        <meta property="twitter:title" content="Marketplace - Descubra produtos digitais | Kambafy" />
        <meta property="twitter:description" content="Descubra e compre produtos digitais de especialistas angolanos. Marketplace com cursos online, ebooks, templates e infoprodutos para sua evolução pessoal e profissional." />
        <meta property="twitter:image" content="https://kambafy.com/lovable-uploads/d8006597-4c28-4313-b50d-96a944e49040.png" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Header with Search */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex h-16 items-center justify-between gap-4">
              {isMobile ? (
                <>
                  {/* Mobile: Menu à esquerda */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px]">
                      <SheetHeader>
                        <SheetTitle>Menu</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col gap-4 mt-6">
                        <Button variant="outline" onClick={() => navigate('/membros')} className="w-full">
                          Acessar meu curso
                        </Button>
                        <Button onClick={() => navigate('/vendedor')} className="w-full">
                          Criar um curso
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Mobile: Logo centralizado */}
                  <div className="flex-1 flex justify-center">
                    <img 
                      src={marketplaceLogo} 
                      alt="Kambafy Marketplace" 
                      className="h-8 w-auto"
                    />
                  </div>
                  
                  {/* Mobile: Ícone de lupa à direita */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Search className="w-5 h-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px]">
                      <SheetHeader>
                        <SheetTitle>Buscar</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col gap-4 mt-6">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder='Tente "marketing" ou "culinária"'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4"
                          />
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              ) : (
                <>
                  {/* Desktop: Logo */}
                  <div className="flex items-center mr-4">
                    <img 
                      src={marketplaceLogo} 
                      alt="Kambafy Marketplace" 
                      className="h-10 w-auto"
                    />
                  </div>

                  {/* Categories Dropdown */}
                  <Button variant="ghost" className="hidden md:flex items-center gap-1">
                    Categorias
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>

                  {/* Search Bar */}
                  <div className="flex-1 max-w-2xl">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder='Tente "marketing" ou "culinária"'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="hidden md:flex items-center gap-2">
                    <Button variant="outline" onClick={() => navigate('/membros')}>
                      Acessar meu curso
                    </Button>
                    <Button onClick={() => navigate('/vendedor')}>
                      Criar um curso
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
          <div className="container mx-auto px-4 max-w-7xl">
            {/* Mobile Layout */}
            <div className="md:hidden pt-6 pb-8">
              {/* Title */}
              <h1 className="text-3xl font-bold mb-3">
                O que você quer{" "}
                <span className="text-primary">aprender</span> hoje?
              </h1>
              
              {/* Subtitle */}
              <p className="text-base text-muted-foreground mb-6">
                Pesquise um tema e escolha cursos perfeitos para você
              </p>

              {/* Hero Image with Overlapping Search */}
              <div className="relative w-full mb-4">
                <img
                  src={marketplaceHeroImage}
                  alt="Estudante aprendendo"
                  className="w-full h-auto"
                />
                
                {/* Search Bar with Button - Positioned over image */}
                <div className="absolute -bottom-6 left-4 right-4">
                  <div className="relative">
                    <Input
                      placeholder='Tente "marketing" ou "culinária"'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-14 py-6 text-base rounded-full shadow-lg bg-background"
                    />
                    <Button 
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full h-10 w-10"
                    >
                      <Search className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:grid md:grid-cols-2 gap-8 items-center pt-20 pb-16">
              {/* Left Side - Text and Search */}
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold">
                  O que você quer{" "}
                  <span className="text-primary">aprender</span> hoje?
                </h1>
                <p className="text-lg text-muted-foreground">
                  Descubra cursos, ebooks e conteúdos exclusivos para acelerar seu aprendizado
                </p>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Buscar por cursos, ebooks, categorias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-6 text-lg"
                  />
                </div>
              </div>

              {/* Right Side - Image */}
              <div className="relative max-w-md mx-auto">
                <img
                  src={marketplaceHeroImage}
                  alt="Estudante aprendendo"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-7xl py-12">
          {/* Conteúdos mais acessados */}
          <section className="mb-16">
            <div className="mb-8">
              <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">
                SÃO MAIS DE {products?.length || 0} PRODUTOS
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Os melhores conteúdos da Kambafy na palma da mão
              </h2>
              <p className="text-muted-foreground hidden md:block">Mais populares</p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse">
                    <div className="aspect-square bg-muted" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {topProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      {product.cover ? (
                        <img
                          src={product.cover}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <span className="text-4xl">📚</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        {product.profiles.avatar_url && (
                          <img
                            src={product.profiles.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <p className="text-sm text-muted-foreground">
                          {product.fantasy_name || product.profiles.business_name || product.profiles.full_name}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          {formatPrice(product.price)}
                        </span>
                        <Badge variant="outline">{product.type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Categorias */}
          {categories.length > 0 && (
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-8">Categorias</h2>
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-4">
                  {categories.map((category) => (
                    <CarouselItem key={category} className="pl-4 basis-auto">
                      <button
                        onClick={() => setSelectedCategory(category)}
                        className="flex flex-col items-center gap-3 min-w-[120px] group transition-transform hover:scale-105"
                      >
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${
                          selectedCategory === category 
                            ? 'bg-primary scale-110' 
                            : 'bg-primary/90 hover:bg-primary'
                        }`}>
                          <div className="text-primary-foreground">
                            {getCategoryIcon(category)}
                          </div>
                        </div>
                        <span className={`text-sm font-medium text-center max-w-[120px] transition-colors ${
                          selectedCategory === category 
                            ? 'text-primary' 
                            : 'text-foreground group-hover:text-primary'
                        }`}>
                          {category}
                        </span>
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-4" />
                <CarouselNext className="hidden md:flex -right-4" />
              </Carousel>
              {selectedCategory && (
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategory(null)}
                    size="sm"
                  >
                    Limpar filtro
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Todos os produtos */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">
                {selectedCategory ? `${selectedCategory}` : "Todos os produtos"}
              </h2>
              {!showAllProducts && filteredProducts && filteredProducts.length > 8 && (
                <Button variant="ghost" onClick={() => setShowAllProducts(true)}>
                  Ver tudo
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[...Array(12)].map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse">
                    <div className="aspect-square bg-muted" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 8)).map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      {product.cover ? (
                        <img
                          src={product.cover}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <span className="text-4xl">📚</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        {product.profiles.avatar_url && (
                          <img
                            src={product.profiles.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {product.profiles.business_name || product.profiles.full_name}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          {formatPrice(product.price)}
                        </span>
                        <Badge variant="outline">{product.type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  Nenhum produto encontrado com esses filtros.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
