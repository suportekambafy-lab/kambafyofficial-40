import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, TrendingUp, Users, DollarSign, Package, Search, UserX, UserCheck, Wallet, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BanUserDialog } from '@/components/BanUserDialog';

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
}

export default function AdminSellerReports() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<SellerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<SellerReport | null>(null);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<SellerReport | null>(null);

  useEffect(() => {
    if (admin) {
      loadSellersReport();
    }
  }, [admin]);

  const loadSellersReport = async () => {
    setLoading(true);
    try {
      console.log('Carregando relatório de usuários...');
      
      // Buscar TODOS os perfis (incluindo banned e is_creator)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, banned, is_creator')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Erro ao buscar perfis:', profilesError);
        return;
      }

      console.log('Perfis carregados:', profiles?.length);

      // Para cada perfil, buscar estatísticas
      const sellersData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Buscar produtos do vendedor
          const { data: products } = await supabase
            .from('products')
            .select('id, status')
            .eq('user_id', profile.user_id);

          const productIds = products?.map(p => p.id) || [];

          // Buscar vendas completadas dos produtos do vendedor
          let orders: any[] = [];
          if (productIds.length > 0) {
            const { data: ordersData } = await supabase
              .from('orders')
              .select('amount, currency')
              .in('product_id', productIds)
              .eq('status', 'completed')
              .neq('payment_method', 'member_access');
            
            orders = ordersData || [];
          }

          // Buscar saques
          const { data: withdrawals } = await supabase
            .from('withdrawal_requests')
            .select('amount')
            .eq('user_id', profile.user_id)
            .eq('status', 'aprovado');

          // Buscar saldo disponível real da tabela customer_balances
          const { data: balanceData } = await supabase
            .from('customer_balances')
            .select('balance')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          const activeProducts = products?.filter(p => p.status === 'Ativo').length || 0;
          const bannedProducts = products?.filter(p => p.status === 'Banido').length || 0;

          const totalSales = orders?.length || 0;
          const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.amount), 0) || 0;
          const totalWithdrawals = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;
          
          // Taxa: 5% sobre a receita
          const totalFees = totalRevenue * 0.05;
          const availableBalance = balanceData?.balance || 0;

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
        })
      );

      // Ordenar por receita total (decrescente)
      const sortedSellers = sellersData.sort((a, b) => b.total_revenue - a.total_revenue);
      
      console.log('Relatório de usuários carregado:', sortedSellers.length);
      setSellers(sortedSellers);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
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

      // Enviar email de notificação
      try {
        await supabase.functions.invoke('send-user-ban-notification', {
          body: {
            userEmail: userToBan.email,
            userName: userToBan.full_name || 'Usuário',
            banReason: banReason
          }
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de banimento:', emailError);
      }

      toast({
        title: 'Usuário Banido',
        description: 'Usuário foi banido com sucesso.',
        variant: 'destructive'
      });

      loadSellersReport();
      setBanDialogOpen(false);
      setUserToBan(null);
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao banir usuário',
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
        description: `Usuário ${banned ? 'banido' : 'desbloqueado'} com sucesso`,
        variant: banned ? 'destructive' : 'default'
      });

      loadSellersReport();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar usuário',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (banned: boolean | null, isCreator: boolean | null) => {
    if (banned) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Banido</Badge>;
    }
    if (isCreator) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Criador</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
  };

  const totalActiveProducts = sellers.reduce((sum, s) => sum + s.active_products, 0);

  // Filtrar usuários baseado na busca
  const filteredSellers = sellers.filter(seller => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = seller.full_name?.toLowerCase().includes(searchLower);
    const emailMatch = seller.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Relatórios de Usuários</h1>
            <p className="text-muted-foreground mt-1">
              {filteredSellers.length} {filteredSellers.length === 1 ? 'usuário' : 'usuários'} na plataforma
            </p>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Usuários</p>
                  <p className="text-2xl font-bold">{sellers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Vendas</p>
                  <p className="text-2xl font-bold">
                    {sellers.reduce((sum, s) => sum + s.total_sales, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-600 rounded-full flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold">
                    {sellers.reduce((sum, s) => sum + s.total_revenue, 0).toLocaleString('pt-AO')} KZ
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Produtos Ativos</p>
                  <p className="text-2xl font-bold">
                    {totalActiveProducts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Usuários */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSellers.map((seller) => (
            <Card 
              key={seller.user_id} 
              className="shadow-lg border bg-white hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedSeller(seller);
                setBalanceDialogOpen(true);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                      {seller.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{seller.full_name || 'Sem nome'}</CardTitle>
                      <p className="text-sm text-muted-foreground">{seller.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(seller.banned, seller.is_creator)}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Vendas</span>
                    <Badge variant="secondary">{seller.total_sales}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Receita</span>
                    <span className="font-semibold">{seller.total_revenue.toLocaleString('pt-AO')} KZ</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Saques Feitos</span>
                    <span className="font-semibold">{seller.total_withdrawals.toLocaleString('pt-AO')} KZ</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Taxa de Saque</span>
                    <span className="font-semibold">{seller.total_fees.toLocaleString('pt-AO')} KZ</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Saldo Disponível</span>
                    <span className="font-semibold text-green-600">{seller.available_balance.toLocaleString('pt-AO')} KZ</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Produtos Ativos</span>
                    <Badge>{seller.active_products}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-sm text-muted-foreground">Produtos Banidos</span>
                    <Badge variant="destructive">{seller.banned_products}</Badge>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 mt-4">
                  {seller.banned ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateUserStatus(seller.user_id, false);
                      }}
                      disabled={processingId === seller.user_id}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      size="sm"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {processingId === seller.user_id ? 'Desbloqueando...' : 'Desbloquear'}
                    </Button>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBanUser(seller);
                      }}
                      disabled={processingId === seller.user_id}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                      size="sm"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      {processingId === seller.user_id ? 'Banindo...' : 'Banir'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredSellers.length === 0 && (
            <Card className="col-span-3 shadow-lg border bg-white">
              <CardContent className="text-center py-16">
                <div className="h-16 w-16 bg-slate-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl text-slate-400">👥</span>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                </h3>
                <p className="text-slate-600">
                  {searchTerm 
                    ? 'Tente buscar com outros termos.' 
                    : 'Não há usuários cadastrados no sistema.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog de Saldo Disponível */}
        <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes Financeiros</DialogTitle>
              <DialogDescription>
                {selectedSeller?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Saldo Disponível</p>
                    <p className="text-xs text-green-600">Para saque</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {selectedSeller?.available_balance.toLocaleString('pt-AO')} KZ
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Receita Total</p>
                    <p className="text-xs text-blue-600">Vendas realizadas</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {selectedSeller?.total_revenue.toLocaleString('pt-AO')} KZ
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-yellow-600 rounded-full flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Saques Feitos</p>
                    <p className="text-xs text-yellow-600">Taxa: {selectedSeller?.total_fees.toLocaleString('pt-AO')} KZ</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-yellow-600">
                  {selectedSeller?.total_withdrawals.toLocaleString('pt-AO')} KZ
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Banimento */}
        <BanUserDialog
          isOpen={banDialogOpen}
          onClose={() => {
            setBanDialogOpen(false);
            setUserToBan(null);
          }}
          onConfirm={handleConfirmBan}
          userName={userToBan?.full_name || 'Usuário'}
          isLoading={processingId === userToBan?.user_id}
        />
      </div>
    </div>
  );
}
