import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  UserCheck, 
  UserX, 
  Ban, 
  CheckCircle, 
  XCircle,
  Wallet,
  Shield,
  Activity
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

interface AdminStat {
  admin_id: string;
  admin_name: string;
  admin_email: string;
  kyc_aprovacoes: number;
  kyc_rejeicoes: number;
  banimentos: number;
  saques_aprovados: number;
  saques_rejeitados: number;
  produtos_aprovados: number;
  produtos_banidos: number;
  logins: number;
  total_acoes: number;
}

export default function AdminStats() {
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', periodFilter],
    queryFn: async () => {
      // Fetch logs with period filter
      const logsQuery = supabase
        .from('admin_logs')
        .select('admin_id, action, created_at');
      
      if (periodFilter !== 'all') {
        const days = parseInt(periodFilter);
        const startDate = format(startOfDay(subDays(new Date(), days)), 'yyyy-MM-dd');
        logsQuery.gte('created_at', startDate);
      }

      const { data: logs, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      const { data: admins, error: adminsError } = await supabase
        .from('admin_users')
        .select('id, full_name, email');
      if (adminsError) throw adminsError;

      // Aggregate stats
      const statsMap = new Map<string, AdminStat>();
      
      admins?.forEach(admin => {
        statsMap.set(admin.id, {
          admin_id: admin.id,
          admin_name: admin.full_name || admin.email,
          admin_email: admin.email,
          kyc_aprovacoes: 0,
          kyc_rejeicoes: 0,
          banimentos: 0,
          saques_aprovados: 0,
          saques_rejeitados: 0,
          produtos_aprovados: 0,
          produtos_banidos: 0,
          logins: 0,
          total_acoes: 0
        });
      });

      logs?.forEach(log => {
        const stat = statsMap.get(log.admin_id);
        if (stat) {
          stat.total_acoes++;
          switch (log.action) {
            case 'kyc_approve':
              stat.kyc_aprovacoes++;
              break;
            case 'kyc_reject':
              stat.kyc_rejeicoes++;
              break;
            case 'product_ban':
              stat.banimentos++;
              stat.produtos_banidos++;
              break;
            case 'withdrawal_aprovado':
            case 'withdrawals_bulk_aprovado':
              stat.saques_aprovados++;
              break;
            case 'withdrawal_rejeitado':
            case 'withdrawals_bulk_rejeitado':
              stat.saques_rejeitados++;
              break;
            case 'product_approve':
              stat.produtos_aprovados++;
              break;
            case 'admin_login':
              stat.logins++;
              break;
          }
        }
      });

      return Array.from(statsMap.values())
        .filter(s => s.total_acoes > 0)
        .sort((a, b) => b.total_acoes - a.total_acoes);
    }
  });

  // Calculate totals
  const totals = stats?.reduce((acc, stat) => ({
    kyc_aprovacoes: acc.kyc_aprovacoes + stat.kyc_aprovacoes,
    kyc_rejeicoes: acc.kyc_rejeicoes + stat.kyc_rejeicoes,
    banimentos: acc.banimentos + stat.banimentos,
    saques_aprovados: acc.saques_aprovados + stat.saques_aprovados,
    saques_rejeitados: acc.saques_rejeitados + stat.saques_rejeitados,
    produtos_aprovados: acc.produtos_aprovados + stat.produtos_aprovados,
    total_acoes: acc.total_acoes + stat.total_acoes,
  }), {
    kyc_aprovacoes: 0,
    kyc_rejeicoes: 0,
    banimentos: 0,
    saques_aprovados: 0,
    saques_rejeitados: 0,
    produtos_aprovados: 0,
    total_acoes: 0,
  });

  if (isLoading) {
    return (
      <AdminLayout title="Estatísticas dos Admins">
        <AdminPageSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Estatísticas dos Admins" description="Acompanhe as ações realizadas por cada administrador">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Estatísticas dos Admins
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acompanhe as ações realizadas por cada administrador
            </p>
          </div>
          
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700">KYC Aprovados</span>
              </div>
              <p className="text-2xl font-bold text-green-800 mt-1">{totals?.kyc_aprovacoes || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-700">KYC Rejeitados</span>
              </div>
              <p className="text-2xl font-bold text-red-800 mt-1">{totals?.kyc_rejeicoes || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-orange-700">Banimentos</span>
              </div>
              <p className="text-2xl font-bold text-orange-800 mt-1">{totals?.banimentos || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-700">Saques Aprovados</span>
              </div>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{totals?.saques_aprovados || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-rose-50 border-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                <span className="text-xs text-rose-700">Saques Rejeitados</span>
              </div>
              <p className="text-2xl font-bold text-rose-800 mt-1">{totals?.saques_rejeitados || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700">Produtos Aprov.</span>
              </div>
              <p className="text-2xl font-bold text-blue-800 mt-1">{totals?.produtos_aprovados || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-purple-700">Total Ações</span>
              </div>
              <p className="text-2xl font-bold text-purple-800 mt-1">{totals?.total_acoes || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Ações por Administrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Admin</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">KYC ✓</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">KYC ✗</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Bans</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Saques ✓</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Saques ✗</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Prod. ✓</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Logins</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.map((stat, index) => (
                    <tr key={stat.admin_id} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-sm">{stat.admin_name}</p>
                          <p className="text-xs text-muted-foreground">{stat.admin_email}</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        {stat.kyc_aprovacoes > 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {stat.kyc_aprovacoes}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {stat.kyc_rejeicoes > 0 ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {stat.kyc_rejeicoes}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {stat.banimentos > 0 ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {stat.banimentos}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {stat.saques_aprovados > 0 ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {stat.saques_aprovados}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {stat.saques_rejeitados > 0 ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            {stat.saques_rejeitados}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {stat.produtos_aprovados > 0 ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {stat.produtos_aprovados}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {stat.logins > 0 ? (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            {stat.logins}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          {stat.total_acoes}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!stats || stats.length === 0) && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma ação registrada no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
