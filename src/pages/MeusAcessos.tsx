import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightedCard, HighlightedCardHeader, HighlightedCardTitle, HighlightedCardContent } from "@/components/ui/highlighted-card";
import { createMemberAreaLinks } from '@/utils/memberAreaLinks';
import { getFileUrl } from '@/utils/fileUtils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Calendar, Eye, ExternalLink, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { toast } from 'sonner';
import { CustomerTopBar } from "@/components/customer/CustomerTopBar";
interface Access {
  id: string;
  customer_email: string;
  customer_name: string;
  product_id: string;
  access_granted_at: string;
  is_active: boolean;
  products: {
    id: string;
    name: string;
    cover: string;
    share_link: string;
    type: string;
    member_areas?: {
      id: string;
      name: string;
      url: string;
    };
  } | null;
}
export default function MeusAcessos() {
  const navigate = useNavigate();
  const memberAreaLinks = createMemberAreaLinks();
  const {
    user,
    signOut
  } = useAuth();
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchAccesses = async () => {
      if (!user?.email) {
        console.log('No user email found');
        setLoading(false);
        return;
      }
      try {
        console.log('Fetching accesses for user email:', user.email);
        setLoading(true);

        // Buscar todos os acessos do usuário logado via customer_access
        const {
          data: accesses,
          error
        } = await supabase.from('customer_access').select(`
            *,
            products (
              id,
              name,
              cover,
              share_link,
              type,
              member_areas (
                id,
                name,
                url
              )
            )
          `).eq('customer_email', user.email).eq('is_active', true).order('access_granted_at', {
          ascending: false
        });
        if (error) {
          console.error('Error fetching accesses:', error);
        } else {
          console.log('Accesses found for user:', accesses);
          // Filtrar apenas acessos que têm produtos válidos
          const validAccesses = accesses?.filter(access => access.products !== null) || [];
          setAccesses(validAccesses);
        }
      } catch (error) {
        console.error('Error fetching accesses:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchAccesses();

      // ✅ WebSocket: Escutar mudanças em tempo real
      console.log('🔑 [Meus Acessos] Conectando ao realtime...');
      const channel = supabase.channel(`customer_access_${user.email}`).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customer_access',
        filter: `customer_email=eq.${user.email}`
      }, payload => {
        console.log('🔑 [Meus Acessos] Mudança detectada:', payload);
        fetchAccesses();
      }).subscribe(status => {
        console.log('🔑 [Meus Acessos] Status da conexão:', status);
      });
      return () => {
        console.log('🔑 [Meus Acessos] Desconectando...');
        supabase.removeChannel(channel);
      };
    }
  }, [user]);
  const getProductImage = (cover: string) => {
    if (!cover) return '/placeholder.svg';
    if (cover.startsWith('data:')) {
      return cover;
    }
    // Se a URL já inclui supabase ou http/https, usar diretamente
    if (cover.includes('supabase') || cover.startsWith('http')) {
      return cover;
    }
    // Caso contrário, assumir que é ID do Unsplash (compatibilidade)
    return `https://images.unsplash.com/${cover}`;
  };
  const [accessingProduct, setAccessingProduct] = useState<string | null>(null);
  const handleAccessProduct = async (product: any) => {
    console.log('🚀 MinhasCompras - Tentando acessar produto:', {
      product,
      productType: product.type,
      memberAreaId: product.member_areas?.id
    });

    // Para cursos, fazer verificação direta de acesso
    if (product.type === 'Curso' && product.member_areas?.id) {
      setAccessingProduct(product.id);
      try {
        // Verificar se o usuário tem acesso diretamente
        const {
          data: memberAreaData,
          error: memberAreaError
        } = await supabase.from('member_areas').select('id, name, user_id').eq('id', product.member_areas.id).single();
        if (memberAreaError || !memberAreaData) {
          throw new Error('Área de membros não encontrada');
        }

        // Verificar se tem acesso válido via customer_access
        const {
          data: customerAccess,
          error: accessError
        } = await supabase.from('customer_access').select('*').eq('customer_email', user?.email).eq('product_id', product.id).eq('is_active', true).maybeSingle();
        if (accessError || !customerAccess) {
          throw new Error('Você não tem acesso a esta área de membros');
        }

        // Se chegou até aqui, tem acesso - redirecionar diretamente para área com query params
        window.location.href = `/members/area/${product.member_areas.id}?verified=true&email=${encodeURIComponent(user?.email || '')}`;
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        toast.error('Erro ao acessar produto', {
          description: error.message || 'Tente novamente mais tarde'
        });
      } finally {
        setAccessingProduct(null);
      }
    } else if (product.share_link) {
      const fileUrl = getFileUrl(product.share_link);
      console.log('🔗 MinhasCompras - Abrindo share_link:', fileUrl);

      // Import dinamically to avoid circular deps
      import('@/utils/fileUtils').then(({
        openFile
      }) => {
        openFile(fileUrl, product.name);
      });
    } else {
      console.log('❌ MinhasCompras - Nenhum link de acesso disponível');
      alert('Link de acesso não disponível para este produto.');
    }
  };
  const handleLogout = async () => {
    await signOut();
  };

  // Calcular estatísticas dos acessos
  const totalAcessos = accesses.length;
  const cursosDisponiveis = accesses.filter(access => access.products?.type === 'Curso' && access.products?.member_areas).length;
  const ebooksDisponiveis = accesses.filter(access => access.products?.type === 'Ebook').length;
  return <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <CustomerTopBar />

        <div className="p-4 md:p-6 space-y-6">
          {/* Accesses List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Meus Acessos
                <Badge variant="secondary" className="ml-1">
                  {totalAcessos}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <PageSkeleton variant="accesses" /> : accesses.length === 0 ? <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Nenhum acesso disponível</h3>
                      <p className="text-muted-foreground">
                        Seus acessos aparecerão aqui quando você adquirir produtos ou receber acessos.
                      </p>
                    </div>
                    <Button asChild className="bg-checkout-green hover:bg-checkout-green/90">
                      <Link to="/">Explorar Produtos</Link>
                    </Button>
                  </div>
                </div> : <div className="divide-y">
                  {accesses.map(access => <div key={access.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start space-x-4">
                        <img src={getProductImage(access.products?.cover || '')} alt={access.products?.name || 'Produto'} className="w-16 h-20 object-cover rounded-lg shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{access.products?.name || 'Produto'}</h3>
                              <p className="text-sm text-muted-foreground">
                                Acesso liberado em {new Date(access.access_granted_at).toLocaleDateString('pt-BR')}
                              </p>
                              {access.products?.type === 'Curso' && access.products?.member_areas && <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-800">
                                  Curso: {access.products.member_areas.name}
                                </Badge>}
                              {access.products?.type === 'Ebook' && <Badge variant="secondary" className="mt-1 bg-purple-100 text-purple-800">
                                  Ebook
                                </Badge>}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center space-x-2 flex-wrap gap-2">
                            {access.products ? access.products.type === 'Curso' && access.products.member_areas ? <Button onClick={() => handleAccessProduct(access.products)} size="sm" className="bg-checkout-green hover:bg-checkout-green/90" disabled={accessingProduct === access.products.id}>
                                  {accessingProduct === access.products.id ? <>
                                      <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                                      Verificando...
                                    </> : <>
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Acessar Curso
                                    </>}
                                </Button> : access.products.share_link ? <Button onClick={() => handleAccessProduct(access.products)} size="sm" className="bg-checkout-green hover:bg-checkout-green/90" disabled={accessingProduct === access.products.id}>
                                  {accessingProduct === access.products.id ? <>
                                      <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                                      Verificando...
                                    </> : <>
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Acessar Produto
                                    </>}
                                </Button> : <Button size="sm" variant="outline" disabled>
                                  Link não disponível
                                </Button> : <Button size="sm" variant="outline" disabled>
                                Produto Indisponível
                              </Button>}
                          </div>
                        </div>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>;
}