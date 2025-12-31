import { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatWithMaxTwoDecimals } from '@/utils/priceFormatting';
import { 
  Search, Download, ShoppingCart, CheckCircle, XCircle, 
  Loader2, MoreHorizontal, Hash, RefreshCcw, ChevronLeft, ChevronRight,
  SlidersHorizontal, Columns3, Eye, Send, Mail, Wallet, Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  amount: string;
  currency: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  products?: {
    name: string;
  } | null;
  seller?: {
    full_name: string;
  } | null;
}

interface OrderDetails extends Order {
  product_id: string;
  user_id: string;
  order_bump_data: any;
  updated_at: string;
  seller?: {
    full_name: string;
  } | null;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  admin_notes?: string | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface ActivityItem {
  id: string;
  type: 'sale' | 'withdrawal' | 'refund';
  description: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  user_name: string;
  user_email?: string;
}

type TabType = 'entradas' | 'repasses' | 'atividades';

// Helper function to convert currency code
const formatCurrency = (amount: number, currencyCode: string) => {
  const formatted = formatWithMaxTwoDecimals(amount);
  
  switch (currencyCode) {
    case 'EUR':
      return `€${formatted}`;
    case 'USD':
      return `$${formatted}`;
    case 'GBP':
      return `£${formatted}`;
    case 'BRL':
      return `R$${formatted}`;
    case 'MZN':
      return `${formatted} MT`;
    default:
      return `${formatted} ${currencyCode}`;
  }
};

export default function AdminSales() {
  const { admin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>('entradas');
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [resendingAccess, setResendingAccess] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    pendingSales: 0,
    completedSales: 0,
    refundedSales: 0,
    failedSales: 0,
    approvedWithdrawals: 0,
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Load stats once on mount
  useEffect(() => {
    if (admin) {
      loadStats();
    }
  }, [admin]);

  // Load data based on active tab
  useEffect(() => {
    if (admin) {
      if (activeTab === 'entradas') {
        loadOrders();
      } else if (activeTab === 'repasses') {
        loadWithdrawals();
      } else if (activeTab === 'atividades') {
        loadActivities();
      }
    }
  }, [admin, activeTab, currentPage, itemsPerPage, statusFilter, debouncedSearch]);

  const loadStats = async () => {
    try {
      // Buscar contagens por status em paralelo usando count
      const [completedRes, pendingRes, refundedRes, failedRes, totalRes, withdrawalsRes] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'refunded'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['failed', 'canceled', 'cancelled']),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      setStats({
        totalSales: totalRes.count || 0,
        completedSales: completedRes.count || 0,
        pendingSales: pendingRes.count || 0,
        refundedSales: refundedRes.count || 0,
        failedSales: failedRes.count || 0,
        totalRevenue: 0,
        approvedWithdrawals: withdrawalsRes.count || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Primeiro buscar os saques aprovados
      let query = supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact' })
        .eq('status', 'aprovado');

      const { data: withdrawalData, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      // Buscar profiles dos usuários
      const userIds = [...new Set((withdrawalData || []).map(w => w.user_id).filter(Boolean))];
      let profilesMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profilesMap = new Map(profiles?.map(p => [p.user_id, { full_name: p.full_name, email: p.email }]) || []);
      }

      // Combinar dados
      const withdrawalsWithProfiles = (withdrawalData || []).map(w => ({
        ...w,
        profiles: profilesMap.get(w.user_id) || null,
      }));
      
      setWithdrawals(withdrawalsWithProfiles as any);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao carregar saques:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os saques.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Carregar vendas e saques em paralelo
      const [ordersRes, withdrawalsRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            id,
            order_id,
            customer_name,
            amount,
            currency,
            status,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('withdrawal_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      // Buscar profiles dos usuários dos saques
      const userIds = [...new Set((withdrawalsRes.data || []).map(w => w.user_id).filter(Boolean))];
      let profilesMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profilesMap = new Map(profiles?.map(p => [p.user_id, { full_name: p.full_name, email: p.email }]) || []);
      }

      // Combinar e ordenar por data
      const allActivities: ActivityItem[] = [];

      // Adicionar vendas
      (ordersRes.data || []).forEach(order => {
        allActivities.push({
          id: order.id,
          type: order.status === 'refunded' ? 'refund' : 'sale',
          description: order.status === 'refunded' 
            ? `Reembolso - ${order.order_id}` 
            : `Venda - ${order.order_id}`,
          amount: parseFloat(order.amount),
          currency: order.currency || 'KZ',
          status: order.status,
          created_at: order.created_at,
          user_name: order.customer_name,
        });
      });

      // Adicionar saques
      (withdrawalsRes.data || []).forEach(withdrawal => {
        const profile = profilesMap.get(withdrawal.user_id);
        allActivities.push({
          id: withdrawal.id,
          type: 'withdrawal',
          description: `Saque - ${withdrawal.status === 'aprovado' ? 'Aprovado' : withdrawal.status === 'rejeitado' ? 'Rejeitado' : 'Pendente'}`,
          amount: withdrawal.amount,
          currency: 'KZ',
          status: withdrawal.status,
          created_at: withdrawal.created_at,
          user_name: profile?.full_name || 'N/A',
          user_email: profile?.email,
        });
      });

      // Ordenar por data decrescente
      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Aplicar paginação
      const paginatedActivities = allActivities.slice(from, to + 1);
      
      setActivities(paginatedActivities);
      setTotalCount(allActivities.length);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as atividades.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Build query
      let query = supabase
        .from('orders')
        .select(`
          *,
          products (
            name
          )
        `, { count: 'exact' });

      // Apply status filter
      if (statusFilter !== 'todos') {
        if (statusFilter === 'failed') {
          query = query.in('status', ['failed', 'canceled', 'cancelled']);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`customer_name.ilike.%${debouncedSearch}%,customer_email.ilike.%${debouncedSearch}%,order_id.ilike.%${debouncedSearch}%`);
      }

      // Order and paginate
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setTotalCount(count || 0);

      // Get seller profiles for this page only
      const userIds = [...new Set((data || []).map(order => order.user_id).filter(Boolean))];
      
      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      }
      
      const ordersWithSeller = (data || []).map(order => ({
        ...order,
        seller: order.user_id ? { full_name: profilesMap.get(order.user_id) || 'N/A' } : null
      }));
      
      setOrders(ordersWithSeller);
      console.log(`✅ Admin Sales: Carregadas ${ordersWithSeller.length} de ${count} vendas`);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as vendas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      // Buscar informação do vendedor se existir user_id
      if (data?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.user_id)
          .single();
        
        setSelectedOrder({
          ...data,
          seller: profile ? { full_name: profile.full_name } : null
        });
      } else {
        setSelectedOrder(data);
      }
      
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes da venda:', error);
    }
  };

  const markAsPaid = async (orderId: string) => {
    try {
      const { error } = await supabase.functions.invoke('update-order-status', {
        body: { orderId, status: 'completed' }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Pedido marcado como pago.',
      });

      loadOrders();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar o pedido como pago.',
        variant: 'destructive',
      });
    }
  };

  // Com paginação server-side, não precisamos mais filtrar no cliente
  // Os filtros são aplicados na query do banco

  // Total de páginas calculado a partir do count do servidor
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / itemsPerPage);
  }, [totalCount, itemsPerPage]);
  // Função para reenviar acesso ao cliente
  const resendCustomerAccess = async (order: OrderDetails) => {
    if (!order || order.status !== 'completed') {
      toast({
        title: 'Erro',
        description: 'Só é possível reenviar acesso para pedidos pagos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setResendingAccess(true);
      
      console.log('🔄 Reenviando acesso para:', order.customer_email);
      
      const { data, error } = await supabase.functions.invoke('resend-purchase-access', {
        body: { orderIds: [order.id] }
      });

      if (error) throw error;

      console.log('✅ Resultado do reenvio:', data);

      if (data?.results && data.results.length > 0) {
        const result = data.results[0];
        if (result.success) {
          // Verificar se já tinha acesso
          if (result.error === 'already_has_access') {
            toast({
              title: 'Cliente já tem acesso',
              description: `O cliente ${order.customer_email} já possui acesso ativo a este produto.`,
            });
          } else {
            toast({
              title: 'Acesso concedido com sucesso',
              description: `Acesso concedido e email enviado para ${order.customer_email}${result.account_created ? ' (nova conta criada)' : ''}`,
            });
          }
        } else {
          throw new Error(result.error || 'Falha ao reenviar acesso');
        }
      } else {
        toast({
          title: 'Acesso reenviado',
          description: `Email de acesso enviado para ${order.customer_email}`,
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao reenviar acesso:', error);
      toast({
        title: 'Erro ao reenviar acesso',
        description: error.message || 'Não foi possível reenviar o acesso.',
        variant: 'destructive',
      });
    } finally {
      setResendingAccess(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      completed: { 
        label: 'Sucesso', 
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
      },
      pending: { 
        label: 'Pendente', 
        className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100' 
      },
      failed: { 
        label: 'Falhou', 
        className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100' 
      },
      canceled: { 
        label: 'Cancelado', 
        className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100' 
      },
      cancelled: { 
        label: 'Cancelado', 
        className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100' 
      },
      refunded: { 
        label: 'Reembolsado', 
        className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100' 
      },
    };
    
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    
    return (
      <span className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
        statusInfo.className
      )}>
        {statusInfo.label}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['ID Pedido', 'Cliente', 'Email', 'Telefone', 'Produto', 'Vendedor', 'Valor', 'Moeda', 'Status', 'Método', 'Data'];
    const rows = orders.map(order => [
      order.order_id,
      order.customer_name,
      order.customer_email,
      order.customer_phone || 'N/A',
      order.products?.name || 'N/A',
      order.seller?.full_name || 'N/A',
      order.amount,
      order.currency,
      order.status,
      order.payment_method || 'N/A',
      format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_kambafy_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <AdminLayout title="Transações" description="Carregando dados...">
        <AdminPageSkeleton variant="table" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Transações" 
      description="Acompanhe e analise todas as transações realizadas."
    >
      <SEO 
        title="Kambafy Admin – Vendas" 
        description="Gestão de vendas da plataforma" 
        canonical="https://kambafy.com/admin/sales" 
        noIndex 
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button 
          onClick={() => { setActiveTab('entradas'); setCurrentPage(1); }}
          className={cn(
            "rounded-full px-5",
            activeTab === 'entradas' 
              ? "bg-[hsl(var(--admin-primary))] hover:bg-[hsl(var(--admin-primary))]/90 text-white"
              : "bg-transparent text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-bg))]"
          )}
          variant={activeTab === 'entradas' ? 'default' : 'ghost'}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Entradas
        </Button>
        <Button 
          onClick={() => { setActiveTab('repasses'); setCurrentPage(1); }}
          className={cn(
            "rounded-full px-5",
            activeTab === 'repasses' 
              ? "bg-[hsl(var(--admin-primary))] hover:bg-[hsl(var(--admin-primary))]/90 text-white"
              : "bg-transparent text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-bg))]"
          )}
          variant={activeTab === 'repasses' ? 'default' : 'ghost'}
        >
          <Wallet className="h-4 w-4 mr-2" />
          Repasses
          {stats.approvedWithdrawals > 0 && (
            <Badge className="ml-2 bg-emerald-500 text-white text-xs">{stats.approvedWithdrawals}</Badge>
          )}
        </Button>
        <Button 
          onClick={() => { setActiveTab('atividades'); setCurrentPage(1); }}
          className={cn(
            "rounded-full px-5",
            activeTab === 'atividades' 
              ? "bg-[hsl(var(--admin-primary))] hover:bg-[hsl(var(--admin-primary))]/90 text-white"
              : "bg-transparent text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-bg))]"
          )}
          variant={activeTab === 'atividades' ? 'default' : 'ghost'}
        >
          <Activity className="h-4 w-4 mr-2" />
          Todas as Atividades
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--admin-bg))] flex items-center justify-center">
            <Hash className="h-5 w-5 text-[hsl(var(--admin-text-secondary))]" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Total de transações</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.totalSales.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Com sucesso</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.completedSales.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Com falhas</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.failedSales.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <RefreshCcw className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Reembolsados</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.refundedSales.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))]">
        {/* Table Header */}
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[hsl(var(--admin-border))]">
          <h3 className="font-semibold text-[hsl(var(--admin-text))]">
            {activeTab === 'entradas' && 'Atividade de entradas'}
            {activeTab === 'repasses' && 'Saques aprovados'}
            {activeTab === 'atividades' && 'Todas as atividades'}
          </h3>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-52 pl-3 pr-10 h-9 bg-white border-[hsl(var(--admin-border))] rounded-lg"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
            </div>

            {/* Filters - apenas para entradas */}
            {activeTab === 'entradas' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 h-9 border-[hsl(var(--admin-border))]">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="completed">Sucesso</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Export */}
            {activeTab === 'entradas' && (
              <Button variant="outline" size="sm" onClick={exportToCSV} className="h-9 border-[hsl(var(--admin-border))]">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[hsl(var(--admin-border))] hover:bg-transparent">
                {activeTab === 'entradas' && (
                  <>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">ID da transação</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Produto</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Montante</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Data</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Método</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Estado</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </>
                )}
                {activeTab === 'repasses' && (
                  <>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">ID</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Vendedor</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Montante</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Data</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Estado</TableHead>
                  </>
                )}
                {activeTab === 'atividades' && (
                  <>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Tipo</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Descrição</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Usuário</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Montante</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Data</TableHead>
                    <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Estado</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Tab Entradas */}
              {activeTab === 'entradas' && (
                orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-[hsl(var(--admin-text-secondary))]">
                      {loading ? 'Carregando...' : 'Nenhuma transação encontrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-bg))]/50">
                      <TableCell className="font-mono text-sm text-[hsl(var(--admin-text))]">
                        {order.order_id?.slice(0, 12) || 'N/A'}
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-text))] max-w-[200px] truncate" title={order.products?.name || 'N/A'}>
                        {order.products?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium text-[hsl(var(--admin-text))]">
                        {formatCurrency(parseFloat(order.amount), order.currency || 'KZ')}
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <span className="text-[hsl(var(--admin-text))]">
                          {order.payment_method?.replace('_', ' ') || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => loadOrderDetails(order.id)}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}

              {/* Tab Repasses */}
              {activeTab === 'repasses' && (
                withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-[hsl(var(--admin-text-secondary))]">
                      {loading ? 'Carregando...' : 'Nenhum saque aprovado encontrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-bg))]/50">
                      <TableCell className="font-mono text-sm text-[hsl(var(--admin-text))]">
                        {withdrawal.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-text))]">
                        <div>
                          <p className="font-medium">{withdrawal.profiles?.full_name || 'N/A'}</p>
                          <p className="text-xs text-[hsl(var(--admin-text-secondary))]">{withdrawal.profiles?.email || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        {formatCurrency(withdrawal.amount, 'KZ')}
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                        {format(new Date(withdrawal.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-emerald-100 text-emerald-700 border-emerald-200">
                          Aprovado
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}

              {/* Tab Atividades */}
              {activeTab === 'atividades' && (
                activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-[hsl(var(--admin-text-secondary))]">
                      {loading ? 'Carregando...' : 'Nenhuma atividade encontrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={`${activity.type}-${activity.id}`} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-bg))]/50">
                      <TableCell>
                        <Badge className={cn(
                          "text-xs",
                          activity.type === 'sale' && "bg-blue-100 text-blue-700",
                          activity.type === 'withdrawal' && "bg-emerald-100 text-emerald-700",
                          activity.type === 'refund' && "bg-amber-100 text-amber-700"
                        )}>
                          {activity.type === 'sale' && 'Venda'}
                          {activity.type === 'withdrawal' && 'Saque'}
                          {activity.type === 'refund' && 'Reembolso'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-text))] max-w-[200px] truncate">
                        {activity.description}
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-text))]">
                        {activity.user_name}
                      </TableCell>
                      <TableCell className={cn(
                        "font-medium",
                        activity.type === 'refund' ? "text-amber-600" : activity.type === 'withdrawal' ? "text-emerald-600" : "text-[hsl(var(--admin-text))]"
                      )}>
                        {activity.type === 'refund' && '-'}
                        {formatCurrency(activity.amount, activity.currency)}
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                        {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(activity.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-[hsl(var(--admin-border))]">
          <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
            {totalCount > 0 
              ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalCount)} de ${totalCount.toLocaleString()}`
              : '0 resultados'
            }
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 border-[hsl(var(--admin-border))]" 
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[hsl(var(--admin-text-secondary))] min-w-[80px] text-center">
              Página {currentPage} de {totalPages || 1}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 border-[hsl(var(--admin-border))]"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-8 border-[hsl(var(--admin-border))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>
              Informações completas do pedido
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">ID do Pedido</p>
                  <p className="font-mono font-semibold">{selectedOrder.order_id}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Cliente</p>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Email</p>
                  <p className="text-sm">{selectedOrder.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Telefone</p>
                  <p className="text-sm">{selectedOrder.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Vendedor</p>
                  <p className="font-medium">{selectedOrder.seller?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Método de Pagamento</p>
                  <p className="text-sm capitalize">{selectedOrder.payment_method?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Valor</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(parseFloat(selectedOrder.amount), selectedOrder.currency || 'KZ')}
                  </p>
                </div>
              </div>

              {/* Botão para reenviar acesso - só mostra para pedidos pagos */}
              {selectedOrder.status === 'completed' && (
                <div className="pt-4 border-t border-[hsl(var(--admin-border))]">
                  <Button 
                    onClick={() => resendCustomerAccess(selectedOrder)}
                    disabled={resendingAccess}
                    className="w-full bg-[hsl(var(--admin-primary))] hover:bg-[hsl(var(--admin-primary))]/90 text-white"
                  >
                    {resendingAccess ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reenviando acesso...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Reenviar Acesso ao Cliente
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-2 text-center">
                    Isso enviará um email com acesso ao painel e concederá acesso ao produto
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
