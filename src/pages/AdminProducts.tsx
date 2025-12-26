
import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Eye, Download, Filter, Copy, Search, Loader2, LayoutGrid, List } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BanProductModal from '@/components/BanProductModal';
import ReviewRevisionModal from '@/components/ReviewRevisionModal';
import { SEO } from '@/components/SEO';
import { createMemberAreaLinks } from '@/utils/memberAreaLinks';
import { getProductImageUrl } from '@/utils/imageUtils';
import { getFileUrl } from '@/utils/fileUtils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';
import { AdminActionBadge } from '@/components/admin/AdminActionBadge';

interface ProductWithProfile {
  id: string;
  name: string;
  description: string | null;
  price: string;
  user_id: string;
  admin_approved: boolean;
  status: string;
  type: string;
  cover: string | null;
  fantasy_name: string | null;
  sales: number | null;
  ban_reason: string | null;
  created_at: string;
  revision_requested: boolean;
  revision_requested_at: string | null;
  revision_explanation?: string;
  revision_documents?: any; // Json type from database
  share_link?: string;
  approved_by_admin_id?: string | null;
  approved_by_admin_name?: string | null;
  banned_by_admin_id?: string | null;
  banned_by_admin_name?: string | null;
  member_areas?: {
    id: string;
    name: string;
    url: string;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export default function AdminProducts() {
  const { admin } = useAdminAuth();
  const [products, setProducts] = useState<ProductWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedProductForBan, setSelectedProductForBan] = useState<{ id: string; name: string } | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<ProductWithProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (admin) {
      console.log('Admin logado, carregando produtos...');
      loadProducts();
    }
  }, [admin]);

  const loadProducts = async () => {
    try {
      console.log('Carregando produtos via RPC admin com paginação...');
      
      // Buscar TODOS os produtos usando paginação para ultrapassar o limite de 1000
      const BATCH_SIZE = 1000;
      let allProducts: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error: batchError } = await supabase.rpc('get_all_products_for_admin_paginated', {
          p_limit: BATCH_SIZE,
          p_offset: offset
        });

        if (batchError) {
          console.error('Erro ao carregar produtos (lote):', batchError);
          toast.error('Erro ao carregar produtos: ' + batchError.message);
          return;
        }

        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          allProducts = [...allProducts, ...batch];
          offset += BATCH_SIZE;
          hasMore = batch.length === BATCH_SIZE;
          console.log(`Carregados ${allProducts.length} produtos...`);
        }
      }

      const productsData = allProducts;
      console.log('Total de produtos encontrados:', productsData.length);

      // Depois buscar os perfis dos usuários (em lotes para evitar URL muito longa)
      if (productsData && productsData.length > 0) {
        const userIds = [...new Set(productsData.map(p => p.user_id))];
        let allProfiles: any[] = [];
        
        // Dividir em lotes de 50 para evitar URL muito longa
        const PROFILE_BATCH_SIZE = 50;
        for (let i = 0; i < userIds.length; i += PROFILE_BATCH_SIZE) {
          const batch = userIds.slice(i, i + PROFILE_BATCH_SIZE);
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', batch);

          if (profileError) {
            console.error('Erro ao carregar perfis (lote):', profileError);
          } else if (profiles) {
            allProfiles = [...allProfiles, ...profiles];
          }
        }

        console.log('Perfis encontrados:', allProfiles.length);

        // Combinar os dados e garantir campos esperados
        const productsWithProfiles: ProductWithProfile[] = productsData.map((product: any) => ({
          id: product.id,
          user_id: product.user_id,
          name: product.name,
          description: product.description,
          price: product.price,
          type: product.type,
          status: product.status,
          admin_approved: product.admin_approved,
          approved_by_admin_id: product.approved_by_admin_id,
          approved_by_admin_name: product.approved_by_admin_name,
          revision_requested: product.revision_requested,
          revision_requested_at: product.revision_requested_at,
          revision_explanation: product.revision_explanation,
          revision_documents: product.revision_documents,
          cover: product.cover,
          fantasy_name: product.fantasy_name,
          sales: product.sales,
          ban_reason: product.ban_reason,
          banned_by_admin_id: product.banned_by_admin_id,
          banned_by_admin_name: product.banned_by_admin_name,
          share_link: product.share_link,
          created_at: product.created_at,
          profiles: allProfiles.find(p => p.user_id === product.user_id) || null
        }));

        console.log('Resultado final:', productsWithProfiles.length, 'produtos com perfis');
        
        setProducts(productsWithProfiles);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro inesperado ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleBanClick = (productId: string, productName: string) => {
    setSelectedProductForBan({ id: productId, name: productName });
    setBanModalOpen(true);
  };

  const banProduct = async (reason: string) => {
    if (!selectedProductForBan) return;
    
    setProcessingId(selectedProductForBan.id);
    
    try {
      console.log('🚫 Banindo produto:', selectedProductForBan.id, 'Motivo:', reason);
      console.log('👤 Admin atual:', admin);
      
      // Buscar dados do produto e vendedor antes de banir
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          profiles!inner(email, full_name)
        `)
        .eq('id', selectedProductForBan.id)
        .single();

      if (productError || !productData) {
        console.error('❌ Erro ao buscar dados do produto:', productError);
        toast.error('Erro ao buscar dados do produto');
        return;
      }
      
      // Usar função RPC específica para admin (bypass RLS)
      const { data, error } = await supabase.rpc('admin_ban_product', {
        product_id: selectedProductForBan.id,
        admin_id: admin?.id || null,
        ban_reason_text: reason,
        p_admin_email: admin?.email || null
      });

      console.log('🔍 Resultado RPC admin_ban_product:', { data, error });

      if (error) {
        console.error('❌ Erro ao banir produto:', error);
        toast.error(`Erro ao banir produto: ${error.message}`);
        return;
      }

      console.log('✅ Produto banido com sucesso via RPC');
      // Registrar log administrativo (não bloqueante)
      if (admin?.id) {
        try {
          await supabase.from('admin_logs').insert({
            admin_id: admin.id,
            action: 'product_ban',
            target_type: 'product',
            target_id: selectedProductForBan.id,
            details: { reason }
          });
        } catch (logErr) {
          console.warn('⚠️ Falha ao registrar log de banimento:', logErr);
        }
      }
      
      // Enviar email de notificação de banimento
      try {
        console.log('📧 Enviando email de banimento...');
        const emailResponse = await supabase.functions.invoke('send-product-ban-notification', {
          body: {
            sellerEmail: productData.profiles.email,
            sellerName: productData.profiles.full_name || 'Vendedor',
            productName: productData.name,
            banReason: reason
          }
        });

        if (emailResponse.error) {
          console.error('❌ Erro ao enviar email de banimento:', emailResponse.error);
          toast.error('Produto banido, mas falha ao enviar email de notificação');
        } else {
          console.log('✅ Email de banimento enviado com sucesso');
          toast.success('✅ Produto banido e vendedor notificado por email!');
        }
      } catch (emailError) {
        console.error('❌ Erro inesperado ao enviar email:', emailError);
        toast.error('Produto banido, mas falha ao enviar email');
      }

      // Recarregar dados
      await loadProducts();
    } catch (error) {
      console.error('💥 Error banning product:', error);
      toast.error(`Erro inesperado: ${error}`);
    } finally {
      setProcessingId(null);
      setSelectedProductForBan(null);
    }
  };

  const openReviewModal = (product: ProductWithProfile) => {
    setSelectedProductForReview(product);
    setReviewModalOpen(true);
  };

  const handleApproveAfterReview = async () => {
    if (!selectedProductForReview) return;
    
    const productId = selectedProductForReview.id;
    setProcessingId(productId);
    
    try {
      console.log('✅ Aprovando produto após revisão:', productId);
      
      // Buscar dados do produto e vendedor antes de aprovar
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          profiles!inner(email, full_name)
        `)
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        console.error('❌ Erro ao buscar dados do produto:', productError);
        toast.error('Erro ao buscar dados do produto');
        return;
      }
      
      // Usar função RPC específica para admin (bypass RLS)
      const { data, error } = await supabase.rpc('admin_approve_product', {
        product_id: productId,
        admin_id: admin?.id || null,
        p_admin_email: admin?.email || null
      });

      console.log('🔍 Resultado RPC admin_approve_product:', { data, error });

      if (error) {
        console.error('❌ Erro ao aprovar produto:', error);
        toast.error(`Erro ao aprovar produto: ${error.message}`);
        return;
      }

      console.log('✅ Produto aprovado com sucesso via RPC');
      // Registrar log administrativo (não bloqueante)
      if (admin?.id) {
        try {
          await supabase.from('admin_logs').insert({
            admin_id: admin.id,
            action: 'product_approve',
            target_type: 'product',
            target_id: productId,
            details: { product_name: productData.name }
          });
        } catch (logErr) {
          console.warn('⚠️ Falha ao registrar log de aprovação:', logErr);
        }
      }
      
      // Enviar email de notificação de aprovação
      try {
        console.log('📧 Enviando email de aprovação...');
        const emailResponse = await supabase.functions.invoke('send-product-approval-notification', {
          body: {
            sellerEmail: productData.profiles.email,
            sellerName: productData.profiles.full_name || 'Vendedor',
            productName: productData.name,
            productUrl: productData.share_link || undefined
          }
        });

        if (emailResponse.error) {
          console.error('❌ Erro ao enviar email de aprovação:', emailResponse.error);
          toast.error('Produto aprovado, mas falha ao enviar email de notificação');
        } else {
          console.log('✅ Email de aprovação enviado com sucesso');
          toast.success('✅ Produto aprovado e vendedor notificado por email!');
        }
      } catch (emailError) {
        console.error('❌ Erro inesperado ao enviar email:', emailError);
        toast.error('Produto aprovado, mas falha ao enviar email');
      }

      // Recarregar dados
      await loadProducts();
      
      // Fechar modal
      setReviewModalOpen(false);
      setSelectedProductForReview(null);
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error(`Erro inesperado: ${error}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRevision = async () => {
    if (!selectedProductForReview) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .update({
          revision_requested: false,
          revision_requested_at: null
        })
        .eq('id', selectedProductForReview.id);

      if (error) throw error;

      toast.info('Revisão rejeitada. O produto mantém seu status atual.');
      await loadProducts();
    } catch (error) {
      console.error('Erro ao rejeitar revisão:', error);
      toast.error('Erro ao rejeitar revisão');
    } finally {
      setReviewModalOpen(false);
      setSelectedProductForReview(null);
    }
  };

  const viewProductContent = async (productId: string, productType: string, productName: string, event?: React.MouseEvent) => {
    // Prevenir qualquer comportamento padrão
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    try {
      console.log('👁️ Visualizando conteúdo do produto:', { productId, productType, productName });
      
      // Buscar o produto completo
      const { data: product, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          member_areas (
            id,
            name, 
            url
          )
        `)
        .eq('id', productId)
        .single();

      console.log('🔍 Resultado da busca do produto:', { product, productError });

      if (productError) {
        console.error('❌ Erro ao buscar produto:', productError);
        toast.error(`Erro ao carregar produto: ${productError.message}`);
        return;
      }

      if (!product) {
        console.error('⚠️ Produto não encontrado');
        toast.error('Produto não encontrado');
        return;
      }

      console.log('📦 Produto encontrado:', product);
      console.log('🔗 Share Link:', product.share_link);
      console.log('🔗 Área de membros:', product.member_areas);

      // Para ebooks/PDFs, verificar primeiro o share_link
      if (productType === 'ebook' || productType === 'pdf' || productType === 'E-book') {
        console.log('📄 Processando ebook/PDF:', productName);
        
        if (product.share_link) {
          const fileUrl = getFileUrl(product.share_link);
          console.log('🌐 Abrindo arquivo via share_link:', fileUrl);
          
          // Abrir em nova aba com timeout para garantir que funcione
          setTimeout(() => {
            window.open(fileUrl, '_blank', 'noopener,noreferrer');
          }, 0);
          
          toast.success(`📄 Abrindo ebook: ${productName}`);
          return;
        }
        
        // Se não tiver share_link, mostrar instruções
        toast.warning(`📄 Ebook: ${productName}\n\n⚠️ Este ebook não possui arquivo de download configurado.`, {
          duration: 6000
        });
        return;
      }

      // Se for um curso/área de membros, abrir a URL da área com acesso admin
      if (product.member_areas && product.member_areas.id) {
        // Marcar acesso como admin no localStorage para bypass de login
        const adminAccessKey = `admin_member_area_access_${product.member_areas.id}`;
        localStorage.setItem(adminAccessKey, JSON.stringify({
          accessedAt: new Date().toISOString(),
          isAdmin: true
        }));

        const url = `/members/area/${product.member_areas.id}?admin_access=true`;
        console.log('🌐 Abrindo URL da área de membros com acesso admin:', url);
        
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          toast.error('Popup bloqueado! Permita popups para este site.');
          return;
        }
        
        toast.success(`✅ Abrindo área de membros: ${product.member_areas.name}`);
        return;
      }

      // Verificar outros tipos de conteúdo
      console.log('📋 Processando produto tipo:', productType);
      
      if (productType === 'curso') {
        toast.warning(`📚 Curso: ${productName}\n\n⚠️ Este curso não possui área de membros configurada.`, {
          duration: 5000
        });
      } else {
        toast.info(`ℹ️ Produto: ${productName}\nTipo: ${productType}\n\n✨ Visualize detalhes do produto no painel.`, {
          duration: 5000
        });
      }

    } catch (error) {
      console.error('💥 Erro inesperado ao visualizar conteúdo:', error);
      toast.error(`Erro inesperado: ${error}`);
    }
  };

  const copyCheckoutLink = async (productId: string, productName: string) => {
    const checkoutLink = `https://pay.kambafy.com/checkout/${productId}`;
    
    try {
      await navigator.clipboard.writeText(checkoutLink);
      toast.success(`Link do checkout copiado!`);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
      toast.error('Erro ao copiar link do checkout');
    }
  };

  const handleApproveAll = async () => {
    const pendingProducts = products.filter(p => 
      !p.admin_approved && 
      p.status !== 'Banido' && 
      p.status !== 'Rascunho' && 
      p.status !== 'Em Revisão' && 
      !p.revision_requested
    );
    
    if (pendingProducts.length === 0) {
      toast.info("Nenhum produto pendente para aprovar");
      return;
    }

    const confirmed = window.confirm(
      `Deseja aprovar ${pendingProducts.length} produto(s) pendente(s) de uma vez?`
    );

    if (!confirmed) return;

    setProcessingId('approving-all');
    toast.info(`Processando ${pendingProducts.length} produto(s)...`);

    const results = await Promise.allSettled(
      pendingProducts.map(async (product) => {
        try {
          // Buscar dados do produto
          const { data: productData, error: fetchError } = await supabase
            .from('products')
            .select('*, profiles!inner(email, full_name)')
            .eq('id', product.id)
            .single();
          
          if (fetchError) throw fetchError;
          
          // Aprovar produto
          const { error: approveError } = await supabase.rpc('admin_approve_product', {
            product_id: product.id,
            admin_id: admin?.id || null,
            p_admin_email: admin?.email || null
          });
          
          if (approveError) throw approveError;
          
          // Enviar email de aprovação
          if (productData) {
            await supabase.functions.invoke('send-product-approval-notification', {
              body: {
                sellerEmail: productData.profiles.email,
                sellerName: productData.profiles.full_name || 'Vendedor',
                productName: productData.name,
                productUrl: productData.share_link || undefined
              }
            });
          }
          
          return { success: true, productName: product.name };
        } catch (error) {
          console.error('❌ Erro ao aprovar produto:', product.name, error);
          return { success: false, productName: product.name, error };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const errorCount = results.length - successCount;

    if (successCount > 0) {
      toast.success(`✅ ${successCount} produto(s) aprovado(s) com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`❌ Erro ao aprovar ${errorCount} produto(s)`);
    }

    setProcessingId(null);
    await loadProducts();
  };

  const getStatusBadge = (product: ProductWithProfile) => {
    // Rascunho tem prioridade
    if (product.status === 'Rascunho') {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          Rascunho
        </Badge>
      );
    }
    
    // Em Revisão
    if (product.status === 'Em Revisão') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
          Em Revisão
        </Badge>
      );
    }
    
    // Banido
    if (product.status === 'Banido') {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Banido
        </Badge>
      );
    }
    
    // Revisão solicitada
    if (product.revision_requested) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          Revisão Solicitada
        </Badge>
      );
    }
    
    // Ativo (aprovado)
    if (product.status === 'Ativo') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Ativo
        </Badge>
      );
    }
    
    // Inativo
    if (product.status === 'Inativo') {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          Inativo
        </Badge>
      );
    }
    
    // Pendente de aprovação
    if (product.status === 'Pendente' || !product.admin_approved) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          Pendente Aprovação
        </Badge>
      );
    }
    
    // Fallback - não deveria chegar aqui
    return (
      <Badge className="bg-gray-100 text-gray-800 border-gray-200">
        {product.status || 'Desconhecido'}
      </Badge>
    );
  };

  // Filtrar produtos baseado no filtro selecionado e termo de pesquisa
  // Por padrão, exclui rascunhos (a menos que o filtro seja explicitamente "rascunho")
  const filteredProducts = products.filter(product => {
    // Filtro por status
    let statusMatch = true;
    if (statusFilter === 'rascunho') statusMatch = product.status === 'Rascunho';
    else if (statusFilter === 'ativo') statusMatch = product.status === 'Ativo';
    else if (statusFilter === 'banido') statusMatch = product.status === 'Banido';
    else if (statusFilter === 'inativo') statusMatch = product.status === 'Inativo';
    else if (statusFilter === 'em_revisao') statusMatch = product.status === 'Em Revisão';
    else if (statusFilter === 'revisao') statusMatch = product.revision_requested === true;
    else if (statusFilter === 'pendente') statusMatch = product.status === 'Pendente';
    else if (statusFilter === 'todos') {
      // No filtro "todos", excluir rascunhos
      statusMatch = product.status !== 'Rascunho';
    }
    
    // Filtro por pesquisa
    if (!searchTerm.trim()) return statusMatch;
    
    const search = searchTerm.toLowerCase();
    const searchMatch = 
      product.id.toLowerCase().includes(search) ||
      product.name.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search) ||
      product.type.toLowerCase().includes(search) ||
      product.profiles?.full_name?.toLowerCase().includes(search) ||
      product.profiles?.email?.toLowerCase().includes(search);
    
    return statusMatch && searchMatch;
  });

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  // Gerar array de páginas para exibição
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <AdminLayout title="Gerenciar Produtos" description="Carregando dados...">
        <AdminPageSkeleton variant="cards" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gerenciar Produtos" description="Revisar e aprovar produtos">
      <SEO title="Kambafy Admin – Produtos" description="Revisar, aprovar e banir produtos com justificativa" canonical="https://kambafy.com/admin/products" noIndex />
      
      {/* Pesquisa e Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
          <Input
            type="text"
            placeholder="Pesquisar por nome, ID, vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]"
          />
        </div>
        
        {/* Filtro de status */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-[hsl(var(--admin-text-secondary))] hidden sm:block" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos ({products.filter(p => p.status !== 'Rascunho').length})</SelectItem>
              <SelectItem value="pendente">Aprovar Produtos ({products.filter(p => p.status === 'Pendente' || (!p.admin_approved && p.status !== 'Banido' && p.status !== 'Rascunho' && p.status !== 'Em Revisão' && !p.revision_requested)).length})</SelectItem>
              <SelectItem value="rascunho">Rascunhos ({products.filter(p => p.status === 'Rascunho').length})</SelectItem>
              <SelectItem value="ativo">Ativos ({products.filter(p => p.status === 'Ativo').length})</SelectItem>
              <SelectItem value="banido">Banidos ({products.filter(p => p.status === 'Banido').length})</SelectItem>
              <SelectItem value="inativo">Inativos ({products.filter(p => p.status === 'Inativo').length})</SelectItem>
              <SelectItem value="em_revisao">Em Revisão ({products.filter(p => p.status === 'Em Revisão').length})</SelectItem>
              <SelectItem value="revisao">Revisão Solicitada ({products.filter(p => p.revision_requested === true).length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Botão Aprovar Todos */}
        <Button
          onClick={handleApproveAll}
          disabled={processingId === 'approving-all' || products.filter(p => !p.admin_approved && p.status !== 'Banido' && p.status !== 'Rascunho' && p.status !== 'Em Revisão' && !p.revision_requested).length === 0}
          variant="default"
          size="sm"
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
        >
          {processingId === 'approving-all' ? 'Aprovando...' : `Aprovar Todos (${products.filter(p => !p.admin_approved && p.status !== 'Banido' && p.status !== 'Rascunho' && p.status !== 'Em Revisão' && !p.revision_requested).length})`}
        </Button>
        
        {/* Toggle Grid/List */}
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View Mode: List */}
      {viewMode === 'list' ? (
        <Card className="shadow-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Capa</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.cover ? (
                      <img 
                        src={getProductImageUrl(product.cover, '/placeholder.svg')} 
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{product.name}</div>
                    <p className="text-xs text-muted-foreground font-mono">{product.id.slice(0, 8)}...</p>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{product.profiles?.full_name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{product.profiles?.email}</div>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{product.type}</TableCell>
                  <TableCell className="font-medium text-green-600">
                    {parseFloat(product.price).toLocaleString('pt-AO')} KZ
                  </TableCell>
                  <TableCell className="text-sm">{product.sales || 0}</TableCell>
                  <TableCell>{getStatusBadge(product)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(product.created_at).toLocaleDateString('pt-AO')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        onClick={() => copyCheckoutLink(product.id, product.name)}
                        size="sm"
                        variant="ghost"
                        disabled={product.status === 'Rascunho'}
                        title="Copiar link checkout"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={(e) => viewProductContent(product.id, product.type, product.name, e)}
                        size="sm"
                        variant="ghost"
                        title="Ver conteúdo"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!product.admin_approved && product.status !== 'Banido' && product.status !== 'Rascunho' && !product.revision_requested && (
                        <Button
                          onClick={async () => {
                            setProcessingId(product.id);
                            try {
                              const { data: productData } = await supabase
                                .from('products')
                                .select('*, profiles!inner(email, full_name)')
                                .eq('id', product.id)
                                .single();
                              
                              const { error } = await supabase.rpc('admin_approve_product', {
                                product_id: product.id,
                                admin_id: admin?.id || null,
                                p_admin_email: admin?.email || null
                              });
                              
                              if (error) {
                                toast.error(`Erro ao aprovar: ${error.message}`);
                                return;
                              }
                              
                              if (productData) {
                                await supabase.functions.invoke('send-product-approval-notification', {
                                  body: {
                                    sellerEmail: productData.profiles.email,
                                    sellerName: productData.profiles.full_name || 'Vendedor',
                                    productName: productData.name,
                                    productUrl: productData.share_link || undefined
                                  }
                                });
                              }
                              
                              toast.success('✅ Produto aprovado!');
                              await loadProducts();
                            } catch (error) {
                              toast.error('Erro ao aprovar');
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          disabled={processingId === product.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Aprovar
                        </Button>
                      )}
                      {product.status !== 'Banido' && (
                        <Button
                          onClick={() => handleBanClick(product.id, product.name)}
                          disabled={processingId === product.id}
                          size="sm"
                          variant="destructive"
                        >
                          Banir
                        </Button>
                      )}
                      {product.revision_requested && (
                        <Button
                          onClick={() => openReviewModal(product)}
                          disabled={processingId === product.id}
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-600"
                        >
                          Revisar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="h-12 w-12 bg-slate-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-xl text-slate-400">📦</span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 mb-1">Nenhum produto encontrado</h3>
                    <p className="text-xs text-slate-600">Não há produtos cadastrados no sistema.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* View Mode: Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProducts.map((product) => (
            <Card key={product.id} className="shadow-sm border hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium text-slate-900 truncate">{product.name}</CardTitle>
                    <p className="text-xs text-slate-600 capitalize">{product.type}</p>
                  </div>
                  {getStatusBadge(product)}
                </div>
                
                {product.cover && (
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                    <img 
                      src={getProductImageUrl(product.cover, '/placeholder.svg')} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <div className="truncate max-w-[60%]">
                    {product.profiles?.full_name || product.profiles?.email || 'N/A'}
                  </div>
                  <div>
                    {new Date(product.created_at).toLocaleDateString('pt-AO')}
                  </div>
                </div>

                <div className="text-sm font-bold text-green-600 mb-3">
                  {parseFloat(product.price).toLocaleString('pt-AO')} KZ
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0">
                {product.description && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-700 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                )}

                <div className="flex justify-between text-xs mb-3">
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-1 text-slate-600">
                      {product.status === 'Banido' 
                        ? 'Banido' 
                        : product.revision_requested 
                          ? 'Em Revisão'
                          : product.admin_approved 
                            ? product.status 
                            : 'Pendente Aprovação'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Vendas:</span>
                    <span className="ml-1 text-slate-600">{product.sales || 0}</span>
                  </div>
                </div>

                {product.status === 'Banido' && product.ban_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-800 mb-3">
                    <span className="font-medium">Motivo do banimento:</span> {product.ban_reason}
                  </div>
                )}

                {/* Badge do admin que processou - visível apenas para super admins */}
                {product.status === 'Ativo' && product.admin_approved && (
                  <AdminActionBadge 
                    adminName={product.approved_by_admin_name}
                    adminId={product.approved_by_admin_id}
                    actionLabel="Aprovado por"
                    className="mb-3"
                  />
                )}
                {product.status === 'Banido' && (
                  <AdminActionBadge 
                    adminName={product.banned_by_admin_name}
                    adminId={product.banned_by_admin_id}
                    actionLabel="Banido por"
                    className="mb-3"
                  />
                )}

                <div className="space-y-2">
                  {/* Botão para copiar link do checkout - desabilitado para rascunhos */}
                  <Button
                    onClick={() => copyCheckoutLink(product.id, product.name)}
                    size="sm"
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/10 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={product.status === 'Rascunho'}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {product.status === 'Rascunho' ? 'Link Indisponível (Rascunho)' : 'Copiar Link Checkout'}
                  </Button>
                  
                  {/* Botão para acessar conteúdo do produto */}
                  <Button
                    onClick={(e) => viewProductContent(product.id, product.type, product.name, e)}
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver Conteúdo
                  </Button>
                  
                  {/* Botão aprovar - para produtos pendentes (não aprovados) mas não rascunhos */}
                  {!product.admin_approved && product.status !== 'Banido' && product.status !== 'Rascunho' && !product.revision_requested && (
                    <Button
                      onClick={async () => {
                        setProcessingId(product.id);
                        try {
                          const { data: productData } = await supabase
                            .from('products')
                            .select('*, profiles!inner(email, full_name)')
                            .eq('id', product.id)
                            .single();
                          
                          const { error } = await supabase.rpc('admin_approve_product', {
                            product_id: product.id,
                            admin_id: admin?.id || null,
                            p_admin_email: admin?.email || null
                          });
                          
                          if (error) {
                            toast.error(`Erro ao aprovar: ${error.message}`);
                            return;
                          }
                          
                          if (productData) {
                            await supabase.functions.invoke('send-product-approval-notification', {
                              body: {
                                sellerEmail: productData.profiles.email,
                                sellerName: productData.profiles.full_name || 'Vendedor',
                                productName: productData.name,
                                productUrl: productData.share_link || undefined
                              }
                            });
                          }
                          
                          toast.success('✅ Produto aprovado com sucesso!');
                          await loadProducts();
                        } catch (error) {
                          toast.error('Erro ao aprovar produto');
                        } finally {
                          setProcessingId(null);
                        }
                      }}
                      disabled={processingId === product.id}
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                    >
                      {processingId === product.id ? 'Aprovando...' : 'Aprovar Produto'}
                    </Button>
                  )}
                  
                  {/* Botão banir */}
                  {product.status !== 'Banido' && (
                    <Button
                      onClick={() => handleBanClick(product.id, product.name)}
                      disabled={processingId === product.id}
                      size="sm"
                      className="w-full bg-red-500 hover:bg-red-600 text-white text-xs"
                    >
                      {processingId === product.id ? 'Banindo...' : 'Banir Produto'}
                    </Button>
                  )}
                  
                  {/* Botão revisar - quando vendedor solicitar revisão (qualquer status) */}
                  {product.revision_requested && (
                    <Button
                      onClick={() => openReviewModal(product)}
                      disabled={processingId === product.id}
                      size="sm"
                      variant="outline"
                      className="w-full border-green-500 text-green-600 hover:bg-green-50 text-xs"
                    >
                      {processingId === product.id ? 'Aprovando...' : 'Revisar Alterações'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
            {paginatedProducts.length === 0 && (
            <Card className="col-span-full shadow-sm border">
              <CardContent className="text-center py-12">
                <div className="h-12 w-12 bg-slate-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="text-xl text-slate-400">📦</span>
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Nenhum produto encontrado</h3>
                <p className="text-xs text-slate-600">Não há produtos cadastrados no sistema.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Exibindo {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} produtos
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      {/* Modal de Banimento */}
      <BanProductModal
        isOpen={banModalOpen}
        onClose={() => setBanModalOpen(false)}
        onConfirm={banProduct}
        productName={selectedProductForBan?.name || ''}
        isLoading={processingId === selectedProductForBan?.id}
      />

      {/* Modal de Revisão */}
      {selectedProductForReview && (
        <ReviewRevisionModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          product={selectedProductForReview}
          onApprove={handleApproveAfterReview}
          onReject={handleRejectRevision}
          loading={processingId === selectedProductForReview.id}
        />
      )}
    </AdminLayout>
  );
}
