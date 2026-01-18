import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  MoreVertical,
  Loader2,
  Trash2,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useCustomToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Collaborator {
  id: string;
  collaborator_email: string;
  collaborator_user_id: string | null;
  status: string;
  permissions: { full_access?: boolean };
  invited_at: string;
  accepted_at: string | null;
}

export default function Collaborators() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [fullAccess, setFullAccess] = useState(true);
  const [collaboratorToRemove, setCollaboratorToRemove] = useState<Collaborator | null>(null);

  // Fetch collaborators
  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['collaborators', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('account_collaborators')
        .select('*')
        .eq('owner_user_id', user.id)
        .neq('status', 'revoked')
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data as Collaborator[];
    },
    enabled: !!user?.id
  });

  // Add collaborator mutation
  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!user?.id) throw new Error('Não autenticado');
      
      // Check if not inviting self
      if (email.toLowerCase() === user.email?.toLowerCase()) {
        throw new Error('Você não pode adicionar a si mesmo como colaborador');
      }

      // Check if already exists
      const { data: existing } = await supabase
        .from('account_collaborators')
        .select('id, status')
        .eq('owner_user_id', user.id)
        .eq('collaborator_email', email.toLowerCase())
        .maybeSingle();

      if (existing) {
        if (existing.status === 'revoked') {
          // Reactivate
          const { error } = await supabase
            .from('account_collaborators')
            .update({ 
              status: 'pending', 
              invited_at: new Date().toISOString(),
              revoked_at: null,
              permissions: { full_access: fullAccess }
            })
            .eq('id', existing.id);
          if (error) throw error;
          return;
        }
        throw new Error('Este e-mail já foi convidado');
      }

      // Check if user exists in auth
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      const { error } = await supabase
        .from('account_collaborators')
        .insert({
          owner_user_id: user.id,
          collaborator_email: email.toLowerCase(),
          collaborator_user_id: existingUser?.id || null,
          status: existingUser ? 'active' : 'pending',
          accepted_at: existingUser ? new Date().toISOString() : null,
          permissions: { full_access: fullAccess }
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      toast({
        title: 'Colaborador adicionado',
        description: 'O convite foi enviado com sucesso'
      });
      setShowAddModal(false);
      setNewEmail('');
      setFullAccess(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Remove collaborator mutation
  const removeMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase
        .from('account_collaborators')
        .update({ 
          status: 'revoked',
          revoked_at: new Date().toISOString()
        })
        .eq('id', collaboratorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      toast({
        title: 'Acesso removido',
        description: 'O colaborador não tem mais acesso à sua conta'
      });
      setCollaboratorToRemove(null);
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o colaborador',
        variant: 'destructive'
      });
    }
  });

  // Filter collaborators by search
  const filteredCollaborators = collaborators.filter(c =>
    c.collaborator_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    addMutation.mutate(newEmail.trim());
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Ativo</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
        <p className="text-muted-foreground">
          Gerencie quem pode acessar e gerenciar sua conta
        </p>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar colaborador
        </Button>
      </div>

      {/* Collaborators Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCollaborators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? 'Nenhum colaborador encontrado' : 'Nenhum colaborador'}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {searchTerm 
                  ? 'Tente buscar por outro e-mail' 
                  : 'Adicione colaboradores para que eles possam gerenciar sua conta'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">EMAIL</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">STATUS</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">DATA DO CONVITE</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollaborators.map((collaborator) => (
                    <tr key={collaborator.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm">{collaborator.collaborator_email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(collaborator.status)}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {format(new Date(collaborator.invited_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-4 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setCollaboratorToRemove(collaborator)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover acesso
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4 text-primary" />
        <span>Aprenda mais sobre os </span>
        <a href="#" className="text-primary hover:underline">colaboradores</a>
      </div>

      {/* Add Collaborator Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar colaborador</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddCollaborator} className="space-y-6 pt-4">
            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-sm text-muted-foreground">E-mail</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="colaborador@email.com"
                required
              />
            </div>

            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <label className="text-sm text-muted-foreground">Permissões</label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="full-access"
                  checked={fullAccess}
                  onCheckedChange={(checked) => setFullAccess(!!checked)}
                />
                <label htmlFor="full-access" className="text-sm cursor-pointer">
                  Acesso total
                </label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                'Adicionar colaborador'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!collaboratorToRemove} onOpenChange={() => setCollaboratorToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o acesso de <strong>{collaboratorToRemove?.collaborator_email}</strong>?
              <br /><br />
              Esta pessoa não poderá mais gerenciar sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => collaboratorToRemove && removeMutation.mutate(collaboratorToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover acesso'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
