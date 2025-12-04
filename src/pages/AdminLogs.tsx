
import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { AdminLog } from '@/types/admin';
import { Clock, Activity, User, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface AdminLogWithUser extends AdminLog {
  admin_users?: {
    full_name: string;
    email: string;
  };
}

export default function AdminLogs() {
  const { admin } = useAdminAuth();
  const [logs, setLogs] = useState<AdminLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (admin) {
      loadLogs();
    }
  }, [admin]);

  const loadLogs = async () => {
    try {
      console.log('Carregando logs administrativos...');
      const { data, error } = await supabase
        .from('admin_logs')
        .select(`
          *,
          admin_users!inner(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('Resultado dos logs:', { data, error });

      if (error) {
        console.error('Erro ao carregar logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading admin logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string; className: string }> = {
      withdrawal_aprovado: { label: 'Saque Aprovado', className: 'bg-green-100 text-green-800 border-green-200' },
      withdrawal_rejeitado: { label: 'Saque Rejeitado', className: 'bg-red-100 text-red-800 border-red-200' },
      product_approved: { label: 'Produto Aprovado', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      product_rejected: { label: 'Produto Rejeitado', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      user_banned: { label: 'Usuário Banido', className: 'bg-red-100 text-red-800 border-red-200' },
      user_unbanned: { label: 'Usuário Desbloqueado', className: 'bg-green-100 text-green-800 border-green-200' }
    };

    const actionInfo = actionMap[action] || { 
      label: action, 
      className: 'bg-gray-100 text-gray-800 border-gray-200' 
    };

    return (
      <Badge className={actionInfo.className}>
        {actionInfo.label}
      </Badge>
    );
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--admin-bg))]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--admin-primary))]" />
      </div>
    );
  }

  return (
    <AdminLayout title="Logs de Ações" description="Histórico de ações administrativas">
      <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="shadow-lg border bg-card hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg text-foreground flex items-center gap-2">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{log.admin_users?.full_name || log.admin_users?.email || 'Administrador'}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{new Date(log.created_at).toLocaleString('pt-AO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                  </div>
                  {getActionBadge(log.action)}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="font-medium text-slate-900">Tipo:</span>
                    <p className="text-slate-600 capitalize truncate">{log.target_type}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="font-medium text-slate-900">ID:</span>
                    <p className="text-slate-600 font-mono text-xs truncate">{log.target_id || 'N/A'}</p>
                  </div>
                  {log.details && (
                    <div className="bg-slate-50 p-3 rounded-lg sm:col-span-2 lg:col-span-3">
                      <span className="font-medium text-slate-900">Detalhes:</span>
                      <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {logs.length === 0 && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="text-center py-12 sm:py-16">
                <Activity className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">Nenhum log encontrado</h3>
                <p className="text-sm sm:text-base text-slate-600">Não há ações administrativas registradas ainda.</p>
              </CardContent>
            </Card>
          )}
      </div>
    </AdminLayout>
  );
}
