import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Menu, ArrowLeft, Crown } from 'lucide-react';
import { AdminUser, AdminRole } from '@/types/admin';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminDrawer from '@/components/admin/AdminDrawer';

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  support: 'Suporte',
  moderator: 'Moderador',
};

export default function AdminManagement() {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 md:h-8 md:w-8" />
              Lista de Administradores
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualização dos administradores do sistema
            </p>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                ⚠️ <strong>Modo somente leitura:</strong> Para adicionar, editar ou remover administradores, use o banco de dados do Supabase diretamente.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {admins.map((adminUser) => (
            <Card key={adminUser.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
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
                    <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                      {ROLE_LABELS[adminUser.role]}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Criado em: {new Date(adminUser.created_at).toLocaleDateString('pt-BR')}</p>
                  <p>Status: {adminUser.is_active ? '✅ Ativo' : '🔴 Inativo'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {admins.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhum administrador encontrado
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
