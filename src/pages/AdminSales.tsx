import { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, Download, ShoppingCart, CheckCircle, XCircle, 
  Loader2, MoreHorizontal, Hash, RefreshCcw, ChevronLeft, ChevronRight,
  SlidersHorizontal, Columns3, Eye
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

// Helper function to convert currency code
const formatCurrency = (amount: number, currencyCode: string) => {
  // Convert KZ to AOA (valid ISO 4217 code)
  const validCurrency = currencyCode === 'KZ' ? 'AOA' : currencyCode;
  
  try {
    return amount.toLocaleString('pt-AO', { 
      style: 'currency', 
      currency: validCurrency 
    });
  } catch (error) {
    // Fallback if currency code is still invalid
    return `${amount.toLocaleString('pt-AO')} ${currencyCode}`;
  }
};

export default function AdminSales() {
  const { admin } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (admin) {
      loadOrders();
    }
  }, [admin]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Buscar todas as vendas (SEM LIMITE)
      let allOrders: any[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            products (
              name
            )
          `)
          .order('created_at', { ascending: false })
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

      console.log(`✅ Admin Sales: Carregadas ${allOrders.length} vendas totais`);
      
      // Obter IDs únicos de usuários/vendedores
      const userIds = [...new Set(allOrders.map(order => order.user_id).filter(Boolean))];
      
      // Buscar profiles dos vendedores
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      // Criar um mapa de user_id para full_name
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      // Adicionar informação do vendedor a cada pedido
      const ordersWithSeller = allOrders.map(order => ({
        ...order,
        seller: order.user_id ? { full_name: profilesMap.get(order.user_id) || 'N/A' } : null
      }));
      
      setOrders(ordersWithSeller);
      
      console.log(`📊 Estatísticas:`, {
        total: ordersWithSeller.length,
        completed: ordersWithSeller.filter(o => o.status === 'completed').length,
        pending: ordersWithSeller.filter(o => o.status === 'pending').length,
      });
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

  // Filtrar e buscar vendas
  const filteredOrders = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    
    return orders.filter((order) => {
      // Verificar se o termo de busca está vazio
      if (!search) {
        const matchesStatus = statusFilter === 'todos' || order.status === statusFilter;
        return matchesStatus;
      }
      
      // Buscar por nome, email ou ID do pedido (com null checks)
      const customerName = (order.customer_name || '').toLowerCase();
      const customerEmail = (order.customer_email || '').toLowerCase();
      const orderId = (order.order_id || '').toLowerCase();
      const customerPhone = (order.customer_phone || '').toLowerCase();
      const productName = (order.products?.name || '').toLowerCase();
      const sellerName = (order.seller?.full_name || '').toLowerCase();
      
      const matchesSearch = 
        customerName.includes(search) ||
        customerEmail.includes(search) ||
        orderId.includes(search) ||
        customerPhone.includes(search) ||
        productName.includes(search) ||
        sellerName.includes(search);
      
      const matchesStatus = statusFilter === 'todos' || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalSales = orders.length;
    const totalRevenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, order) => sum + parseFloat(order.amount || '0'), 0);
    const pendingSales = orders.filter(o => o.status === 'pending').length;
    const completedSales = orders.filter(o => o.status === 'completed').length;
    
    return {
      totalSales,
      totalRevenue,
      pendingSales,
      completedSales,
    };
  }, [orders]);

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
    const rows = filteredOrders.map(order => [
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
          className="bg-[hsl(var(--admin-primary))] hover:bg-[hsl(var(--admin-primary))]/90 text-white rounded-full px-5"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Entradas
        </Button>
        <Button variant="ghost" className="text-[hsl(var(--admin-text-secondary))] rounded-full px-5">
          Repasses
        </Button>
        <Button variant="ghost" className="text-[hsl(var(--admin-text-secondary))] rounded-full px-5">
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
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.pendingSales.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--admin-bg))] flex items-center justify-center">
            <RefreshCcw className="h-5 w-5 text-[hsl(var(--admin-text-secondary))]" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Reembolsados</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">0</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))]">
        {/* Table Header */}
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[hsl(var(--admin-border))]">
          <h3 className="font-semibold text-[hsl(var(--admin-text))]">Atividade de entradas</h3>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Pesquisar transação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-52 pl-3 pr-10 h-9 bg-white border-[hsl(var(--admin-border))] rounded-lg"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
            </div>

            {/* Columns */}
            <Button variant="outline" size="sm" className="h-9 gap-2 border-[hsl(var(--admin-border))]">
              <Columns3 className="h-4 w-4" />
              Colunas
              <Badge className="bg-[hsl(var(--admin-primary))] text-white text-xs px-1.5">7</Badge>
            </Button>

            {/* Filters */}
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

            {/* Export */}
            <Button variant="outline" size="sm" onClick={exportToCSV} className="h-9 border-[hsl(var(--admin-border))]">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[hsl(var(--admin-border))] hover:bg-transparent">
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">ID da transação</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Montante ↑</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Liquidação</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Data ↓</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Método de pagamento</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[hsl(var(--admin-text-secondary))]">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.slice(0, 10).map((order) => (
                  <TableRow key={order.id} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-bg))]/50">
                    <TableCell className="font-mono text-sm text-[hsl(var(--admin-text))]">
                      {order.order_id?.slice(0, 12) || 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium text-[hsl(var(--admin-text))]">
                      {formatCurrency(parseFloat(order.amount), order.currency || 'KZ')}
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text-secondary))]">N/A</TableCell>
                    <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                      {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-[hsl(var(--admin-text))]">
                          {order.payment_method?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
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
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-[hsl(var(--admin-border))]">
          <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
            1-{Math.min(10, filteredOrders.length)} of {filteredOrders.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 border-[hsl(var(--admin-border))]" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 border-[hsl(var(--admin-border))]">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select defaultValue="10">
              <SelectTrigger className="w-16 h-8 border-[hsl(var(--admin-border))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
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
            <div className="space-y-4">
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
