import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserX, UserCheck, User, Calendar, Mail, Shield, Search, LogIn, 
  Loader2, Users, UserPlus, Ban, MoreHorizontal, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BanUserDialog } from '@/components/BanUserDialog';
import { Send } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  banned: boolean | null;
  is_creator: boolean | null;
  avatar_url: string | null;
  bio: string | null;
  account_holder: string | null;
  ban_reason: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (admin) {
      console.log('Admin logado, carregando usuários...');
      loadUsers();
    }
  }, [admin]);

  const loadUsers = async () => {
    try {
      console.log('Carregando todos os usuários com paginação...');
      let allUsers: UserProfile[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email, banned, is_creator, avatar_url, bio, account_holder, ban_reason, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Erro ao carregar usuários:', error);
          toast({
            title: 'Erro',
            description: 'Erro ao carregar usuários',
            variant: 'destructive'
          });
          return;
        }

        if (data) {
          allUsers = [...allUsers, ...data];
          console.log(`Carregados ${data.length} usuários (total: ${allUsers.length})`);
        }

        // Verificar se há mais dados
        hasMore = data && data.length === pageSize;
        from += pageSize;
      }

      console.log(`✅ Total de usuários carregados: ${allUsers.length}`);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao carregar usuários',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = (user: UserProfile) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };

  const handleConfirmBan = async (banReason: string) => {
    if (!selectedUser) return;
    
    setProcessingId(selectedUser.id);
    
    try {
      console.log('Banindo usuário:', { userId: selectedUser.id, banReason });
      
      // Atualizar o perfil do usuário
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          banned: true,
          ban_reason: banReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (updateError) {
        console.error('Erro ao banir usuário:', updateError);
        throw updateError;
      }

      // Enviar email de notificação
      try {
        const { error: emailError } = await supabase.functions.invoke('send-user-ban-notification', {
          body: {
            userEmail: selectedUser.email,
            userName: selectedUser.full_name || 'Usuário',
            banReason: banReason
          }
        });

        if (emailError) {
          console.error('Erro ao enviar email de banimento:', emailError);
          // Não falhar a operação por causa do email
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de banimento:', emailError);
      }

      toast({
        title: 'Usuário Banido',
        description: 'Usuário foi banido com sucesso e notificado por email.',
        variant: 'destructive'
      });

      // Recarregar dados
      loadUsers();
      setBanDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao banir usuário',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const sendBulkPasswordResetEmails = async () => {
    setSendingEmails(true);
    
    try {
      console.log('Disparando emails de redefinição de senha em lote...');
      
      const { data, error } = await supabase.functions.invoke('send-bulk-password-reset');

      if (error) {
        console.error('Erro ao enviar emails:', error);
        throw error;
      }

      const results = data.results;
      
      toast({
        title: 'Emails Enviados',
        description: `${results.sent} emails enviados com sucesso. ${results.failed} falharam.`,
        variant: results.failed > 0 ? 'destructive' : 'default'
      });

      if (results.errors.length > 0) {
        console.error('Erros ao enviar emails:', results.errors);
      }
    } catch (error) {
      console.error('Error sending bulk password reset emails:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar emails de redefinição de senha',
        variant: 'destructive'
      });
    } finally {
      setSendingEmails(false);
    }
  };

  const updateUserStatus = async (userId: string, banned: boolean) => {
    setProcessingId(userId);
    
    try {
      console.log('Atualizando status do usuário:', { userId, banned });
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          banned,
          ban_reason: null, // Limpar motivo ao desbanir
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: `Usuário ${banned ? 'banido' : 'desbloqueado'} com sucesso`,
        variant: banned ? 'destructive' : 'default'
      });

      // Recarregar dados
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar usuário',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleImpersonateUser = async (user: UserProfile) => {
    if (!admin?.email) {
      toast({
        title: 'Erro',
        description: 'Email do admin não encontrado',
        variant: 'destructive'
      });
      return;
    }

    const adminJwt = localStorage.getItem('admin_jwt');
    if (!adminJwt) {
      toast({
        title: 'Erro',
        description: 'Sessão admin expirada. Faça login novamente.',
        variant: 'destructive'
      });
      return;
    }

    setProcessingId(user.id);
    
    try {
      console.log('🎭 Iniciando impersonation para:', user.email);
      
      const { data, error } = await supabase.functions.invoke('admin-impersonate-user', {
        body: {
          targetUserId: user.user_id
        },
        headers: {
          'Authorization': `Bearer ${adminJwt}`
        }
      });

      if (error) {
        console.error('Erro ao impersonate:', error);
        throw error;
      }

      if (!data?.success || !data?.magicLink) {
        throw new Error('Dados de impersonation inválidos');
      }

      await completeImpersonation(data, user);
      
    } catch (error) {
      console.error('Error impersonating user:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao entrar como usuário',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const completeImpersonation = async (data: any, user: UserProfile) => {
    console.log('✅ Magic link recebido, completando impersonation');

    // Salvar dados de impersonation no localStorage
    const impersonationData = {
      id: data.impersonationSession?.id,
      adminEmail: admin?.email,
      targetUserId: user.user_id,
      targetUserEmail: user.email,
      targetUserName: user.full_name || user.email,
      expiresAt: data.impersonationSession?.expiresAt,
      startedAt: new Date().toISOString(),
      readOnlyMode: data.impersonationSession?.readOnlyMode,
      durationMinutes: data.impersonationSession?.durationMinutes
    };

    localStorage.setItem('impersonation_data', JSON.stringify(impersonationData));

    toast({
      title: 'Impersonation iniciado',
      description: `Você está entrando como ${user.full_name || user.email}`,
    });

    // Redirecionar para o magic link que fará login automático
    window.location.href = data.magicLink;
  };

  const getStatusBadge = (banned: boolean | null, isCreator: boolean | null) => {
    if (banned) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
          Banido
        </span>
      );
    }
    if (isCreator) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
          Criador
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
        Ativo
      </span>
    );
  };

  // Filtrar usuários baseado na busca
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = user.full_name?.toLowerCase().includes(searchLower);
    const emailMatch = user.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.banned).length;
  const bannedUsers = users.filter(u => u.banned).length;
  const creators = users.filter(u => u.is_creator).length;

  if (loading) {
    return (
      <AdminLayout title="Utilizadores" description="Carregando dados...">
        <AdminPageSkeleton variant="table" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Utilizadores" 
      description="Gerencie todos os utilizadores da plataforma."
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[hsl(var(--admin-bg))] flex items-center justify-center">
            <Users className="h-5 w-5 text-[hsl(var(--admin-text-secondary))]" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Total de utilizadores</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{totalUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Ativos</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{activeUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
            <Ban className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Banidos</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{bannedUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Criadores</p>
            <p className="text-2xl font-bold text-[hsl(var(--admin-text))]">{creators.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--admin-border))]">
        {/* Table Header */}
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[hsl(var(--admin-border))]">
          <h3 className="font-semibold text-[hsl(var(--admin-text))]">Lista de utilizadores</h3>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Pesquisar utilizador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-52 pl-3 pr-10 h-9 bg-white border-[hsl(var(--admin-border))] rounded-lg"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
            </div>

            {/* Send Emails Button */}
            <Button 
              onClick={sendBulkPasswordResetEmails}
              disabled={sendingEmails}
              className="h-9 gap-2 bg-[hsl(var(--admin-primary))] hover:bg-[hsl(var(--admin-primary))]/90 text-white"
            >
              <Send className="h-4 w-4" />
              {sendingEmails ? 'Enviando...' : 'Enviar Reset'}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[hsl(var(--admin-border))] hover:bg-transparent">
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Utilizador</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Email</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Data de registro</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm">Estado</TableHead>
                <TableHead className="text-[hsl(var(--admin-text-secondary))] font-medium text-sm text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-[hsl(var(--admin-text-secondary))]">
                    Nenhum utilizador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-[hsl(var(--admin-border))] hover:bg-[hsl(var(--admin-bg))]/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[hsl(var(--admin-primary))] flex items-center justify-center">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.full_name || 'Avatar'}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[hsl(var(--admin-text))]">
                            {user.full_name || 'Sem nome'}
                          </p>
                          {user.is_creator && (
                            <div className="flex items-center gap-1 text-xs text-purple-600">
                              <Shield className="h-3 w-3" />
                              Criador
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                      {user.email || 'N/A'}
                    </TableCell>
                    <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                      {new Date(user.created_at).toLocaleDateString('pt-AO')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.banned, user.is_creator)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 border-[hsl(var(--admin-border))]"
                          onClick={() => handleImpersonateUser(user)}
                          disabled={processingId === user.id}
                        >
                          <LogIn className="h-4 w-4 mr-1" />
                          Entrar
                        </Button>
                        {user.banned ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => updateUserStatus(user.id, false)}
                            disabled={processingId === user.id}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Desbloquear
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleBanUser(user)}
                            disabled={processingId === user.id}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Banir
                          </Button>
                        )}
                      </div>
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
            {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 border-[hsl(var(--admin-border))]" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 border-[hsl(var(--admin-border))]"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select value={String(itemsPerPage)} onValueChange={(v) => setCurrentPage(1)}>
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

      <BanUserDialog
        isOpen={banDialogOpen}
        onClose={() => {
          setBanDialogOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleConfirmBan}
        userName={selectedUser?.full_name || 'Usuário'}
        isLoading={processingId === selectedUser?.id}
      />
    </AdminLayout>
  );
}
