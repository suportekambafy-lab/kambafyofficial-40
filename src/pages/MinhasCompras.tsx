
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightedCard, HighlightedCardHeader, HighlightedCardTitle, HighlightedCardContent } from "@/components/ui/highlighted-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, Calendar, Eye, User, LogOut, Settings, ExternalLink, BookOpen, TrendingUp, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarDrawer } from "@/components/ui/avatar-drawer";
import { CustomerBalanceModal } from "@/components/CustomerBalanceModal";
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import professionalManImage from "@/assets/professional-man.jpg";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  product_id: string;
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

export default function MinhasCompras() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false);
  
  // Hook para buscar saldo KambaPay
  const { balance, fetchBalanceByEmail } = useKambaPayBalance();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.email) {
        console.log('No user email found');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching orders for user email:', user.email);
        setLoading(true);
        
        // Buscar apenas pedidos do usuário logado usando o email
        const { data: orders, error } = await supabase
          .from('orders')
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
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching orders:', error);
        } else {
          console.log('Orders found for user:', orders);
          // Filtrar apenas pedidos que têm produtos válidos
          const validOrders = orders?.filter(order => order.products !== null) || [];
          setOrders(validOrders);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrders();
      
      // Configurar atualização automática dos dados
      const interval = setInterval(() => {
        fetchOrders();
      }, 60000); // Atualizar a cada 1 minuto
      
      return () => clearInterval(interval);
    }
  }, [user]);

  // Buscar saldo KambaPay quando o usuário estiver logado
  useEffect(() => {
    if (user?.email) {
      fetchBalanceByEmail(user.email);
    }
  }, [user, fetchBalanceByEmail]);

  const getProductImage = (cover: string) => {
    if (!cover) return professionalManImage;
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

  const handleAccessProduct = (product: any) => {
    // Para cursos, usar a nova rota protegida moderna
    if (product.type === 'Curso' && product.member_areas?.id) {
      navigate(`/area/${product.member_areas.id}`);
    } else if (product.share_link) {
      window.open(product.share_link, '_blank');
    } else {
      alert('Link de acesso não disponível para este produto.');
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Calcular estatísticas corretamente
  const totalCompras = orders.length;
  const cursosDisponiveis = orders.filter(order => 
    order.products?.type === 'Curso' && order.products?.member_areas
  ).length;
  const ebooksDisponiveis = orders.filter(order => 
    order.products?.type === 'Ebook'
  ).length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="bg-gradient-to-r from-green-400 to-green-500 text-white p-4 border-b shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                <span className="text-green-500 font-bold text-xl">K</span>
              </div>
              <div>
                <span className="text-xl font-bold">Kambafy</span>
                <p className="text-green-100 text-sm">Suas compras</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CustomerBalanceModal>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white border-white/20 border hover:bg-white/10"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Saldo: {balance ? `${balance.balance.toLocaleString()} KZ` : '0 KZ'}
                </Button>
              </CustomerBalanceModal>
              
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full p-0 hover:bg-white/10"
                onClick={() => setAvatarDrawerOpen(true)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-green-600 text-white text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          {/* Modern Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <HighlightedCard highlightColor="blue">
              <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <HighlightedCardTitle className="text-sm font-medium">Total de Compras</HighlightedCardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </HighlightedCardHeader>
              <HighlightedCardContent>
                <div className="text-2xl font-bold">{totalCompras}</div>
                <p className="text-xs text-muted-foreground">
                  {totalCompras === 0 ? 'Nenhuma compra realizada' : `${totalCompras} compra${totalCompras > 1 ? 's' : ''} realizada${totalCompras > 1 ? 's' : ''}`}
                </p>
              </HighlightedCardContent>
            </HighlightedCard>
            
            <HighlightedCard highlightColor="green">
              <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <HighlightedCardTitle className="text-sm font-medium">Cursos Disponíveis</HighlightedCardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </HighlightedCardHeader>
              <HighlightedCardContent>
                <div className="text-2xl font-bold">{cursosDisponiveis}</div>
                <p className="text-xs text-muted-foreground">Cursos para acessar</p>
              </HighlightedCardContent>
            </HighlightedCard>

            <HighlightedCard highlightColor="purple">
              <HighlightedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <HighlightedCardTitle className="text-sm font-medium">Ebooks Disponíveis</HighlightedCardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </HighlightedCardHeader>
              <HighlightedCardContent>
                <div className="text-2xl font-bold">{ebooksDisponiveis}</div>
                <p className="text-xs text-muted-foreground">Ebooks para baixar</p>
              </HighlightedCardContent>
            </HighlightedCard>
          </div>

          {/* Purchases List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Minhas Compras
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <LoadingSpinner text="Carregando suas compras..." />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Nenhuma compra realizada</h3>
                      <p className="text-muted-foreground">
                        Suas compras aparecerão aqui quando você adquirir produtos.
                      </p>
                    </div>
                    <Button asChild className="bg-checkout-green hover:bg-checkout-green/90">
                      <Link to="/">Explorar Produtos</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {orders.map((order) => (
                    <div key={order.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start space-x-4">
                        <img
                          src={getProductImage(order.products?.cover || '')}
                          alt={order.products?.name || 'Produto'}
                          className="w-16 h-20 object-cover rounded-lg shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{order.products?.name || 'Produto'}</h3>
                              <p className="text-sm text-muted-foreground">Pedido #{order.order_id}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('pt-BR')}
                              </p>
                              {order.products?.type === 'Curso' && order.products?.member_areas && (
                                <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-800">
                                  Curso: {order.products.member_areas.name}
                                </Badge>
                              )}
                              {order.products?.type === 'Ebook' && (
                                <Badge variant="secondary" className="mt-1 bg-purple-100 text-purple-800">
                                  Ebook
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{order.amount} {order.currency}</p>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {order.status === 'completed' ? 'Pago' : order.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center space-x-2">
                            {order.products ? (
                              order.products.type === 'Curso' && order.products.member_areas ? (
                                <Button
                                  onClick={() => handleAccessProduct(order.products)}
                                  size="sm"
                                  className="bg-checkout-green hover:bg-checkout-green/90"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Acessar Curso
                                </Button>
                              ) : order.products.share_link ? (
                                <Button
                                  onClick={() => handleAccessProduct(order.products)}
                                  size="sm"
                                  className="bg-checkout-green hover:bg-checkout-green/90"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Acessar Produto
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                >
                                  Link não disponível
                                </Button>
                              )
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                              >
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

        <AvatarDrawer
          isOpen={avatarDrawerOpen}
          onClose={() => setAvatarDrawerOpen(false)}
          profileAvatar=""
          profileName={user?.email || 'Usuário'}
          isMobile={false}
        />
      </div>
    </ProtectedRoute>
  );
}
