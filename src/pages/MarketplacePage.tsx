import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Search, Filter, TrendingUp, Clock, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

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
  profiles: {
    full_name: string | null;
    business_name: string | null;
    avatar_url: string | null;
  };
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
          profiles!inner(
            full_name,
            business_name,
            avatar_url
          )
        `)
        .eq("status", "Ativo")
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
          content="Explore centenas de cursos, ebooks e produtos digitais criados por especialistas angolanos. Aprenda novas habilidades e desenvolva sua carreira."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 pt-20 pb-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                O que você quer aprender hoje?
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Descubra cursos, ebooks e conteúdos exclusivos para acelerar seu aprendizado
              </p>

              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Buscar por cursos, ebooks, categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-7xl py-12">
          {/* Conteúdos mais acessados */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Os melhores conteúdos da Kambafy na palma da mão
                </h2>
                <p className="text-muted-foreground">Mais populares</p>
              </div>
              <Button variant="ghost" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Ver mais
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse">
                    <div className="aspect-video bg-muted" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {topProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="relative aspect-video bg-muted overflow-hidden">
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
                      {product.sales > 0 && (
                        <Badge className="absolute top-2 right-2 bg-green-500">
                          {product.sales} vendas
                        </Badge>
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
            )}
          </section>

          {/* Categorias */}
          {categories.length > 0 && (
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-8">Categorias</h2>
              <div className="flex flex-wrap gap-3 mb-8">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                >
                  Todas
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* Todos os produtos */}
          <section>
            <h2 className="text-3xl font-bold mb-8">
              {selectedCategory ? `${selectedCategory}` : "Todos os produtos"}
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(12)].map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse">
                    <div className="aspect-video bg-muted" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="relative aspect-video bg-muted overflow-hidden">
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
                      {product.category && (
                        <Badge className="absolute top-2 left-2 bg-background/90">
                          {product.category}
                        </Badge>
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
                        {product.sales > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {product.sales} vendas
                          </span>
                        )}
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
