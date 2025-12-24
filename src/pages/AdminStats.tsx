import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

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
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  // Calculate date range based on filter
  const getDateRange = (): { start: Date | null; end: Date | null } => {
    const now = new Date();
    
    switch (periodFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'custom':
        if (customDateRange?.from) {
          return { 
            start: startOfDay(customDateRange.from), 
            end: customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from) 
          };
        }
        return { start: null, end: null };
      case 'all':
        return { start: null, end: null };
      default:
        const days = parseInt(periodFilter);
        return { start: startOfDay(subDays(now, days)), end: null };
    }
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', periodFilter, customDateRange?.from?.toISOString(), customDateRange?.to?.toISOString()],
    queryFn: async () => {
      // Get all admins first
      const { data: admins, error: adminsError } = await supabase
        .from('admin_users')
        .select('id, full_name, email');
      if (adminsError) throw adminsError;

      // Build date filter
      const { start: dateFilterStart, end: dateFilterEnd } = getDateRange();

      // Helper function to apply date filter
      const applyDateFilter = (query: any, dateField: string) => {
        if (dateFilterStart) {
          query.gte(dateField, format(dateFilterStart, "yyyy-MM-dd'T'HH:mm:ss"));
        }
        if (dateFilterEnd) {
          query.lte(dateField, format(dateFilterEnd, "yyyy-MM-dd'T'HH:mm:ss"));
        }
        return query;
      };

      // Fetch KYC stats - using verified_by_name since verified_by may not be set
      let kycApprovedQuery = supabase
        .from('identity_verification')
        .select('verified_by_name, updated_at')
        .eq('status', 'aprovado')
        .not('verified_by_name', 'is', null);
      
      kycApprovedQuery = applyDateFilter(kycApprovedQuery, 'updated_at');
      const { data: kycApprovedData } = await kycApprovedQuery;

      // KYC rejeitados - não têm verified_by preenchido, contar total apenas
      let kycRejectedQuery = supabase
        .from('identity_verification')
        .select('updated_at')
        .eq('status', 'rejeitado');
      
      kycRejectedQuery = applyDateFilter(kycRejectedQuery, 'updated_at');
      const { data: kycRejectedData } = await kycRejectedQuery;

      // Fetch withdrawal stats from withdrawal_requests (uses admin_processed_by UUID)
      let withdrawalQuery = supabase
        .from('withdrawal_requests')
        .select('admin_processed_by, status, updated_at')
        .not('admin_processed_by', 'is', null);
      
      withdrawalQuery = applyDateFilter(withdrawalQuery, 'updated_at');
      const { data: withdrawalData } = await withdrawalQuery;

      // Get products with approved_by_admin_id for attribution
      let productsApprovedQuery = supabase
        .from('products')
        .select('approved_by_admin_id, updated_at')
        .eq('admin_approved', true)
        .not('approved_by_admin_id', 'is', null);
      
      productsApprovedQuery = applyDateFilter(productsApprovedQuery, 'updated_at');
      const { data: productsApprovedData } = await productsApprovedQuery;

      // Get total approved products count (for summary card)
      let totalApprovedProductsQuery = supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('admin_approved', true);
      
      if (dateFilterStart) {
        totalApprovedProductsQuery.gte('updated_at', format(dateFilterStart, "yyyy-MM-dd'T'HH:mm:ss"));
      }
      if (dateFilterEnd) {
        totalApprovedProductsQuery.lte('updated_at', format(dateFilterEnd, "yyyy-MM-dd'T'HH:mm:ss"));
      }
      const { count: totalApprovedProducts } = await totalApprovedProductsQuery;

      // Fetch banned products from admin_action_logs (product_ban action)
      let bansQuery = supabase
        .from('admin_action_logs')
        .select('admin_email, created_at')
        .eq('action', 'product_ban');
      
      bansQuery = applyDateFilter(bansQuery, 'created_at');
      const { data: bansData } = await bansQuery;

      // Fetch logins from admin_logs
      let logsQuery = supabase
        .from('admin_logs')
        .select('admin_id, action, created_at')
        .eq('action', 'admin_login');
      
      logsQuery = applyDateFilter(logsQuery, 'created_at');
      const { data: logsData } = await logsQuery;

      // Create maps for name/email lookup
      const adminByName = new Map<string, string>();
      const adminByEmail = new Map<string, string>();
      
      admins?.forEach(admin => {
        if (admin.full_name) {
          adminByName.set(admin.full_name.toLowerCase(), admin.id);
        }
        adminByEmail.set(admin.email.toLowerCase(), admin.id);
      });

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

      // Process KYC approved data by name
      kycApprovedData?.forEach(item => {
        const adminId = adminByName.get(item.verified_by_name?.toLowerCase() || '');
        if (adminId) {
          const stat = statsMap.get(adminId);
          if (stat) {
            stat.kyc_aprovacoes++;
            stat.total_acoes++;
          }
        }
      });

      // Process withdrawal data by admin_processed_by (UUID)
      withdrawalData?.forEach(item => {
        const stat = statsMap.get(item.admin_processed_by);
        if (stat) {
          if (item.status === 'completed' || item.status === 'approved' || item.status === 'aprovado') {
            stat.saques_aprovados++;
          } else if (item.status === 'rejected' || item.status === 'rejeitado') {
            stat.saques_rejeitados++;
          }
          stat.total_acoes++;
        }
      });

      // Process products approved data - use approved_by_admin_id from products table
      // This is the most reliable source for attributing approvals to specific admins
      productsApprovedData?.forEach(item => {
        if (item.approved_by_admin_id) {
          const stat = statsMap.get(item.approved_by_admin_id);
          if (stat) {
            stat.produtos_aprovados++;
            stat.total_acoes++;
          }
        }
      });

      // Process bans data by email
      bansData?.forEach(item => {
        const adminId = adminByEmail.get(item.admin_email?.toLowerCase() || '');
        if (adminId) {
          const stat = statsMap.get(adminId);
          if (stat) {
            stat.banimentos++;
            stat.total_acoes++;
          }
        }
      });

      // Process login data
      logsData?.forEach(item => {
        const stat = statsMap.get(item.admin_id);
        if (stat) {
          stat.logins++;
          stat.total_acoes++;
        }
      });

      // Store totals for summary
      const totalRejectedKyc = kycRejectedData?.length || 0;
      const totalApprovedProductsCount = totalApprovedProducts || 0;

      return {
        adminStats: Array.from(statsMap.values())
          .filter(s => s.total_acoes > 0)
          .sort((a, b) => b.total_acoes - a.total_acoes),
        totalRejectedKyc,
        totalApprovedProducts: totalApprovedProductsCount
      };
    }
  });

  // Calculate totals
  const adminStats = stats?.adminStats || [];
  const totalRejectedKyc = stats?.totalRejectedKyc || 0;
  const totalApprovedProducts = stats?.totalApprovedProducts || 0;
  
  const totals = adminStats.reduce((acc, stat) => ({
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
          
          <div className="flex items-center gap-2">
            <Select value={periodFilter} onValueChange={(value) => {
              setPeriodFilter(value);
              if (value !== 'custom') {
                setCustomDateRange(undefined);
              }
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {periodFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {customDateRange?.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - {format(customDateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                        </>
                      ) : (
                        format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                      )
                    ) : (
                      'Selecionar datas'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={setCustomDateRange}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
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
              <p className="text-2xl font-bold text-red-800 mt-1">{totalRejectedKyc}</p>
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
              <p className="text-2xl font-bold text-blue-800 mt-1">{totalApprovedProducts}</p>
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
                  {adminStats.map((stat, index) => (
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
                  {adminStats.length === 0 && (
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
