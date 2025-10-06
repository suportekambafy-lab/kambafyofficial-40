import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VerifyModulePaymentButton } from './VerifyModulePaymentButton';
import { fixEltonAccess } from '@/utils/fixEltonAccess';
interface ModulePayment {
  id: string;
  module_id: string;
  student_email: string;
  student_name: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  reference_number?: string;
  entity?: string;
  payment_proof_url?: string;
  created_at: string;
  completed_at?: string;
  modules: {
    title: string;
  };
}
export const ModulePaymentsDashboard = () => {
  const {
    user
  } = useAuth();
  const [payments, setPayments] = useState<ModulePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<ModulePayment | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user, filter]);

  // 🔓 Executar correção do acesso do Elton uma única vez
  useEffect(() => {
    const hasFixed = sessionStorage.getItem('elton_access_fixed');
    if (!hasFixed) {
      fixEltonAccess().then(() => {
        sessionStorage.setItem('elton_access_fixed', 'true');
        console.log('✅ Acesso do Elton corrigido!');
      });
    }
  }, []);
  const loadPayments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let query = supabase.from('module_payments').select(`
          *,
          modules!inner(title, user_id)
        `).eq('modules.user_id', user.id).order('created_at', {
        ascending: false
      });
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading module payments:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const getStatusBadge = (status: string) => {
    const variants = {
      completed: {
        variant: 'default' as const,
        icon: CheckCircle2,
        label: 'Concluído'
      },
      pending: {
        variant: 'secondary' as const,
        icon: Clock,
        label: 'Pendente'
      },
      failed: {
        variant: 'destructive' as const,
        icon: XCircle,
        label: 'Falhou'
      }
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    return <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>;
  };
  const stats = {
    total: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    pending: payments.filter(p => p.status === 'pending').length,
    completed: payments.filter(p => p.status === 'completed').length
  };
  if (isLoading) {
    return <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Recebido</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.total.toLocaleString('pt-AO')} AOA</p>
            </div>
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Pagamentos Pendentes</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Pagamentos Concluídos</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.completed}</p>
            </div>
            <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)} 
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg transition-colors ${
              filter === f 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Concluídos'}
          </button>
        ))}
      </div>

      {/* Payments List */}
      <Card>
        <div className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4">Pagamentos de Módulos</h3>
          
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pagamento encontrado
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map(payment => (
                <div 
                  key={payment.id} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer gap-3"
                  onClick={() => setSelectedPayment(payment)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{payment.modules.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {payment.student_name} ({payment.student_email})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(payment.created_at), "dd 'de' MMMM 'às' HH:mm", {
                        locale: ptBR
                      })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-sm sm:text-base">{Number(payment.amount).toLocaleString('pt-AO')} {payment.currency}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {payment.payment_method}
                        {payment.payment_method === 'reference' && payment.reference_number && (
                          <span className="ml-1 block sm:inline">Ref: {payment.reference_number}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.status)}
                      <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Módulo</p>
                  <p className="font-medium break-words">{selectedPayment.modules.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Aluno</p>
                  <p className="font-medium">{selectedPayment.student_name}</p>
                  <p className="text-xs text-muted-foreground break-all">{selectedPayment.student_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium">{Number(selectedPayment.amount).toLocaleString('pt-AO')} {selectedPayment.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                  <p className="font-medium capitalize">{selectedPayment.payment_method}</p>
                </div>
                {selectedPayment.reference_number && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Número de Referência</p>
                    <p className="text-xl font-bold text-primary">{selectedPayment.reference_number}</p>
                  </div>
                )}
                {selectedPayment.entity && (
                  <div>
                    <p className="text-sm text-muted-foreground">Entidade</p>
                    <p className="text-lg font-semibold">{selectedPayment.entity}</p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Order ID (rastreamento interno)</p>
                  <p className="font-mono text-xs text-muted-foreground break-all">{selectedPayment.order_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Criação</p>
                  <p className="text-sm">{format(new Date(selectedPayment.created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR
                  })}</p>
                </div>
                {selectedPayment.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Conclusão</p>
                    <p className="text-sm">{format(new Date(selectedPayment.completed_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR
                    })}</p>
                  </div>
                )}
              </div>

              {selectedPayment.payment_proof_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Comprovante</p>
                  <img 
                    src={selectedPayment.payment_proof_url} 
                    alt="Comprovante de pagamento" 
                    className="rounded-lg border max-h-64 w-full object-contain" 
                  />
                </div>
              )}

              {/* Botão Verificar Status */}
              {selectedPayment.status === 'pending' && (
                <div className="flex justify-end pt-4 border-t">
                  <VerifyModulePaymentButton 
                    paymentId={selectedPayment.id} 
                    referenceNumber={selectedPayment.reference_number} 
                    paymentMethod={selectedPayment.payment_method} 
                    onVerified={() => {
                      setSelectedPayment(null);
                      loadPayments();
                    }} 
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};