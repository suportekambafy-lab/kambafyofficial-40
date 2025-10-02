
import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileText, Eye, Download, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BanProductModal from '@/components/BanProductModal';
import { SEO } from '@/components/SEO';
import { createMemberAreaLinks } from '@/utils/memberAreaLinks';

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
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedProductForBan, setSelectedProductForBan] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (admin) {
      console.log('Admin logado, carregando produtos...');
      loadProducts();
    }
  }, [admin]);

  const loadProducts = async () => {
    try {
      console.log('Carregando produtos...');
      
      // Buscar produtos com novas colunas
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, member_areas(id, name, url)')
        .order('created_at', { ascending: false });

      console.log('Produtos encontrados:', productsData);

      if (productsError) {
        console.error('Erro ao carregar produtos:', productsError);
        toast.error('Erro ao carregar produtos');
        return;
      }

      // Depois buscar os perfis dos usuários
      if (productsData && productsData.length > 0) {
        const userIds = productsData.map(p => p.user_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        console.log('Perfis encontrados:', profiles);

        if (profileError) {
          console.error('Erro ao carregar perfis:', profileError);
        }

        // Combinar os dados
        const productsWithProfiles = productsData.map(product => ({
          ...product,
          profiles: profiles?.find(p => p.user_id === product.user_id) || null
        }));

        console.log('Resultado final:', productsWithProfiles);
        
        // Debug específico para produtos banidos com revisão solicitada
        const bannedProducts = productsWithProfiles.filter(p => p.status === 'Banido');
        const bannedWithRevision = productsWithProfiles.filter(p => 
          p.status === 'Banido' && p.revision_requested
        );
        
        console.log('📊 Debug produtos:');
        console.log(`- Total produtos: ${productsWithProfiles.length}`);
        console.log(`- Produtos banidos: ${bannedProducts.length}`);
        console.log(`- Banidos com revisão solicitada: ${bannedWithRevision.length}`);
        
        if (bannedProducts.length > 0) {
          console.log('🚫 Produtos banidos:', bannedProducts.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            revision_requested: p.revision_requested,
            revision_requested_at: p.revision_requested_at
          })));
        }
        
        if (bannedWithRevision.length > 0) {
          console.log('✅ Produtos banidos com revisão solicitada (mostrarão botão aprovar):', bannedWithRevision.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            revision_requested: p.revision_requested,
            revision_requested_at: p.revision_requested_at
          })));
        } else {
          console.log('ℹ️ Nenhum produto banido com revisão solicitada encontrado');
        }
        
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
        ban_reason_text: reason
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

  const approveProduct = async (productId: string) => {
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
        admin_id: admin?.id || null
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
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error(`Erro inesperado: ${error}`);
    } finally {
      setProcessingId(null);
    }
  };

  const viewProductContent = async (productId: string, productType: string, productName: string) => {
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
          console.log('🌐 Abrindo arquivo via share_link:', product.share_link);
          
          const newWindow = window.open(product.share_link, '_blank');
          if (!newWindow) {
            toast.error('Popup bloqueado! Permita popups para este site.');
            return;
          }
          
          toast.success(`📄 Abrindo ebook: ${productName}`);
          return;
        }
        
        // Se não tiver share_link, mostrar instruções
        toast.warning(`📄 Ebook: ${productName}\n\n⚠️ Este ebook não possui arquivo de download configurado.`, {
          duration: 6000
        });
        return;
      }

      // Se for um curso/área de membros, abrir a URL da área
      if (product.member_areas && product.member_areas.id) {
        const memberAreaLinks = createMemberAreaLinks();
        const url = memberAreaLinks.getMemberAreaUrl(product.member_areas.id);
        console.log('🌐 Abrindo URL da área de membros:', url);
        
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

  const getStatusBadge = (product: ProductWithProfile) => {
    if (product.status === 'Banido') {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Banido
        </Badge>
      );
    }
    
    if (product.revision_requested) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          Revisão Solicitada
        </Badge>
      );
    }
    
    return product.admin_approved ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        Aprovado
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        Pendente
      </Badge>
    );
  };

  // Filtrar produtos baseado no filtro selecionado
  const filteredProducts = products.filter(product => {
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'ativo') return product.status === 'Ativo';
    if (statusFilter === 'banido') return product.status === 'Banido';
    if (statusFilter === 'inativo') return product.status === 'Inativo';
    if (statusFilter === 'revisao') return product.revision_requested === true;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Kambafy Admin – Produtos" description="Revisar, aprovar e banir produtos com justificativa" canonical="https://kambafy.com/admin/products" noIndex />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 hover:bg-accent self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Dashboard</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gerenciar Produtos</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Revisar e aprovar produtos</p>
          </div>
          
          {/* Filtros - Responsivo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos ({products.length})</SelectItem>
                <SelectItem value="ativo">Ativos ({products.filter(p => p.status === 'Ativo').length})</SelectItem>
                <SelectItem value="banido">Banidos ({products.filter(p => p.status === 'Banido').length})</SelectItem>
                <SelectItem value="inativo">Inativos ({products.filter(p => p.status === 'Inativo').length})</SelectItem>
                <SelectItem value="revisao">Revisão Solicitada ({products.filter(p => p.revision_requested === true).length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
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
                      src={product.cover.startsWith('data:') ? product.cover : 
                            (product.cover.includes('supabase') || product.cover.startsWith('http')) ? product.cover : 
                            `https://images.unsplash.com/${product.cover}`} 
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
                    <span className="ml-1 text-slate-600">{product.status}</span>
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

                <div className="space-y-2">
                  {/* Botão para acessar conteúdo do produto */}
                  <Button
                    onClick={() => viewProductContent(product.id, product.type, product.name)}
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver Conteúdo
                  </Button>
                  
                  {/* Fluxo correto de aprovação */}
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
                  
                  {/* Mostrar botão aprovar APENAS quando vendedor solicitar revisão */}
                  {/* Debug: revision_requested=${product.revision_requested}, status=${product.status} */}
                  {product.revision_requested && product.status === 'Banido' && (
                    <Button
                      onClick={() => approveProduct(product.id)}
                      disabled={processingId === product.id}
                      size="sm"
                      variant="outline"
                      className="w-full border-green-500 text-green-600 hover:bg-green-50 text-xs"
                    >
                      {processingId === product.id ? 'Aprovando...' : 'Aprovar Produto'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
            {filteredProducts.length === 0 && (
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
      </div>

      {/* Modal de Banimento */}
      <BanProductModal
        isOpen={banModalOpen}
        onClose={() => setBanModalOpen(false)}
        onConfirm={banProduct}
        productName={selectedProductForBan?.name || ''}
        isLoading={processingId === selectedProductForBan?.id}
      />
    </div>
  );
}
