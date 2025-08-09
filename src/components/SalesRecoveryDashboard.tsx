import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Mail, Users, DollarSign, Settings, Search, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AbandonedPurchase {
  id: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  currency: string;
  status: 'abandoned' | 'recovered' | 'expired';
  abandoned_at: string;
  recovery_attempts_count: number;
  product: {
    name: string;
  };
}

interface RecoveryAnalytics {
  total_abandoned: number;
  total_recovery_emails_sent: number;
  total_recovered: number;
  total_recovered_amount: number;
  recovery_rate: number;
}

interface SalesRecoveryDashboardProps {
  onConfigure: (productId: string) => void;
}

export function SalesRecoveryDashboard({ onConfigure }: SalesRecoveryDashboardProps) {
  const [abandonedPurchases, setAbandonedPurchases] = useState<AbandonedPurchase[]>([]);
  const [analytics, setAnalytics] = useState<RecoveryAnalytics>({
    total_abandoned: 0,
    total_recovery_emails_sent: 0,
    total_recovered: 0,
    total_recovered_amount: 0,
    recovery_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7");

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateFilter));

      // Load abandoned purchases for current user's products
      const { data: purchases, error: purchasesError } = await supabase
        .from('abandoned_purchases')
        .select(`
          *,
          products!inner(name, user_id)
        `)
        .eq('products.user_id', (await supabase.auth.getUser()).data.user?.id)
        .gte('abandoned_at', startDate.toISOString())
        .lte('abandoned_at', endDate.toISOString())
        .order('abandoned_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      const transformedPurchases = purchases?.map(purchase => ({
        ...purchase,
        product: { name: purchase.products.name },
        status: purchase.status as 'abandoned' | 'recovered' | 'expired'
      })) || [];

      setAbandonedPurchases(transformedPurchases);

      // Calculate analytics from the actual data
      const totalAbandoned = transformedPurchases.length;
      const totalRecovered = transformedPurchases.filter(p => p.status === 'recovered').length;
      const totalRecoveredAmount = transformedPurchases
        .filter(p => p.status === 'recovered')
        .reduce((sum, p) => sum + p.amount, 0);
      
      // Calculate recovery emails sent
      const totalEmailsSent = transformedPurchases.reduce((sum, p) => sum + p.recovery_attempts_count, 0);
      
      // Calculate recovery rate
      const recoveryRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0;

      // Load recovery fees to calculate net recovered amount (after 20% fee)
      const { data: recoveryFees, error: feesError } = await supabase
        .from('recovery_fees')
        .select('fee_amount')
        .eq('seller_user_id', (await supabase.auth.getUser()).data.user?.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalFees = recoveryFees?.reduce((sum, fee) => sum + fee.fee_amount, 0) || 0;
      const netRecoveredAmount = totalRecoveredAmount - totalFees;

      setAnalytics({
        total_abandoned: totalAbandoned,
        total_recovery_emails_sent: totalEmailsSent,
        total_recovered: totalRecovered,
        total_recovered_amount: netRecoveredAmount, // Net amount after fees
        recovery_rate: recoveryRate
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = abandonedPurchases.filter(purchase => {
    const matchesSearch = purchase.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.product.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || purchase.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'recovered':
        return <Badge variant="default" className="bg-green-500">Recuperado</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirado</Badge>;
      default:
        return <Badge variant="destructive">Abandonado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recuperação de Vendas</h1>
          <p className="text-muted-foreground">
            Monitore e gerencie suas vendas recuperadas automaticamente
          </p>
        </div>
        <Button onClick={() => onConfigure("")} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Configurar
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carrinhos Abandonados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_abandoned}</div>
            <p className="text-xs text-muted-foreground">
              Últimos {dateFilter} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Enviados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_recovery_emails_sent}</div>
            <p className="text-xs text-muted-foreground">
              Tentativas de recuperação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.recovery_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Vendas recuperadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Recuperado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">
               {analytics.total_recovered_amount.toLocaleString('pt-AO')} KZ
             </div>
             <p className="text-xs text-muted-foreground">
               Valor líquido (após taxa de 20%)
             </p>
           </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas Abandonadas</CardTitle>
          <CardDescription>
            Gerencie e acompanhe todas as tentativas de recuperação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, email ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="abandoned">Abandonado</SelectItem>
                <SelectItem value="recovered">Recuperado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma venda abandonada encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{purchase.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{purchase.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{purchase.product.name}</TableCell>
                    <TableCell>{purchase.amount.toFixed(0)} {purchase.currency}</TableCell>
                    <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                    <TableCell>{purchase.recovery_attempts_count}</TableCell>
                    <TableCell>
                      {format(new Date(purchase.abandoned_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}