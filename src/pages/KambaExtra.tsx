import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from '@/hooks/useCustomToast';
import { getProductImageUrl } from '@/utils/imageUtils';

interface AffiliateProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  commission: string;
  category: string;
  cover: string;
  sales: number;
  tags: string[];
  user_id: string;
  status: string;
  allow_affiliates: boolean;
  type: string;
  fantasy_name?: string;
  profiles?: {
    full_name?: string;
  };
}

const sortOptions = [
  { value: 'sales', label: 'Mais vendidos' },
  { value: 'commission', label: 'Maior comissão' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'alphabetical', label: 'A-Z' },
];

export default function KambaExtra() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas as categorias');
  const [sortBy, setSortBy] = useState('sales');
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AffiliateProduct[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todas as categorias']);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<AffiliateProduct | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAffiliateRequests, setUserAffiliateRequests] = useState<string[]>([]);
  const { toast } = useCustomToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchAffiliateProducts();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUserAffiliateRequests();
    }
  }, [currentUser]);

  useEffect(() => {
    filterProducts(searchTerm, selectedCategory, sortBy);
  }, [products, searchTerm, selectedCategory, sortBy]);

  const fetchCurrentUser = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      setCurrentUser(user.user);
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
    }
  };

  const fetchUserAffiliateRequests = async () => {
    if (!currentUser) return;
    
    try {
      const { data: requests, error } = await supabase
        .from('affiliates')
        .select('product_id')
        .eq('affiliate_user_id', currentUser.id);

      if (error) {
        console.error('Erro ao buscar solicitações de afiliação:', error);
        return;
      }

      const productIds = requests?.map(req => req.product_id) || [];
      setUserAffiliateRequests(productIds);
    } catch (error) {
      console.error('Erro ao buscar solicitações de afiliação:', error);
    }
  };

  const fetchAffiliateProducts = async () => {
    try {
      setLoading(true);
      
      // Buscar produtos que permitem afiliação e estão ativos, com informações do vendedor
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!products_user_id_fkey (
            full_name
          )
        `)
        .eq('allow_affiliates', true)
        .eq('status', 'Ativo')
        .order('sales', { ascending: false });

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        toast({ message: 'Erro ao carregar produtos' });
        return;
      }

      if (productsData) {
        setProducts(productsData);
        
        // Extrair categorias únicas
        const uniqueCategories = ['Todas as categorias', ...new Set(
          productsData
            .map(p => p.category)
            .filter(Boolean)
        )];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({ message: 'Erro ao carregar produtos' });
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = (search: string, category: string, sort: string) => {
    let filtered = [...products];

    // Filter by search
    if (search) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(search.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // Filter by category
    if (category !== 'Todas as categorias') {
      filtered = filtered.filter(product => product.category === category);
    }

    // Sort products
    switch (sort) {
      case 'commission':
        filtered.sort((a, b) => {
          const aCommission = parseFloat(a.commission.replace('%', ''));
          const bCommission = parseFloat(b.commission.replace('%', ''));
          return bCommission - aCommission;
        });
        break;
      case 'newest':
        // Sort by created_at would be ideal, but we'll use id as proxy
        filtered.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default: // sales
        filtered.sort((a, b) => (b.sales || 0) - (a.sales || 0));
    }

    setFilteredProducts(filtered);
  };

  const calculateCommissionValue = (price: string, commission: string) => {
    try {
      const priceValue = parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.'));
      const commissionRate = parseFloat(commission.replace('%', '')) / 100;
      const commissionValue = priceValue * commissionRate;
      return commissionValue.toFixed(2).replace('.', ',');
    } catch {
      return '0,00';
    }
  };

  const handleProductClick = (product: AffiliateProduct) => {
    setSelectedProduct(product);
    setSheetOpen(true);
  };

  const handleAffiliateRequest = async (productId: string) => {
    try {
      if (!currentUser) {
        toast({ message: 'Você precisa estar logado para solicitar afiliação' });
        return;
      }

      // Verificar se é o próprio produto do usuário
      if (selectedProduct?.user_id === currentUser.id) {
        toast({ message: 'Você não pode se afiliar ao seu próprio produto' });
        return;
      }

      // Verificar se já existe uma solicitação
      if (userAffiliateRequests.includes(productId)) {
        toast({ message: 'Você já enviou uma solicitação para este produto' });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile) {
        toast({ message: 'Erro ao carregar perfil do usuário' });
        return;
      }

      const { error } = await supabase
        .from('affiliates')
        .insert({
          user_id: selectedProduct?.user_id,
          affiliate_user_id: currentUser.id,
          product_id: productId,
          affiliate_name: profile.full_name || 'Nome não informado',
          affiliate_email: profile.email || currentUser.email || '',
          commission_rate: selectedProduct?.commission || '10%',
          status: 'pendente'
        });

      if (error) {
        console.error('Erro ao solicitar afiliação:', error);
        toast({ message: 'Erro ao solicitar afiliação' });
        return;
      }

      // Atualizar lista de solicitações
      setUserAffiliateRequests(prev => [...prev, productId]);
      
      setSheetOpen(false);
      toast({ message: 'Solicitação de afiliação enviada com sucesso!' });
    } catch (error) {
      console.error('Erro ao solicitar afiliação:', error);
      toast({ message: 'Erro ao solicitar afiliação' });
    }
  };

  const getSellerName = (product: AffiliateProduct) => {
    return product.fantasy_name || product.profiles?.full_name || 'Vendedor não identificado';
  };

  const getAffiliateButtonText = (product: AffiliateProduct) => {
    if (!currentUser) return 'Solicitar Afiliação';
    if (product.user_id === currentUser.id) return 'Seu Produto';
    if (userAffiliateRequests.includes(product.id)) return 'Solicitação Enviada';
    return 'Solicitar Afiliação';
  };

  const canRequestAffiliate = (product: AffiliateProduct) => {
    if (!currentUser) return false;
    if (product.user_id === currentUser.id) return false;
    if (userAffiliateRequests.includes(product.id)) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando produtos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kamba Extra</h1>
          <p className="text-muted-foreground">Torne-se afiliado dos top produtos da plataforma e receba por cada venda.</p>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-64 bg-card text-card-foreground border-border">
              <SelectValue placeholder="Categorias" className="text-card-foreground" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48 bg-card text-card-foreground border-border">
              <SelectValue placeholder="Ordenar por" className="text-card-foreground" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filters Button */}
          <Button variant="outline" className="flex items-center gap-2 text-foreground">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Products Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Encontre seu Kamba</h2>
          <span className="text-2xl">🔥</span>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <Card 
              key={product.id} 
              className="group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              <CardContent className="p-0">
                {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
                    {product.cover ? (
                      <img
                        src={getProductImageUrl(product.cover)}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                        <span className="text-muted-foreground text-sm">Sem imagem</span>
                      </div>
                    )}
                  
                  {/* Sales Badge */}
                  {product.sales > 0 && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      {product.sales}° 🔥
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  {/* Title */}
                  <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] text-card-foreground">
                    {product.name}
                  </h3>

                  {/* Commission */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Você recebe até</p>
                    <p className="text-lg font-bold text-green-600">
                      {calculateCommissionValue(product.price, product.commission)} KZ
                    </p>
                    <p className="text-xs text-muted-foreground">Comissão: {product.commission}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {product.tags && product.tags.length > 0 && (
                      product.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {products.length === 0 
                ? 'Nenhum produto está disponível para afiliação no momento.'
                : 'Nenhum produto encontrado com os filtros aplicados.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Product Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] md:w-[500px] overflow-y-auto bg-card border-border">
          {selectedProduct && (
            <div className="space-y-6">
              {/* Header */}
              <SheetHeader>
                <div className="space-y-2">
                  <SheetTitle className="text-xl font-bold">
                    {selectedProduct.name}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    Por {getSellerName(selectedProduct)}
                  </p>
                </div>
              </SheetHeader>

              {/* Product Image */}
              {selectedProduct.cover && (
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  <img
                    src={getProductImageUrl(selectedProduct.cover)}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* AFILIAÇÃO Section */}
              <div className="rounded-lg p-4 border border-border">
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  AFILIAÇÃO
                </h3>
                <Button 
                  className={`w-full ${
                    canRequestAffiliate(selectedProduct) 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'bg-muted-foreground/20 cursor-not-allowed text-muted-foreground'
                  }`}
                  onClick={() => handleAffiliateRequest(selectedProduct.id)}
                  disabled={!canRequestAffiliate(selectedProduct)}
                >
                  {getAffiliateButtonText(selectedProduct)}
                </Button>
              </div>

              {/* PRODUTO Section */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-green-600">PRODUTO</h3>
                
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Categoria</span>
                    <span className="font-medium">{selectedProduct.category || 'Não informado'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">{selectedProduct.type || 'Pagamento único'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Receba até</span>
                    <span className="font-medium text-green-600">
                      {calculateCommissionValue(selectedProduct.price, selectedProduct.commission)} KZ
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Porcentagem de comissão</span>
                    <span className="font-medium">{selectedProduct.commission}</span>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div className="mt-4">
                    <div className="text-muted-foreground text-sm mb-2">Descrição</div>
                    <p className="text-sm leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}
              </div>

              {/* DETALHES Section */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-green-600">DETALHES</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Atribuição</span>
                    <span className="font-medium">Último clique</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Duração dos cookies</span>
                    <span className="font-medium">30</span>
                  </div>
                  
                </div>
              </div>

              {/* OFERTAS Section */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-green-600">OFERTAS</h3>
                
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                    <span>Nome</span>
                    <span className="text-center">Preço</span>
                    <span className="text-right">Você recebe</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm py-2">
                    <span className="font-medium">{selectedProduct.name}</span>
                    <span className="text-center">{selectedProduct.price}</span>
                    <span className="text-right font-medium text-green-600">
                      {calculateCommissionValue(selectedProduct.price, selectedProduct.commission)} KZ
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}