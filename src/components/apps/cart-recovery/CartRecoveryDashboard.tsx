import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CartRecoveryDashboardProps {
  productId: string;
}

interface AbandonedPurchase {
  id: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  abandoned_at: string;
  recovery_attempts_count: number;
  recovered_at: string | null;
}

interface Stats {
  total_abandoned: number;
  total_recovered: number;
  total_pending: number;
  recovered_value: number;
  recovery_rate: number;
}

export function CartRecoveryDashboard({ productId }: CartRecoveryDashboardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [abandonedPurchases, setAbandonedPurchases] = useState<AbandonedPurchase[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_abandoned: 0,
    total_recovered: 0,
    total_pending: 0,
    recovered_value: 0,
    recovery_rate: 0
  });

  useEffect(() => {
    loadData();
  }, [productId, user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load abandoned purchases for this product
      const { data: purchases, error } = await supabase
        .from('abandoned_purchases')
        .select('*')
        .eq('product_id', productId)
        .order('abandoned_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const purchaseData = purchases || [];
      setAbandonedPurchases(purchaseData);

      // Calculate stats
      const totalAbandoned = purchaseData.length;
      const recovered = purchaseData.filter(p => p.status === 'recovered');
      const totalRecovered = recovered.length;
      const totalPending = purchaseData.filter(p => p.status === 'abandoned').length;
      const recoveredValue = recovered.reduce((sum, p) => sum + (p.amount || 0), 0);
      const recoveryRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0;

      setStats({
        total_abandoned: totalAbandoned,
        total_recovered: totalRecovered,
        total_pending: totalPending,
        recovered_value: recoveredValue,
        recovery_rate: recoveryRate
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recovered':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Recuperado</Badge>;
      case 'abandoned':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-muted-foreground">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('pt-AO')} ${currency}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandonos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_abandoned}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_pending} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recuperados</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.total_recovered}</div>
            <p className="text-xs text-muted-foreground">
              vendas recuperadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recovery_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              de carrinhos abandonados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Recuperado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.recovered_value, 'Kz')}</div>
            <p className="text-xs text-muted-foreground">
              em vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abandoned Purchases List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Carrinhos Abandonados</CardTitle>
              <CardDescription>
                Lista dos últimos carrinhos abandonados
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {abandonedPurchases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum carrinho abandonado encontrado</p>
              <p className="text-sm">Os abandonos aparecerão aqui quando clientes deixarem o checkout</p>
            </div>
          ) : (
            <div className="space-y-4">
              {abandonedPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{purchase.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{purchase.customer_email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(purchase.amount, purchase.currency)}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(purchase.abandoned_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {purchase.recovery_attempts_count > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {purchase.recovery_attempts_count}
                        </div>
                      )}
                      {getStatusBadge(purchase.status)}
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
