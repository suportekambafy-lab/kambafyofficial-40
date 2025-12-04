import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Crown, Loader2 } from 'lucide-react';
import { AdminUser, AdminRole } from '@/types/admin';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  support: 'Suporte',
  moderator: 'Moderador',
};

export default function AdminManagement() {
  const { admin } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Erro ao carregar admins:', error);
      toast.error('Erro ao carregar administradores');
    } finally {
      setLoading(false);
    }
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <AdminLayout title="Configurações" description="Carregando dados...">
        <AdminPageSkeleton variant="default" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Configurações" 
      description="Visualização dos administradores do sistema"
    >
      <div className="space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ <strong>Modo somente leitura:</strong> Para adicionar, editar ou remover administradores, use o banco de dados do Supabase diretamente.
          </p>
        </div>

        <div className="grid gap-4">
          {admins.map((adminUser) => (
            <Card key={adminUser.id} className="bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap text-[hsl(var(--admin-text))]">
                      {adminUser.role === 'super_admin' && (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      )}
                      {adminUser.full_name || 'Sem nome'}
                      {!adminUser.is_active && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Inativo
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {adminUser.email}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium px-3 py-1 bg-[hsl(var(--admin-primary))]/10 text-[hsl(var(--admin-primary))] rounded-full">
                      {ROLE_LABELS[adminUser.role]}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-[hsl(var(--admin-text-secondary))] space-y-1">
                  <p>Criado em: {new Date(adminUser.created_at).toLocaleDateString('pt-BR')}</p>
                  <p>Status: {adminUser.is_active ? '✅ Ativo' : '🔴 Inativo'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {admins.length === 0 && (
          <Card className="bg-[hsl(var(--admin-card-bg))] border-[hsl(var(--admin-border))]">
            <CardContent className="p-6 text-center text-[hsl(var(--admin-text-secondary))]">
              Nenhum administrador encontrado
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
