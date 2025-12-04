import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BanUserDialog } from '@/components/BanUserDialog';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SellerRetentionDialog } from '@/components/admin/SellerRetentionDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminLayout } from '@/components/admin/AdminLayout';

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
  retention_release_date?: string | null;
}

export default function AdminSellerReports() {
  const { admin } = useAdminAuth();
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
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
          .select('user_id, full_name, email, avatar_url, banned, is_creator, balance_retention_percentage, retention_reason, retention_release_date')
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

  // Pagination
  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage);
  const paginatedSellers = filteredSellers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalRevenue = sellers.reduce((sum, s) => sum + s.total_revenue, 0);
  const totalSales = sellers.reduce((sum, s) => sum + s.total_sales, 0);
  const totalWithdrawals = sellers.reduce((sum, s) => sum + s.total_withdrawals, 0);

  const getStatusBadge = (banned: boolean | null, isCreator: boolean | null, retention?: number) => {
    if (banned) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
          Banido
        </span>
      );
    }
    if (retention && retention > 0) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
          <Shield className="h-3 w-3 mr-1" />
          Retenção {retention}%
        </span>
      );
    }
    if (isCreator) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
          Criador
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
        Ativo
      </span>
    );
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--admin-bg))]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--admin-primary))]" />
      </div>
    );
  }

  return (
    <AdminLayout title="Relatórios de Vendedores" description={`Análise completa de ${sellers.length} vendedores`}>
      <SEO 
        title="Relatórios de Vendedores - Admin Kambafy"
        description="Análise detalhada de vendedores da plataforma"
        noIndex
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--admin-bg))] flex items-center justify-center">
            <Users className="h-5 w-5 text-[hsl(var(--admin-text-secondary))]" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Total Vendedores</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{sellers.length.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Total Vendas</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{totalSales.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Receita Total</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{totalRevenue.toLocaleString('pt-AO')} KZ</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Total Saques</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{totalWithdrawals.toLocaleString('pt-AO')} KZ</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))]">
        {/* Table Header */}
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[hsl(var(--admin-border))]">
          <h3 className="font-semibold text-[hsl(var(--admin-text))]">Lista de vendedores</h3>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Pesquisar vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-52 pl-3 pr-10 h-9 bg-white border-[hsl(var(--admin-border))] rounded-lg"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
            </div>

            {/* Filter */}
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-32 h-9">
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

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[hsl(var(--admin-border))] hover:bg-transparent">
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Vendedor</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Vendas</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Receita</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Saldo</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Produtos</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Estado</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[hsl(var(--admin-text-secondary))]">
                    Nenhum vendedor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSellers.map((seller) => (
                  <TableRow key={seller.user_id} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-bg))]/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[hsl(var(--admin-primary))] flex items-center justify-center">
                          {seller.avatar_url ? (
                            <img 
                              src={seller.avatar_url} 
                              alt={seller.full_name || 'Avatar'}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold">
                              {seller.full_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[hsl(var(--admin-text))]">
                            {seller.full_name || 'Sem nome'}
                          </p>
                          <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
                            {seller.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text))]">
                      {seller.total_sales}
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text))] font-medium">
                      {seller.total_revenue.toLocaleString('pt-AO')} KZ
                    </TableCell>
                    <TableCell className="text-emerald-600 font-medium">
                      {seller.available_balance.toLocaleString('pt-AO')} KZ
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text))]">
                      {seller.active_products}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(seller.banned, seller.is_creator, seller.balance_retention_percentage)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSellerToManage(seller);
                            setRetentionDialogOpen(true);
                          }}>
                            <Shield className="h-4 w-4 mr-2" />
                            Gerenciar Retenção
                          </DropdownMenuItem>
                          {seller.banned ? (
                            <DropdownMenuItem onClick={() => updateUserStatus(seller.user_id, false)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Desbloquear
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleBanUser(seller)}
                              className="text-red-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Banir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-between border-t border-[hsl(var(--admin-border))]">
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredSellers.length)} de {filteredSellers.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-[hsl(var(--admin-text))]">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
          retentionReleaseDate={sellerToManage.retention_release_date}
          adminEmail={admin?.email || ''}
          onSuccess={() => {
            loadSellersReport();
            setSellerToManage(null);
          }}
        />
      )}
    </AdminLayout>
  );
}