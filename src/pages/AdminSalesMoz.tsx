import { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatWithMaxTwoDecimals } from '@/utils/priceFormatting';
import { 
  Search, Download, ShoppingCart, CheckCircle, XCircle, 
  Loader2, ChevronLeft, ChevronRight, Eye, Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AdminLayoutMoz } from '@/components/admin/AdminLayoutMoz';
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
import { Skeleton } from '@/components/ui/skeleton';

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
  customer_country: string | null;
  products?: {
    name: string;
  } | null;
}

// Check if order is from Mozambique (MZN currency or MZ payment methods only)
const isMozOrder = (order: any) => {
  const currency = (order.currency || '').toUpperCase();
  const originalCurrency = (order.original_currency || '').toUpperCase();
  const paymentMethod = (order.payment_method || '').toLowerCase();
  
  return (
    paymentMethod === 'emola' ||
    paymentMethod === 'mpesa' ||
    paymentMethod === 'card_mz' ||
    currency === 'MZN' ||
    originalCurrency === 'MZN'
  );
};

// Format amount in Meticais
const formatMT = (amount: number) => `${formatWithMaxTwoDecimals(amount)} MT`;

// Payment method labels
const getPaymentMethodLabel = (method: string | null) => {
  switch (method) {
    case 'emola': return 'E-Mola';
    case 'mpesa': return 'M-Pesa';
    case 'card_mz': return 'Cartão';
    default: return method || 'N/A';
  }
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    completed: { label: 'Pago', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    failed: { label: 'Falhou', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    cancelled: { label: 'Cancelado', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    expired: { label: 'Expirado', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  }[status] || { label: status, className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };

  return (
    <Badge variant="outline" className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  );
};

export default function AdminSalesMoz() {
  const { admin } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
  });

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

  // Load data
  useEffect(() => {
    if (admin) {
      loadOrders();
    }
  }, [admin, currentPage, statusFilter, debouncedSearch]);

  const loadOrders = async () => {
    try {
      setLoading(true);

      // Fetch MOZ orders directly from database with proper filters
      // Using OR filter for MZ payment methods and MZN currency
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            name
          )
        `)
        .neq('payment_method', 'member_access')
        .or('payment_method.in.(emola,mpesa,card_mz),currency.eq.MZN,original_currency.eq.MZN')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let mozOrders = allOrders || [];

      // Calculate stats from all MOZ orders
      setStats({
        total: mozOrders.length,
        completed: mozOrders.filter(o => o.status === 'completed').length,
        pending: mozOrders.filter(o => o.status === 'pending').length,
        failed: mozOrders.filter(o => ['failed', 'cancelled', 'expired'].includes(o.status)).length,
      });

      // Apply status filter
      if (statusFilter !== 'todos') {
        if (statusFilter === 'failed') {
          mozOrders = mozOrders.filter(o => ['failed', 'cancelled', 'expired'].includes(o.status));
        } else {
          mozOrders = mozOrders.filter(o => o.status === statusFilter);
        }
      }

      // Apply search filter
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        mozOrders = mozOrders.filter(o => 
          o.customer_name?.toLowerCase().includes(search) ||
          o.customer_email?.toLowerCase().includes(search) ||
          o.order_id?.toLowerCase().includes(search)
        );
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      const paginatedOrders = mozOrders.slice(from, to);

      setOrders(paginatedOrders);
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

  const totalPages = Math.ceil(stats.total / itemsPerPage);

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayoutMoz 
      title="Transações" 
      description="Vendas e pagamentos de Moçambique"
    >
      <SEO 
        title="Kambafy Moçambique – Transações" 
        description="Gestão de transações Moçambique" 
        noIndex 
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.total}</p>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.completed}</p>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Concluídos</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.pending}</p>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{stats.failed}</p>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))]">Falhados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
            <Input
              placeholder="Pesquisar por nome, email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="completed">Pagos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="failed">Falhados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-[hsl(var(--admin-text-secondary))] mb-4" />
            <h3 className="text-lg font-medium text-[hsl(var(--admin-text))]">Sem transações</h3>
            <p className="text-[hsl(var(--admin-text-secondary))]">
              Nenhuma transação encontrada para os filtros selecionados.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-[hsl(var(--admin-border))]">
                  <TableHead className="text-[hsl(var(--admin-text-secondary))]">ID</TableHead>
                  <TableHead className="text-[hsl(var(--admin-text-secondary))]">Cliente</TableHead>
                  <TableHead className="text-[hsl(var(--admin-text-secondary))]">Produto</TableHead>
                  <TableHead className="text-[hsl(var(--admin-text-secondary))]">Método</TableHead>
                  <TableHead className="text-[hsl(var(--admin-text-secondary))]">Valor</TableHead>
                  <TableHead className="text-[hsl(var(--admin-text-secondary))]">Estado</TableHead>
                  <TableHead className="text-[hsl(var(--admin-text-secondary))]">Data</TableHead>
                  <TableHead className="text-right text-[hsl(var(--admin-text-secondary))]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="border-[hsl(var(--admin-border))]">
                    <TableCell className="font-mono text-xs text-[hsl(var(--admin-text-secondary))]">
                      {order.order_id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[hsl(var(--admin-text))]">{order.customer_name}</p>
                        <p className="text-xs text-[hsl(var(--admin-text-secondary))]">{order.customer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text))]">
                      {order.products?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        {getPaymentMethodLabel(order.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-[hsl(var(--admin-text))]">
                      {formatMT(parseFloat(order.amount))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                      {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--admin-border))]">
                <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
                  Página {currentPage} de {totalPages}
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
          </>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">🇲🇿</span>
              Detalhes da Transação
            </DialogTitle>
            <DialogDescription>
              ID: {selectedOrder?.order_id}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedOrder.customer_email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedOrder.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Método</p>
                  <p className="font-medium">{getPaymentMethodLabel(selectedOrder.payment_method)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-medium text-lg">{formatMT(parseFloat(selectedOrder.amount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Produto</p>
                <p className="font-medium">{selectedOrder.products?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-medium">
                  {format(new Date(selectedOrder.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayoutMoz>
  );
}
