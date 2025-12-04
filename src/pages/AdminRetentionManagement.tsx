import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, Search, Filter, TrendingDown, RefreshCw, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { SellerRetentionDialog } from '@/components/admin/SellerRetentionDialog';
import { SEO } from '@/components/SEO';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';

interface SellerWithRetention {
  user_id: string;
  full_name: string | null;
  email: string | null;
  balance_retention_percentage: number;
  retention_reason: string | null;
  retention_release_date: string | null;
  balance: number;
  total_sales: number;
  total_revenue: number;
}

export default function AdminRetentionManagement() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<SellerWithRetention[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [retentionFilter, setRetentionFilter] = useState('all');
  const [retentionDialogOpen, setRetentionDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerWithRetention | null>(null);
  const [recalculatingBalance, setRecalculatingBalance] = useState<string | null>(null);

  useEffect(() => {
    if (admin) {
      loadSellersWithRetention();
    }
  }, [admin]);

  const loadSellersWithRetention = async () => {
    setLoading(true);
    try {
      // Buscar perfis com retenção ativa
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, balance_retention_percentage, retention_reason, retention_release_date')
        .gt('balance_retention_percentage', 0)
        .order('balance_retention_percentage', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setSellers([]);
        setLoading(false);
        return;
      }

      const userIds = profiles.map((p) => p.user_id);

      // Buscar saldos usando RPC (bypassa RLS)
      const { data: balances, error: balancesError } = await supabase.rpc('admin_get_all_balances');

      if (balancesError) throw balancesError;

      // Buscar métricas de vendas
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, amount, status')
        .in('user_id', userIds)
        .eq('status', 'completed');

      if (ordersError) throw ordersError;

      // Combinar dados
      const sellersData = profiles.map((profile) => {
        const balance = balances?.find((b) => b.user_id === profile.user_id)?.balance || 0;
        const userOrders = orders?.filter((o) => o.user_id === profile.user_id) || [];
        const totalSales = userOrders.length;
        const totalRevenue = userOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0);

        return {
          ...profile,
          balance,
          total_sales: totalSales,
          total_revenue: totalRevenue,
        };
      });

      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateBalance = async (userId: string, userEmail: string) => {
    setRecalculatingBalance(userId);
    try {
      const { data, error } = await supabase.rpc('admin_recalculate_seller_balance', {
        target_user_id: userId,
        delete_old_credit_transactions: true,
      });

      if (error) throw error;

      const result = data as any;
      toast.success(`Saldo recalculado para ${userEmail}`, {
        description: `Saldo anterior: ${formatPriceForSeller(result?.old_balance || 0)} | Novo: ${formatPriceForSeller(result?.new_balance || 0)}`,
      });

      // Recarregar dados
      await loadSellersWithRetention();
    } catch (error: any) {
      console.error('Error recalculating balance:', error);
      toast.error('Erro ao recalcular saldo', {
        description: error.message || 'Erro desconhecido',
      });
    } finally {
      setRecalculatingBalance(null);
    }
  };

  const filteredSellers = sellers.filter((seller) => {
    const matchesSearch =
      seller.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      retentionFilter === 'all' ||
      (retentionFilter === 'low' && seller.balance_retention_percentage <= 30) ||
      (retentionFilter === 'medium' && seller.balance_retention_percentage > 30 && seller.balance_retention_percentage <= 60) ||
      (retentionFilter === 'high' && seller.balance_retention_percentage > 60);

    return matchesSearch && matchesFilter;
  });

  const totalRetained = filteredSellers.reduce(
    (sum, s) => sum + (s.balance * s.balance_retention_percentage) / 100,
    0
  );

  if (loading) {
    return (
      <AdminLayout title="Gestão de Retenção" description="Carregando dados...">
        <AdminPageSkeleton variant="cards" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Retenção" description={`${sellers.length} vendedores com retenção ativa`}>
      <SEO title="Gestão de Retenção - Admin Kambafy" description="Gerenciar retenções de saldo" noIndex />
      
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Vendedores com Retenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sellers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Total Retido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {formatPriceForSeller(totalRetained)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Retenção Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {sellers.length > 0
                  ? Math.round(
                      sellers.reduce((sum, s) => sum + s.balance_retention_percentage, 0) / sellers.length
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
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
                <Select value={retentionFilter} onValueChange={setRetentionFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="low">Baixa (≤30%)</SelectItem>
                    <SelectItem value="medium">Média (31-60%)</SelectItem>
                    <SelectItem value="high">Alta (&gt;60%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Vendedores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSellers.map((seller) => {
            const availableBalance = (seller.balance * (100 - seller.balance_retention_percentage)) / 100;
            const retainedAmount = seller.balance - availableBalance;

            return (
              <Card key={seller.user_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{seller.full_name || 'Sem nome'}</CardTitle>
                      <p className="text-xs text-muted-foreground">{seller.email}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        seller.balance_retention_percentage > 60
                          ? 'bg-red-500/10 text-red-600 border-red-500/20'
                          : seller.balance_retention_percentage > 30
                          ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                          : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                      }
                    >
                      {seller.balance_retention_percentage}%
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Saldos */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Saldo Total:</span>
                      <span className="font-medium">{formatPriceForSeller(seller.balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Retido:</span>
                      <span className="font-medium text-destructive">
                        {formatPriceForSeller(retainedAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Disponível:</span>
                      <span className="font-bold text-primary">
                        {formatPriceForSeller(availableBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Razão */}
                  {seller.retention_reason && (
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-xs text-muted-foreground mb-1">Razão:</p>
                      <p className="text-sm">{seller.retention_reason}</p>
                    </div>
                  )}

                  {/* Métricas */}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Vendas:</span>
                    <span className="font-medium">{seller.total_sales}</span>
                  </div>

                  {/* Ações */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setSelectedSeller(seller);
                        setRetentionDialogOpen(true);
                      }}
                      className="w-full"
                      variant="outline"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Modificar Retenção
                    </Button>
                    <Button
                      onClick={() => handleRecalculateBalance(seller.user_id, seller.email || '')}
                      disabled={recalculatingBalance === seller.user_id}
                      className="w-full"
                      variant="secondary"
                      size="sm"
                    >
                      {recalculatingBalance === seller.user_id ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                          Recalculando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Recalcular Saldo
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredSellers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum vendedor encontrado</p>
              <p className="text-muted-foreground">Nenhum vendedor com retenção ativa corresponde aos filtros</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Retenção */}
      {selectedSeller && (
        <SellerRetentionDialog
          open={retentionDialogOpen}
          onOpenChange={setRetentionDialogOpen}
          userId={selectedSeller.user_id}
          userEmail={selectedSeller.email || ''}
          currentBalance={selectedSeller.balance}
          currentRetention={selectedSeller.balance_retention_percentage}
          retentionReleaseDate={selectedSeller.retention_release_date}
          adminEmail={admin?.email || ''}
          onSuccess={() => {
            loadSellersWithRetention();
            setSelectedSeller(null);
          }}
        />
      )}
    </AdminLayout>
  );
}
