import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package, 
  Search, 
  UserX, 
  UserCheck, 
  Wallet,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  Filter,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BanUserDialog } from '@/components/BanUserDialog';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SellerRetentionDialog } from '@/components/admin/SellerRetentionDialog';
import { Shield } from 'lucide-react';

interface SellerReport {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  banned: boolean | null;
  is_creator: boolean | null;
  total_sales: number;
  total_revenue: number;
  total_withdrawals: number;
  total_fees: number;
  available_balance: number;
  active_products: number;
  banned_products: number;
  balance_retention_percentage?: number;
  retention_reason?: string | null;
}

export default function AdminSellerReports() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<SellerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<SellerReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned' | 'creator'>('all');
  const [retentionDialogOpen, setRetentionDialogOpen] = useState(false);
  const [sellerToManage, setSellerToManage] = useState<SellerReport | null>(null);

  useEffect(() => {
    if (admin) {
      loadSellersReport();
    }
  }, [admin]);

  const loadSellersReport = async () => {
    setLoading(true);
    try {
      console.log('🔄 Carregando relatórios de vendedores...');

      // Buscar todos os perfis com paginação
      let allProfiles: any[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url, banned, is_creator, balance_retention_percentage, retention_reason')
          .range(offset, offset + limit - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allProfiles = [...allProfiles, ...data];
          offset += limit;
          hasMore = data.length === limit;
        } else {
          hasMore = false;
        }
      }
      console.log(`✅ ${allProfiles.length} perfis carregados`);

      // Buscar todos os produtos
      let allProducts: any[] = [];
      offset = 0;
      hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('id, user_id, status')
          .range(offset, offset + limit - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data];
          offset += limit;
          hasMore = data.length === limit;
        } else {
          hasMore = false;
        }
      }
      console.log(`✅ ${allProducts.length} produtos carregados`);

      // Buscar todas as vendas completadas
      let allOrders: any[] = [];
      offset = 0;
      hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('product_id, amount, status')
          .eq('status', 'completed')
          .range(offset, offset + limit - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allOrders = [...allOrders, ...data];
          offset += limit;
          hasMore = data.length === limit;
        } else {
          hasMore = false;
        }
      }
      console.log(`✅ ${allOrders.length} vendas carregadas`);

      // Buscar todos os saques aprovados usando RPC (bypassa RLS)
      console.log('🔍 Buscando saques via RPC...');
      const { data: allWithdrawals, error: withdrawalsError } = await supabase
        .rpc('admin_get_all_withdrawals');

      if (withdrawalsError) {
        console.error('❌ Erro ao buscar saques:', withdrawalsError);
        throw withdrawalsError;
      }
      console.log(`✅ ${allWithdrawals?.length || 0} saques carregados`);

      // Buscar todos os saldos usando RPC (bypassa RLS)
      console.log('🔍 Buscando saldos via RPC...');
      const { data: allBalances, error: balancesError } = await supabase
        .rpc('admin_get_all_balances');
      
      if (balancesError) {
        console.error('❌ Erro ao buscar saldos:', balancesError);
        throw balancesError;
      }
      console.log(`✅ ${allBalances?.length || 0} saldos carregados`, allBalances?.slice(0, 2));

      // Criar mapas para lookup eficiente
      const productsByUser = new Map<string, any[]>();
      const ordersByProduct = new Map<string, any[]>();
      const withdrawalsByUser = new Map<string, number>();
      const balanceByUser = new Map<string, number>();

      // Organizar produtos por usuário
      allProducts?.forEach(product => {
        if (!productsByUser.has(product.user_id)) {
          productsByUser.set(product.user_id, []);
        }
        productsByUser.get(product.user_id)!.push(product);
      });

      // Organizar vendas por produto
      allOrders?.forEach(order => {
        if (!ordersByProduct.has(order.product_id)) {
          ordersByProduct.set(order.product_id, []);
        }
        ordersByProduct.get(order.product_id)!.push(order);
      });

      // Organizar saques por usuário
      allWithdrawals?.forEach(withdrawal => {
        const current = withdrawalsByUser.get(withdrawal.user_id) || 0;
        withdrawalsByUser.set(withdrawal.user_id, current + withdrawal.amount);
      });

      // Organizar saldos por usuário
      allBalances?.forEach(balance => {
        balanceByUser.set(balance.user_id, balance.balance);
      });

      // Processar dados de cada vendedor
      const sellersData = allProfiles.map(profile => {
        const userProducts = productsByUser.get(profile.user_id) || [];
        const activeProducts = userProducts.filter(p => p.status === 'Ativo').length;
        const bannedProducts = userProducts.filter(p => p.status === 'Banido').length;

        // Buscar todas as vendas dos produtos deste usuário
        let totalSales = 0;
        let totalRevenue = 0;

        userProducts.forEach(product => {
          const productOrders = ordersByProduct.get(product.id) || [];
          totalSales += productOrders.length;
          totalRevenue += productOrders.reduce((sum, order) => 
            sum + parseFloat(order.amount || '0'), 0
          );
        });

        const totalWithdrawals = withdrawalsByUser.get(profile.user_id) || 0;
        const availableBalance = balanceByUser.get(profile.user_id) || 0;
        const totalFees = totalRevenue * 0.08;

        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          banned: profile.banned,
          is_creator: profile.is_creator,
          total_sales: totalSales,
          total_revenue: totalRevenue,
          total_withdrawals: totalWithdrawals,
          total_fees: totalFees,
          available_balance: availableBalance,
          active_products: activeProducts,
          banned_products: bannedProducts,
        };
      });

      console.log(`✅ Relatório processado: ${sellersData.length} vendedores`);
      setSellers(sellersData.sort((a, b) => b.total_revenue - a.total_revenue));
    } catch (error) {
      console.error('❌ Erro ao carregar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os relatórios',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = (seller: SellerReport) => {
    setUserToBan(seller);
    setBanDialogOpen(true);
  };

  const handleConfirmBan = async (banReason: string) => {
    if (!userToBan) return;
    
    setProcessingId(userToBan.user_id);
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          banned: true,
          ban_reason: banReason,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userToBan.user_id);

      if (updateError) throw updateError;

      try {
        await supabase.functions.invoke('send-user-ban-notification', {
          body: {
            userEmail: userToBan.email,
            userName: userToBan.full_name || 'Usuário',
            banReason: banReason
          }
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário banido com sucesso',
        variant: 'destructive'
      });

      loadSellersReport();
      setBanDialogOpen(false);
      setUserToBan(null);
    } catch (error) {
      console.error('Erro ao banir:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível banir o usuário',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const updateUserStatus = async (userId: string, banned: boolean) => {
    setProcessingId(userId);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          banned,
          ban_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Usuário ${banned ? 'banido' : 'desbloqueado'} com sucesso`
      });

      loadSellersReport();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Filtrar vendedores
  const filteredSellers = sellers.filter(seller => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      seller.full_name?.toLowerCase().includes(searchLower) ||
      seller.email?.toLowerCase().includes(searchLower);
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'banned' && seller.banned) ||
      (filterStatus === 'creator' && seller.is_creator) ||
      (filterStatus === 'active' && !seller.banned && !seller.is_creator);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Relatórios de Vendedores - Admin Kambafy"
        description="Análise detalhada de vendedores da plataforma"
        noIndex
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-8 w-8" />
                Relatórios de Vendedores
              </h1>
              <p className="text-muted-foreground mt-1">
                Análise completa de {sellers.length} vendedores na plataforma
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="creator">Criadores</SelectItem>
                    <SelectItem value="banned">Banidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sellers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredSellers.length} visíveis com filtros
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Total de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {sellers.reduce((sum, s) => sum + s.total_sales, 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Transações completadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {sellers.reduce((sum, s) => sum + s.total_revenue, 0).toLocaleString('pt-AO')} KZ
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor bruto gerado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Vendedores */}
        {filteredSellers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum vendedor encontrado</p>
              <p className="text-muted-foreground">Tente ajustar os filtros de busca</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSellers.map((seller) => (
              <Card key={seller.user_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                        {seller.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {seller.full_name || 'Sem nome'}
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                          {seller.email}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {seller.banned && (
                        <Badge variant="destructive">Banido</Badge>
                      )}
                      {seller.is_creator && !seller.banned && (
                        <Badge className="bg-purple-600">Criador</Badge>
                      )}
                      {!seller.banned && !seller.is_creator && (
                        <Badge variant="secondary">Ativo</Badge>
                      )}
                      {seller.balance_retention_percentage && seller.balance_retention_percentage > 0 && (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                          <Shield className="h-3 w-3 mr-1" />
                          Retenção {seller.balance_retention_percentage}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <ShoppingBag className="h-3 w-3" />
                        Vendas
                      </div>
                      <div className="font-bold text-lg">{seller.total_sales}</div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <Package className="h-3 w-3" />
                        Produtos
                      </div>
                      <div className="font-bold text-lg">{seller.active_products}</div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <DollarSign className="h-3 w-3" />
                        Receita Total
                      </div>
                      <div className="font-bold text-lg">
                        {seller.total_revenue.toLocaleString('pt-AO')} KZ
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Financeiros */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Saques
                      </span>
                      <span className="font-medium">
                        {seller.total_withdrawals.toLocaleString('pt-AO')} KZ
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        Saldo
                      </span>
                      <span className="font-medium text-green-600">
                        {seller.available_balance.toLocaleString('pt-AO')} KZ
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Taxas
                      </span>
                      <span className="font-medium text-orange-600">
                        {seller.total_fees.toLocaleString('pt-AO')} KZ
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="pt-2 space-y-2">
                    <Button
                      onClick={() => {
                        setSellerToManage(seller);
                        setRetentionDialogOpen(true);
                      }}
                      className="w-full"
                      variant="outline"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Gerenciar Retenção
                    </Button>
                    
                    {seller.banned ? (
                      <Button
                        onClick={() => updateUserStatus(seller.user_id, false)}
                        disabled={processingId === seller.user_id}
                        className="w-full"
                        variant="outline"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        {processingId === seller.user_id ? 'Processando...' : 'Desbloquear'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBanUser(seller)}
                        disabled={processingId === seller.user_id}
                        className="w-full"
                        variant="destructive"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        {processingId === seller.user_id ? 'Processando...' : 'Banir Usuário'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Banimento */}
      <BanUserDialog
        isOpen={banDialogOpen}
        onClose={() => setBanDialogOpen(false)}
        onConfirm={handleConfirmBan}
        userName={userToBan?.full_name || userToBan?.email || 'usuário'}
        isLoading={processingId !== null}
      />

      {/* Dialog de Retenção */}
      {sellerToManage && (
        <SellerRetentionDialog
          open={retentionDialogOpen}
          onOpenChange={setRetentionDialogOpen}
          userId={sellerToManage.user_id}
          userEmail={sellerToManage.email || ''}
          currentBalance={sellerToManage.available_balance}
          currentRetention={sellerToManage.balance_retention_percentage || 0}
          adminEmail={admin?.email || ''}
          onSuccess={() => {
            loadSellersReport();
            setSellerToManage(null);
          }}
        />
      )}
    </div>
  );
}
