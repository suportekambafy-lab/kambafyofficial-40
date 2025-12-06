import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMemberAreaLinks } from '@/utils/memberAreaLinks';
import { getFileUrl } from '@/utils/fileUtils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export default function CustomerAccesses() {
  const navigate = useNavigate();
  const memberAreaLinks = createMemberAreaLinks();
  const { user } = useAuth();
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessingProduct, setAccessingProduct] = useState<string | null>(null);

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

        const { data: accesses, error } = await supabase
          .from('customer_access')
          .select(`
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
          `)
          .eq('customer_email', user.email)
          .eq('is_active', true)
          .order('access_granted_at', { ascending: false });

        if (error) {
          console.error('Error fetching accesses:', error);
        } else {
          console.log('Accesses found for user:', accesses);
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

      console.log('🔑 [Meus Acessos] Conectando ao realtime...');
      const channel = supabase
        .channel(`customer_access_${user.email}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'customer_access',
          filter: `customer_email=eq.${user.email}`
        }, payload => {
          console.log('🔄 [Meus Acessos] Mudança detectada:', payload);
          fetchAccesses();
        })
        .subscribe(status => {
          console.log('📡 [Meus Acessos] Status realtime:', status);
        });

      return () => {
        console.log('🔌 [Meus Acessos] Desconectando realtime...');
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const getProductImage = (coverUrl: string) => {
    if (!coverUrl) return '/placeholder.svg';
    if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://')) {
      return coverUrl;
    }
    return getFileUrl(coverUrl) || '/placeholder.svg';
  };

  const handleAccessProduct = async (product: Access['products']) => {
    if (!product || !user?.email) return;
    setAccessingProduct(product.id);

    try {
      if (product.type === 'Curso' && product.member_areas) {
        const memberArea = product.member_areas;
        console.log('🔐 Acessando área de membros:', memberArea.name);
        const { data: student, error: checkError } = await supabase
          .from('member_area_students')
          .select('id')
          .eq('member_area_id', memberArea.id)
          .eq('student_email', user.email)
          .maybeSingle();

        if (checkError) {
          console.error('Erro ao verificar acesso:', checkError);
          toast.error('Erro ao verificar acesso');
          return;
        }

        if (student) {
          const loginUrl = memberAreaLinks.getMemberAreaLoginUrl(memberArea.id);
          console.log('🔓 Acesso confirmado, redirecionando para:', loginUrl);
          window.location.href = loginUrl;
        } else {
          console.log('❌ Usuário não é estudante da área de membros');
          toast.error('Você não tem acesso a esta área de membros');
        }
      } else if (product.share_link) {
        console.log('🔗 Abrindo link do produto:', product.share_link);
        window.open(product.share_link, '_blank');
      } else {
        toast.error('Este produto não possui link de acesso configurado');
      }
    } catch (error) {
      console.error('Erro ao acessar produto:', error);
      toast.error('Erro ao acessar produto');
    } finally {
      setAccessingProduct(null);
    }
  };

  const totalAcessos = accesses.length;

  return (
    <div className="p-4 md:p-6 space-y-6">
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
          {loading ? (
            <PageSkeleton variant="accesses" />
          ) : accesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
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
            </div>
          ) : (
            <div className="divide-y">
              {accesses.map(access => (
                <div key={access.id} className="p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <img
                      src={getProductImage(access.products?.cover || '')}
                      alt={access.products?.name || 'Produto'}
                      className="w-16 h-20 object-cover rounded-lg shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{access.products?.name || 'Produto'}</h3>
                          <p className="text-sm text-muted-foreground">
                            Acesso liberado em {new Date(access.access_granted_at).toLocaleDateString('pt-BR')}
                          </p>
                          {access.products?.type === 'Curso' && access.products?.member_areas && (
                            <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-800">
                              Curso: {access.products.member_areas.name}
                            </Badge>
                          )}
                          {access.products?.type === 'Ebook' && (
                            <Badge variant="secondary" className="mt-1 bg-purple-100 text-purple-800">
                              Ebook
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center space-x-2 flex-wrap gap-2">
                        {access.products ? (
                          access.products.type === 'Curso' && access.products.member_areas ? (
                            <Button
                              onClick={() => handleAccessProduct(access.products)}
                              size="sm"
                              className="bg-checkout-green hover:bg-checkout-green/90"
                              disabled={accessingProduct === access.products.id}
                            >
                              {accessingProduct === access.products.id ? (
                                <>
                                  <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                                  Verificando...
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Acessar Curso
                                </>
                              )}
                            </Button>
                          ) : access.products.share_link ? (
                            <Button
                              onClick={() => handleAccessProduct(access.products)}
                              size="sm"
                              className="bg-checkout-green hover:bg-checkout-green/90"
                              disabled={accessingProduct === access.products.id}
                            >
                              {accessingProduct === access.products.id ? (
                                <>
                                  <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                                  Verificando...
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Acessar Produto
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              Link não disponível
                            </Button>
                          )
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            Produto Indisponível
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
