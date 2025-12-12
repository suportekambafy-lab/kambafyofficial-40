import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, DollarSign, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';

interface UserReport {
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    created_at: string;
    banned: boolean;
    is_creator: boolean;
    avatar_url?: string;
  };
  totalSales: number;
  totalRevenue: number;
  totalWithdrawals: number;
  currentBalance: number;
  activeProducts: number;
  bannedProducts: number;
}

export default function AdminSellers() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (admin) {
      loadAllUsers();
    }
  }, [admin]);

  const loadAllUsers = async () => {
    try {
      setLoading(true);

      // Buscar TODOS os perfis de usuários
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at, banned, is_creator, avatar_url')
        .order('created_at', { ascending: false });

      if (profileError) {
        console.error('Erro ao carregar perfis:', profileError);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados dos usuários',
          variant: 'destructive'
        });
        return;
      }

      // Buscar todos os produtos de uma vez
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, user_id, status, admin_approved');

      // Buscar todas as vendas de uma vez (orders pelos product_id dos produtos)
      const productIds = allProducts?.map(p => p.id) || [];
      const { data: allOrders } = await supabase
        .from('orders')
        .select('product_id, amount, status')
        .in('product_id', productIds)
        .eq('status', 'completed');

      // Buscar todos os saques de uma vez usando RPC (bypassa RLS)
      const { data: allWithdrawals } = await supabase
        .rpc('admin_get_all_withdrawals');

      // Buscar todos os saldos diretamente da tabela customer_balances
      const { data: allBalances, error: balancesError } = await supabase
        .from('customer_balances')
        .select('user_id, balance');
      
      if (balancesError) {
        console.error('Erro ao buscar saldos:', balancesError);
      }

      // Criar mapas para acesso rápido
      const productsByUser = new Map<string, typeof allProducts>();
      allProducts?.forEach(product => {
        const userId = String(product.user_id);
        if (!productsByUser.has(userId)) {
          productsByUser.set(userId, []);
        }
        productsByUser.get(userId)!.push(product);
      });

      const ordersByProduct = new Map<string, typeof allOrders>();
      allOrders?.forEach(order => {
        const productId = order.product_id;
        if (!ordersByProduct.has(productId)) {
          ordersByProduct.set(productId, []);
        }
        ordersByProduct.get(productId)!.push(order);
      });

      // Processar saques (RPC retorna user_id e amount para saques aprovados)
      const withdrawalsByUser = new Map<string, number>();
      allWithdrawals?.forEach(w => {
        const userId = String(w.user_id);
        const current = withdrawalsByUser.get(userId) || 0;
        withdrawalsByUser.set(userId, current + Number(w.amount || 0));
      });

      // Processar saldos - converter user_id para string para garantir match
      const balanceByUser = new Map<string, number>();
      allBalances?.forEach(b => {
        if (b.user_id) {
          const userId = String(b.user_id);
          const balance = Number(b.balance) || 0;
          balanceByUser.set(userId, balance);
        }
      });

      const usersData: UserReport[] = [];

      for (const profile of profiles || []) {
        const realUserId = String(profile.user_id);
        const userProducts = productsByUser.get(realUserId) || [];
        
        // Calcular vendas e receita baseado nos PRODUTOS do vendedor
        let totalSales = 0;
        let totalRevenue = 0;
        
        userProducts.forEach(product => {
          const productOrders = ordersByProduct.get(product.id) || [];
          totalSales += productOrders.length;
          totalRevenue += productOrders.reduce((sum, order) => 
            sum + parseFloat(order.amount || '0'), 0);
        });

        const activeProducts = userProducts.filter(p => 
          p.status === 'Ativo' && p.admin_approved).length;
        const bannedProducts = userProducts.filter(p => 
          p.status === 'Banido').length;
        
        const totalWithdrawals = withdrawalsByUser.get(realUserId) || 0;
        const currentBalance = balanceByUser.get(realUserId) || 0;

        usersData.push({
          user_id: profile.user_id,
          profile: {
            full_name: profile.full_name,
            email: profile.email,
            created_at: profile.created_at,
            banned: profile.banned || false,
            is_creator: profile.is_creator || false,
            avatar_url: profile.avatar_url
          },
          totalSales,
          totalRevenue,
          totalWithdrawals,
          currentBalance,
          activeProducts,
          bannedProducts
        });
      }

      // Ordenar por receita total (maior para menor)
      usersData.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setUsers(usersData);

    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar dados',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Todos os Usuários" description="Carregando dados...">
        <AdminPageSkeleton variant="cards" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Todos os Usuários" description={`${users.length} ${users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}`}>

        {/* Resumo Geral - Responsivo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Usuários</p>
                  <p className="text-xl sm:text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Vendas</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {users.reduce((sum, s) => sum + s.totalSales, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Receita Total</p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {users.reduce((sum, s) => sum + s.totalRevenue, 0).toLocaleString('pt-AO')} KZ
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Produtos Ativos</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {users.reduce((sum, s) => sum + s.activeProducts, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Usuários - Responsivo */}
        <div className="space-y-4 sm:space-y-6">
          {users.map((user, index) => (
            <Card key={user.user_id} className="shadow-lg border bg-white hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-base sm:text-lg">#{index + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-xl text-slate-900 truncate">
                        {user.profile.full_name || 'Nome não informado'}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-slate-600 truncate">{user.profile.email}</p>
                      <p className="text-xs text-slate-500">
                        Membro desde: {new Date(user.profile.created_at).toLocaleDateString('pt-AO')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {user.profile.banned && (
                      <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                        Banido
                      </Badge>
                    )}
                    {user.profile.is_creator && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                        Criador
                      </Badge>
                    )}
                    {user.bannedProducts > 0 && (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                        {user.bannedProducts} Produto(s) Banido(s)
                      </Badge>
                    )}
                    {user.activeProducts > 0 && (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                        {user.activeProducts} Produto(s) Ativo(s)
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{user.totalSales}</p>
                    <p className="text-xs sm:text-sm text-blue-800">Vendas</p>
                  </div>
                  
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                    <p className="text-base sm:text-xl font-bold text-green-600">
                      {user.totalRevenue.toLocaleString('pt-AO')} KZ
                    </p>
                    <p className="text-xs sm:text-sm text-green-800">Receita</p>
                  </div>
                  
                  <div className="text-center p-3 sm:p-4 bg-emerald-50 rounded-lg">
                    <p className="text-base sm:text-xl font-bold text-emerald-600">
                      {user.currentBalance.toLocaleString('pt-AO')} KZ
                    </p>
                    <p className="text-xs sm:text-sm text-emerald-800">Saldo</p>
                  </div>
                  
                  <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                    <p className="text-base sm:text-xl font-bold text-yellow-600">
                      {user.totalWithdrawals.toLocaleString('pt-AO')} KZ
                    </p>
                    <p className="text-xs sm:text-sm text-yellow-800">Sacado</p>
                  </div>
                  
                  <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                      {user.activeProducts}
                    </p>
                    <p className="text-xs sm:text-sm text-purple-800">Produtos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {users.length === 0 && (
            <Card className="shadow-lg border bg-white">
              <CardContent className="text-center py-12 sm:py-16">
                <Users className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">Nenhum usuário encontrado</h3>
                <p className="text-sm sm:text-base text-slate-600">Não há usuários cadastrados no sistema.</p>
              </CardContent>
            </Card>
        )}
      </div>
    </AdminLayout>
  );
}