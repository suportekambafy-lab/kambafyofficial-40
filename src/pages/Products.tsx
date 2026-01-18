import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, LayoutGrid, List, Users, ShoppingBag } from "lucide-react";
import { toast } from "@/hooks/useCustomToast";
import StepperProductForm from '@/components/StepperProductForm';
import ProductTypeSelector from '@/components/ProductTypeSelector';
import ProductShareDialog from '@/components/ProductShareDialog';
import DeleteProductModal from '@/components/DeleteProductModal';
import RequestRevisionModal from '@/components/RequestRevisionModal';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { ProductCard } from '@/components/ProductCard';
import { ProductListItem } from '@/components/ProductListItem';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyCoproductionsPage } from '@/components/coproducers';
import { MyAffiliationsTab } from '@/components/products/MyAffiliationsTab';

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  type: string;
  status: string;
  admin_approved: boolean;
  cover: string;
  sales: number;
  created_at: string;
  user_id: string;
  commission?: string;
  is_affiliate?: boolean;
  affiliate_commission?: string;
  affiliate_code?: string;
  revision_requested?: boolean;
  revision_requested_at?: string;
}

export default function Products() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('my-products');
  const [showProductTypeSelector, setShowProductTypeSelector] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [shareProduct, setShareProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [revisionProduct, setRevisionProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('products-view-mode');
    return (saved === 'list' || saved === 'grid') ? saved : 'grid';
  });

  const handleViewModeChange = useCallback((value: string | undefined) => {
    if (value === 'grid' || value === 'list') {
      setViewMode(value);
      localStorage.setItem('products-view-mode', value);
    }
  }, []);

  // Use optimized query with caching - ONLY own products
  const { data: ownProducts = [], isLoading: loading, refetch } = useOptimizedQuery(
    ['own-products', user?.id],
    async () => {
      if (!user) {
        return [];
      }
      
      // Buscar apenas produtos próprios (excluindo arquivados)
      const { data: products, error } = await supabase
        .from('products')
        .select('*, user_id')
        .eq('user_id', user.id)
        .neq('status', 'Arquivado')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar vendas de order bumps para produtos do usuário
      const allProductIds = (products || []).map(p => p.id);
      
      let orderBumpSalesMap: Record<string, number> = {};
      
      if (allProductIds.length > 0) {
        const { data: ordersWithBumps } = await supabase
          .from('orders')
          .select('order_bump_data')
          .in('status', ['completed', 'paid'])
          .not('order_bump_data', 'is', null);
        
        if (ordersWithBumps) {
          for (const order of ordersWithBumps) {
            try {
              let bumpData: any = order.order_bump_data;
              
              while (typeof bumpData === 'string') {
                try {
                  bumpData = JSON.parse(bumpData);
                } catch {
                  break;
                }
              }
              
              if (!bumpData) continue;
              
              if (Array.isArray(bumpData.items)) {
                for (const item of bumpData.items) {
                  const itemProductId = item?.bump_product_id as string | undefined;
                  if (itemProductId && allProductIds.includes(itemProductId)) {
                    orderBumpSalesMap[itemProductId] = (orderBumpSalesMap[itemProductId] || 0) + 1;
                  }
                }
              } else {
                const bumpProductId = bumpData?.bump_product_id as string | undefined;
                if (bumpProductId && allProductIds.includes(bumpProductId)) {
                  orderBumpSalesMap[bumpProductId] = (orderBumpSalesMap[bumpProductId] || 0) + 1;
                }
              }
            } catch (e) {
              // Ignorar erros de parse
            }
          }
        }
      }

      // Marcar produtos próprios com vendas de order bump
      return (products || []).map(product => ({
        ...product,
        is_affiliate: false,
        sales: (product.sales || 0) + (orderBumpSalesMap[product.id] || 0)
      }));
    },
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  // Memoize products array for better performance
  const memoizedProducts = useMemo(() => ownProducts, [ownProducts]);

  const handleToggleStatus = useCallback(async (product: Product) => {
    if (!user) {
      return;
    }

    if (product.is_affiliate) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode alterar o status de produtos de afiliação",
        variant: "destructive"
      });
      return;
    }

    if (product.status === 'Pendente') {
      toast({
        title: "Ação não permitida",
        description: "Produtos em revisão não podem ser ativados. Aguarde a aprovação do administrador.",
        variant: "destructive"
      });
      return;
    }

    if (product.status === 'Banido') {
      toast({
        title: "Ação não permitida",
        description: "Produtos banidos não podem ser ativados diretamente. Use 'Solicitar Revisão' para que um administrador analise seu produto.",
        variant: "destructive"
      });
      return;
    }
    
    if (product.status === 'Rascunho') {
      toast({
        title: "Ação não permitida",
        description: "Produtos em rascunho devem ser publicados primeiro. Use 'Editar' para completar e publicar o produto.",
        variant: "destructive"
      });
      return;
    }
    
    const newStatus = product.status === 'Ativo' ? 'Inativo' : 'Ativo';
    
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', product.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao alterar status do produto:', error);
        toast({
          title: "Erro",
          description: `Erro ao ${newStatus === 'Ativo' ? 'ativar' : 'desativar'} produto: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Sucesso",
        description: `Produto ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso`
      });

      await refetch();
    } catch (error: any) {
      console.error('❌ Erro inesperado ao alterar status:', error);
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  }, [user, toast, refetch]);

  const handleDeleteProduct = useCallback(async () => {
    if (!deleteProduct || !user) {
      return;
    }

    if (deleteProduct.is_affiliate) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode excluir produtos de afiliação",
        variant: "destructive"
      });
      setDeleteProduct(null);
      return;
    }

    setDeleteLoading(true);
    
    try {
      const { error } = await (supabase as any).rpc('delete_product_if_no_paid_sales', {
        p_product_id: deleteProduct.id,
      });

      if (error) {
        const msg = String(error.message || '');

        if (msg.includes('PRODUTO_COM_VENDAS_PAGAS')) {
          toast({
            title: "❌ Não é possível excluir",
            description: "Este produto não pode ser excluído porque já tem vendas pagas.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro",
            description: `Erro ao excluir produto: ${msg}`,
            variant: "destructive"
          });
        }

        setDeleteProduct(null);
        return;
      }

      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso"
      });

      await refetch();
      setDeleteProduct(null);

      
    } catch (error: any) {
      console.error('Unexpected error deleting product:', error);
      toast({
        title: "Erro", 
        description: `Erro inesperado: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
      setDeleteProduct(null);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteProduct, user, toast, refetch]);

  const handleRequestRevision = useCallback((product: Product) => {
    setRevisionProduct(product);
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    if (product.is_affiliate) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode editar produtos de afiliação",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedProduct(product);
    setShowProductForm(true);
  }, [toast]);

  const handleNewProduct = useCallback(() => {
    setSelectedProduct(null);
    setSelectedProductType("");
    setShowProductTypeSelector(true);
  }, []);

  const handleProductTypeSelected = useCallback((type: string) => {
    setSelectedProductType(type);
    setShowProductTypeSelector(false);
    setShowProductForm(true);
  }, []);

  const handleProductSaved = useCallback(() => {
    refetch();
    setShowProductForm(false);
    setSelectedProduct(null);
    setSelectedProductType("");
  }, [refetch]);

  const handleCancelProductForm = useCallback(() => {
    setShowProductForm(false);
    setSelectedProduct(null);
    setSelectedProductType("");
  }, []);

  if (loading) {
    return (
      <div className="p-3 md:p-6 overflow-x-hidden">
        <PageSkeleton variant="products" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {showProductForm ? (
        <StepperProductForm
          editingProduct={selectedProduct}
          selectedType={selectedProductType}
          onSuccess={handleProductSaved}
          onCancel={handleCancelProductForm}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
              <p className="text-muted-foreground">Gerencie seus produtos, co-produções e afiliações</p>
            </div>
            {activeTab === 'my-products' && (
              <div className="flex items-center gap-3">
                <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
                  <ToggleGroupItem value="grid" aria-label="Visualização em grade">
                    <LayoutGrid className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="Visualização em lista">
                    <List className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button onClick={handleNewProduct} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Produto</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-lg">
              <TabsTrigger 
                value="my-products" 
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md"
              >
                <Package className="w-4 h-4" />
                <span>Meus produtos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="coproductions" 
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md"
              >
                <Users className="w-4 h-4" />
                <span>Minhas co-produções</span>
              </TabsTrigger>
              <TabsTrigger 
                value="affiliations" 
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Minhas afiliações</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-products" className="mt-6">
              {memoizedProducts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhum produto encontrado
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Comece criando seu primeiro produto digital
                    </p>
                    <Button onClick={handleNewProduct}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Produto
                    </Button>
                  </CardContent>
                </Card>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {memoizedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={handleEditProduct}
                      onShare={(prod) => setShareProduct(prod)}
                      onDelete={(prod) => setDeleteProduct(prod)}
                      onToggleStatus={handleToggleStatus}
                      onRequestRevision={handleRequestRevision}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {memoizedProducts.map((product) => (
                    <ProductListItem
                      key={product.id}
                      product={product}
                      onEdit={handleEditProduct}
                      onShare={(prod) => setShareProduct(prod)}
                      onDelete={(prod) => setDeleteProduct(prod)}
                      onToggleStatus={handleToggleStatus}
                      onRequestRevision={handleRequestRevision}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="coproductions" className="mt-6">
              <MyCoproductionsPage />
            </TabsContent>

            <TabsContent value="affiliations" className="mt-6">
              <MyAffiliationsTab />
            </TabsContent>
          </Tabs>
        </>
      )}

      {showProductTypeSelector && (
        <ProductTypeSelector
          onClose={() => setShowProductTypeSelector(false)}
          onSelectType={handleProductTypeSelected}
        />
      )}

      {shareProduct && (
        <ProductShareDialog
          product={shareProduct}
          open={!!shareProduct}
          onOpenChange={(open) => !open && setShareProduct(null)}
        />
      )}

      {deleteProduct && (
        <DeleteProductModal
          open={!!deleteProduct}
          onOpenChange={(open) => !open && setDeleteProduct(null)}
          productName={deleteProduct.name}
          onConfirm={handleDeleteProduct}
          loading={deleteLoading}
        />
      )}

      {revisionProduct && (
        <RequestRevisionModal
          open={!!revisionProduct}
          onOpenChange={(open) => !open && setRevisionProduct(null)}
          productId={revisionProduct.id}
          productName={revisionProduct.name}
          onSuccess={() => {
            refetch();
            setRevisionProduct(null);
          }}
        />
      )}
    </div>
  );
}
