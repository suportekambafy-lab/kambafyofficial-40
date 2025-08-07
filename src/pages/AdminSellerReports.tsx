import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SellerReport {
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    created_at: string;
  };
  totalSales: number;
  totalRevenue: number;
  totalWithdrawals: number;
  activeProducts: number;
  bannedProducts: number;
}

export default function AdminSellerReports() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<SellerReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (admin) {
      loadSellersReport();
    }
  }, [admin]);

  const loadSellersReport = async () => {
    try {
      setLoading(true);

      // Buscar todos os usuários que têm produtos (vendedores)
      const { data: sellerIds } = await supabase
        .from('products')
        .select('user_id')
        .not('user_id', 'is', null);

      const uniqueSellerIds = [...new Set(sellerIds?.map(p => p.user_id) || [])];

      if (uniqueSellerIds.length === 0) {
        setSellers([]);
        setLoading(false);
        return;
      }

      // Buscar perfis dos vendedores
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at')
        .in('user_id', uniqueSellerIds);

      if (profileError) {
        console.error('Erro ao carregar perfis:', profileError);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados dos vendedores',
          variant: 'destructive'
        });
        return;
      }

      const sellersData: SellerReport[] = [];

      for (const profile of profiles || []) {
        try {
          // Buscar vendas do vendedor
          const { data: orders } = await supabase
            .from('orders')
            .select('amount')
            .eq('user_id', profile.user_id)
            .eq('status', 'completed');

          // Buscar produtos do vendedor
          const { data: products } = await supabase
            .from('products')
            .select('status, admin_approved')
            .eq('user_id', profile.user_id);

          // Buscar saques do vendedor
          const { data: withdrawals } = await supabase
            .from('withdrawal_requests')
            .select('amount, status')
            .eq('user_id', profile.user_id);

          const totalSales = orders?.length || 0;
          const totalRevenue = orders?.reduce((sum, order) => 
            sum + parseFloat(order.amount), 0) || 0;
          
          const activeProducts = products?.filter(p => 
            p.status === 'Ativo' && p.admin_approved).length || 0;
          const bannedProducts = products?.filter(p => 
            p.status === 'Banido').length || 0;
          
          const totalWithdrawals = withdrawals?.filter(w => 
            w.status === 'aprovado').reduce((sum, w) => 
            sum + parseFloat(w.amount.toString()), 0) || 0;

          sellersData.push({
            user_id: profile.user_id,
            profile,
            totalSales,
            totalRevenue,
            totalWithdrawals,
            activeProducts,
            bannedProducts
          });
        } catch (error) {
          console.error(`Erro ao carregar dados do vendedor ${profile.user_id}:`, error);
        }
      }

      // Ordenar por receita total (maior para menor)
      sellersData.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setSellers(sellersData);

    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
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
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios de Vendedores</h1>
            <p className="text-muted-foreground mt-1">Visão geral do desempenho dos vendedores</p>
          </div>
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
                  <p className="text-sm font-medium text-muted-foreground">Total Vendedores</p>
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
                    {sellers.reduce((sum, s) => sum + s.totalSales, 0)}
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
                    {sellers.reduce((sum, s) => sum + s.totalRevenue, 0).toLocaleString('pt-AO')} KZ
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Produtos Ativos</p>
                  <p className="text-2xl font-bold">
                    {sellers.reduce((sum, s) => sum + s.activeProducts, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Vendedores */}
        <div className="space-y-6">
          {sellers.map((seller, index) => (
            <Card key={seller.user_id} className="shadow-lg border bg-white hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">#{index + 1}</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl text-slate-900">
                        {seller.profile.full_name || 'Nome não informado'}
                      </CardTitle>
                      <p className="text-sm text-slate-600">{seller.profile.email}</p>
                      <p className="text-xs text-slate-500">
                        Membro desde: {new Date(seller.profile.created_at).toLocaleDateString('pt-AO')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {seller.bannedProducts > 0 && (
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        {seller.bannedProducts} Banido(s)
                      </Badge>
                    )}
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {seller.activeProducts} Ativo(s)
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{seller.totalSales}</p>
                    <p className="text-sm text-blue-800">Vendas Realizadas</p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {seller.totalRevenue.toLocaleString('pt-AO')} KZ
                    </p>
                    <p className="text-sm text-green-800">Receita Total</p>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {seller.totalWithdrawals.toLocaleString('pt-AO')} KZ
                    </p>
                    <p className="text-sm text-yellow-800">Total Sacado</p>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {((seller.totalWithdrawals / seller.totalRevenue) * 100 || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-purple-800">Taxa de Saque</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {sellers.length === 0 && (
            <Card className="shadow-lg border bg-white">
              <CardContent className="text-center py-16">
                <div className="h-16 w-16 bg-slate-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl text-slate-400">👥</span>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum vendedor encontrado</h3>
                <p className="text-slate-600">Não há vendedores cadastrados no sistema.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}