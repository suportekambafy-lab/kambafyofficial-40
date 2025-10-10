import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Shield, UserPlus, Trash2, Crown, Menu, ArrowLeft } from 'lucide-react';
import { AdminUser, AdminRole } from '@/types/admin';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminDrawer from '@/components/admin/AdminDrawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AVAILABLE_PERMISSIONS = [
  { id: 'manage_users', label: 'Gerenciar Usuários', description: 'Banir/desbanir usuários' },
  { id: 'manage_products', label: 'Gerenciar Produtos', description: 'Aprovar/rejeitar produtos' },
  { id: 'manage_withdrawals', label: 'Gerenciar Saques', description: 'Aprovar/rejeitar saques' },
  { id: 'manage_transfers', label: 'Gerenciar Transferências', description: 'Aprovar transferências bancárias' },
  { id: 'view_analytics', label: 'Ver Analytics', description: 'Acessar estatísticas do sistema' },
  { id: 'manage_verifications', label: 'Gerenciar Verificações', description: 'Aprovar verificações de identidade' },
];

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  support: 'Suporte',
  moderator: 'Moderador',
};

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: 'Acesso total ao sistema',
  admin: 'Gerenciamento geral',
  support: 'Atendimento e suporte',
  moderator: 'Moderação de conteúdo',
};

export default function AdminManagement() {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AdminRole>('admin');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const adminJwt = localStorage.getItem('admin_jwt');
      const { data, error } = await supabase.rpc('create_admin_user', {
        p_email: email,
        p_password: password,
        p_full_name: fullName,
        p_role: role,
        p_permissions: selectedPermissions,
        p_admin_email: admin?.email,
        p_jwt_token: adminJwt
      });

      if (error) throw error;

      toast.success('Administrador criado com sucesso!');
      setIsDialogOpen(false);
      
      // Reset form
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('admin');
      setSelectedPermissions([]);
      
      // Reload admins
      loadAdmins();
    } catch (error: any) {
      console.error('Erro ao criar admin:', error);
      toast.error(error.message || 'Erro ao criar administrador');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Tem certeza que deseja remover este administrador?')) return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      toast.success('Administrador removido com sucesso!');
      loadAdmins();
    } catch (error: any) {
      console.error('Erro ao remover admin:', error);
      toast.error('Erro ao remover administrador');
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id);

      if (error) throw error;

      toast.success(`Administrador ${!admin.is_active ? 'ativado' : 'desativado'} com sucesso!`);
      loadAdmins();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do administrador');
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 md:h-8 md:w-8" />
              Gerenciamento de Administradores
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os administradores e suas permissões
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Administrador</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo administrador
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nome do administrador"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha segura"
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Cargo</Label>
                  <Select value={role} onValueChange={(value) => setRole(value as AdminRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key} disabled={key === 'super_admin'}>
                          <div className="flex flex-col">
                            <span>{label}</span>
                            <span className="text-xs text-muted-foreground">
                              {ROLE_DESCRIPTIONS[key as AdminRole]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Permissões</Label>
                  <div className="space-y-3 border rounded-lg p-4 max-h-48 overflow-y-auto">
                    {AVAILABLE_PERMISSIONS.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPermissions([...selectedPermissions, permission.id]);
                            } else {
                              setSelectedPermissions(
                                selectedPermissions.filter((p) => p !== permission.id)
                              );
                            }
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {permission.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Criando...' : 'Criar Administrador'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {admin.role === 'super_admin' && (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      )}
                      {admin.full_name || 'Sem nome'}
                      {!admin.is_active && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Inativo
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {admin.email}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                      {ROLE_LABELS[admin.role]}
                    </span>
                    
                    {admin.role !== 'super_admin' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(admin)}
                        >
                          {admin.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAdmin(admin.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Criado em: {new Date(admin.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
