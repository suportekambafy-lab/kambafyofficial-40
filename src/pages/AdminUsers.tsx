
import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, UserX, UserCheck, User, Calendar, Mail, Shield, Search, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BanUserDialog } from '@/components/BanUserDialog';
import { Send } from 'lucide-react';

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (admin) {
      console.log('Admin logado, carregando usuários...');
      loadUsers();
    }
  }, [admin]);

  const loadUsers = async () => {
    try {
      console.log('Carregando usuários...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, banned, is_creator, avatar_url, bio, account_holder, ban_reason, created_at')
        .order('created_at', { ascending: false });

      console.log('Resultado dos usuários:', { data, error });

      if (error) {
        console.error('Erro ao carregar usuários:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar usuários',
          variant: 'destructive'
        });
        return;
      }

      setUsers(data || []);
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

    setProcessingId(user.id);
    
    try {
      console.log('🎭 Iniciando impersonation para:', user.email);
      
      // Chamar edge function para criar sessão de impersonation
      const { data, error } = await supabase.functions.invoke('admin-impersonate-user', {
        body: {
          targetUserId: user.user_id,
          adminEmail: admin.email
        }
      });

      if (error) {
        console.error('Erro ao impersonate:', error);
        throw error;
      }

      if (!data?.success || !data?.magicLink) {
        throw new Error('Dados de impersonation inválidos');
      }

      console.log('✅ Magic link recebido');

      // Salvar dados de impersonation no localStorage
      localStorage.setItem('impersonation_data', JSON.stringify({
        targetUser: data.targetUser,
        adminEmail: admin.email,
        startedAt: new Date().toISOString()
      }));

      toast({
        title: 'Impersonation iniciado',
        description: `Você está entrando como ${user.full_name || user.email}`,
      });

      // Redirecionar para o magic link que fará login automático
      window.location.href = data.magicLink;
      
    } catch (error) {
      console.error('Error impersonating user:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao entrar como usuário',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (banned: boolean | null, isCreator: boolean | null) => {
    if (banned) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Banido</Badge>;
    }
    if (isCreator) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Criador</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
  };

  // Filtrar usuários baseado na busca
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = user.full_name?.toLowerCase().includes(searchLower);
    const emailMatch = user.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
              <p className="text-muted-foreground mt-1">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'} cadastrados
              </p>
            </div>
          </div>

          {/* Campo de Busca */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Enviar Links de Redefinição de Senha
                  </h3>
                  <p className="text-sm text-slate-600">
                    Envia emails para todos os usuários que precisam definir uma senha permanente
                  </p>
                </div>
                <Button
                  onClick={sendBulkPasswordResetEmails}
                  disabled={sendingEmails}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingEmails ? 'Enviando...' : 'Enviar Emails'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.full_name || 'Avatar'}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-900">
                        {user.full_name || 'Usuário sem nome'}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {user.is_creator && <Shield className="h-4 w-4 text-purple-600" />}
                        <span className="text-sm text-slate-600 capitalize">
                          {user.is_creator ? 'Criador' : 'Usuário'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(user.banned, user.is_creator)}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{user.email || 'Email não disponível'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-AO')}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {user.bio && (
                  <div className="mb-4">
                    <h4 className="font-medium text-slate-900 mb-2">Bio:</h4>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg line-clamp-3">
                      {user.bio}
                    </p>
                  </div>
                )}

                {user.account_holder && (
                  <div className="mb-4 text-sm">
                    <span className="font-medium text-slate-900">Titular da Conta:</span>
                    <span className="ml-2 text-slate-600">{user.account_holder}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                  <Button
                    onClick={() => handleImpersonateUser(user)}
                    disabled={processingId === user.id}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-sm"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    {processingId === user.id ? 'Entrando...' : 'Entrar como Usuário'}
                  </Button>
                  
                  {user.banned ? (
                    <Button
                      onClick={() => updateUserStatus(user.id, false)}
                      disabled={processingId === user.id}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-sm"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {processingId === user.id ? 'Desbloqueando...' : 'Desbloquear'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleBanUser(user)}
                      disabled={processingId === user.id}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-0 shadow-sm"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      {processingId === user.id ? 'Banindo...' : 'Banir Usuário'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredUsers.length === 0 && (
            <Card className="col-span-3 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="text-center py-16">
                <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                </h3>
                <p className="text-slate-600">
                  {searchTerm 
                    ? 'Tente buscar com outros termos.' 
                    : 'Não há usuários cadastrados no sistema.'}
                </p>
              </CardContent>
            </Card>
          )}
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
      </div>
    </div>
  );
}
