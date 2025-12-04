import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, Share, Package } from "lucide-react";
import { toast } from "@/hooks/useCustomToast";
import ProductFormTabs from '@/components/ProductFormTabs';
import StepperProductForm from '@/components/StepperProductForm';
import ProductTypeSelector from '@/components/ProductTypeSelector';
import ProductShareDialog from '@/components/ProductShareDialog';
import DeleteProductModal from '@/components/DeleteProductModal';
import RequestRevisionModal from '@/components/RequestRevisionModal';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { ProductCard } from '@/components/ProductCard';
import { PageSkeleton } from '@/components/ui/page-skeleton';

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
  
  const [showProductTypeSelector, setShowProductTypeSelector] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [shareProduct, setShareProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [revisionProduct, setRevisionProduct] = useState<Product | null>(null);

  // Use optimized query with caching
  const { data: products = [], isLoading: loading, refetch } = useOptimizedQuery(
    ['products', user?.id],
    async () => {
      if (!user) {
        return [];
      }
      
      // Buscar produtos próprios incluindo novos campos
      const { data: ownProducts, error: ownError } = await supabase
        .from('products')
        .select('*, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ownError) throw ownError;

      const { data: affiliateRelations, error: affiliateError } = await supabase
        .from('affiliates')
        .select('commission_rate, status, product_id, affiliate_code')
        .eq('affiliate_user_id', user.id)
        .eq('status', 'ativo');

      if (affiliateError) {
        console.error('❌ Erro ao buscar relações de afiliação:', affiliateError);
        throw affiliateError;
      }

      // Se há relações de afiliação, buscar os produtos correspondentes
      let affiliateProducts = [];
      if (affiliateRelations && affiliateRelations.length > 0) {
        const productIds = affiliateRelations.map(rel => rel.product_id);
        
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);
          
        if (productsError) {
          console.error('❌ Erro ao buscar produtos de afiliação:', productsError);
          throw productsError;
        }
        
        affiliateProducts = productsData || [];
      }

      // Buscar vendas de order bumps para produtos do usuário
      // Primeiro, obter order_bump_settings onde o produto é usado como bump
      const allProductIds = [
        ...(ownProducts || []).map(p => p.id),
        ...affiliateProducts.map(p => p.id)
      ];
      
      let orderBumpSalesMap: Record<string, number> = {};
      
      if (allProductIds.length > 0) {
        // Buscar order_bump_settings para saber quais produtos são order bumps
        const { data: bumpSettings } = await supabase
          .from('order_bump_settings')
          .select('product_id, bump_product_id')
          .in('bump_product_id', allProductIds);
        
        if (bumpSettings && bumpSettings.length > 0) {
          // Para cada produto que é usado como bump, contar as orders completadas
          // que têm order_bump_data para o produto principal
          const mainProductIds = [...new Set(bumpSettings.map(bs => bs.product_id))];
          
          const { data: ordersWithBumps } = await supabase
            .from('orders')
            .select('product_id, order_bump_data')
            .in('product_id', mainProductIds)
            .in('status', ['completed', 'paid'])
            .not('order_bump_data', 'is', null);
          
          if (ordersWithBumps) {
            // Mapear vendas de bump para cada bump_product_id
            for (const order of ordersWithBumps) {
              // Encontrar qual bump_product_id corresponde a este product_id
              const relatedBumps = bumpSettings.filter(bs => bs.product_id === order.product_id);
              for (const bump of relatedBumps) {
                if (bump.bump_product_id) {
                  orderBumpSalesMap[bump.bump_product_id] = (orderBumpSalesMap[bump.bump_product_id] || 0) + 1;
                }
              }
            }
          }
        }
      }

      // Combinar e marcar produtos de afiliação, adicionando vendas de order bump
      const ownProductsMarked = (ownProducts || []).map(product => ({
        ...product,
        is_affiliate: false,
        sales: (product.sales || 0) + (orderBumpSalesMap[product.id] || 0)
      }));

      const affiliateProductsMarked = affiliateProducts.map(product => {
        const relation = affiliateRelations?.find(rel => rel.product_id === product.id);
        return {
          ...product,
          is_affiliate: true,
          affiliate_commission: relation?.commission_rate || '10%',
          affiliate_code: relation?.affiliate_code,
          sales: (product.sales || 0) + (orderBumpSalesMap[product.id] || 0)
        };
      });

      return [...ownProductsMarked, ...affiliateProductsMarked];
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutos - aumentado
      gcTime: 10 * 60 * 1000, // 10 minutos - aumentado
      refetchOnWindowFocus: false, // Evitar refetch desnecessário
    }
  );

  // Memoize products array for better performance
  const memoizedProducts = useMemo(() => products, [products]);

  const handleToggleStatus = useCallback(async (product: Product) => {
    if (!user) {
      return;
    }

    // Não permitir alteração de status para produtos de afiliação
    if (product.is_affiliate) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode alterar o status de produtos de afiliação",
        variant: "destructive"
      });
      return;
    }

    // Não permitir ativar produtos pendentes - devem ser aprovados pelo admin primeiro
    if (product.status === 'Pendente') {
      toast({
        title: "Ação não permitida",
        description: "Produtos em revisão não podem ser ativados. Aguarde a aprovação do administrador.",
        variant: "destructive"
      });
      return;
    }

    // Não permitir que vendedor ative produtos banidos - apenas admin pode aprovar
    if (product.status === 'Banido') {
      toast({
        title: "Ação não permitida",
        description: "Produtos banidos não podem ser ativados diretamente. Use 'Solicitar Revisão' para que um administrador analise seu produto.",
        variant: "destructive"
      });
      return;
    }
    
    // Não permitir ativar produtos em rascunho - devem ser publicados primeiro
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

      // Refetch data to update list
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

    // Não permitir exclusão de produtos de afiliação
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
      // First check if there are any orders for this product
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('product_id', deleteProduct.id)
        .limit(1);

      if (ordersError) {
        console.error('Error checking orders:', ordersError);
        toast({
          title: "Erro",
          description: "Erro ao verificar pedidos associados ao produto",
          variant: "destructive"
        });
        setDeleteProduct(null); // Fechar o modal
        return;
      }

      if (orders && orders.length > 0) {
        console.log('Product has orders, cannot delete:', orders.length);
        console.log('Showing toast notification...');
        
        toast({
          title: "❌ Não é possível excluir",
          description: "Este produto não pode ser excluído porque já tem vendas/pedidos associados. Você pode desativá-lo em vez de excluí-lo.",
          variant: "destructive"
        });
        
        console.log('Toast notification sent, closing modal...');
        // Aguardar um pouco antes de fechar o modal para garantir que o toast aparece
        setTimeout(() => {
          setDeleteProduct(null);
        }, 500);
        return;
      }

      // If no orders, proceed with deletion
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteProduct.id)
        .eq('user_id', user.id)
        .select();

      if (error) {
        toast({
          title: "Erro",
          description: `Erro ao excluir produto: ${error.message}`,
          variant: "destructive"
        });
        setDeleteProduct(null); // Fechar o modal
        return;
      }
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso"
      });

      // Refetch data to update list
      await refetch();
      setDeleteProduct(null);
      
    } catch (error: any) {
      console.error('Unexpected error deleting product:', error);
      toast({
        title: "Erro", 
        description: `Erro inesperado: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
      setDeleteProduct(null); // Fechar o modal
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteProduct, user, toast, refetch]);

  // Função para abrir modal de revisão
  const handleRequestRevision = useCallback((product: Product) => {
    setRevisionProduct(product);
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    // Não permitir edição de produtos de afiliação
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meus Produtos</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerencie seus produtos e produtos para afiliação</p>
            </div>
            <Button onClick={handleNewProduct} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          </div>

          {products.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Comece criando seu primeiro produto digital ou solicite afiliação de produtos
                </p>
                <Button onClick={handleNewProduct}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Produto
                </Button>
              </CardContent>
            </Card>
          ) : (
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
          )}
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
