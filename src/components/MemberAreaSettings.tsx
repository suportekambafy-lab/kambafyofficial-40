import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MemberAreaSettingsProps {
  memberAreaId: string;
}

export function MemberAreaSettings({ memberAreaId }: MemberAreaSettingsProps) {
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [memberAreaId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('member_areas')
        .select('comments_enabled')
        .eq('id', memberAreaId)
        .single();

      if (error) throw error;

      if (data) {
        setCommentsEnabled(data.comments_enabled ?? true);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComments = async (enabled: boolean) => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('member_areas')
        .update({ comments_enabled: enabled })
        .eq('id', memberAreaId);

      if (error) throw error;

      setCommentsEnabled(enabled);
      toast.success(
        enabled 
          ? 'Comentários habilitados com sucesso' 
          : 'Comentários desabilitados com sucesso'
      );
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
      // Reverter o estado em caso de erro
      setCommentsEnabled(!enabled);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllComments = async () => {
    try {
      setIsDeleting(true);
      
      const { data, error } = await supabase.functions.invoke('delete-member-area-comments', {
        body: { memberAreaId }
      });

      if (error) throw error;

      toast.success(data.message || 'Comentários eliminados com sucesso');
    } catch (error) {
      console.error('Erro ao eliminar comentários:', error);
      toast.error('Erro ao eliminar comentários');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Configurações de Comentários
        </CardTitle>
        <CardDescription>
          Gerencie como os alunos podem interagir através dos comentários nas aulas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="comments-enabled" className="text-base">
              Permitir Comentários
            </Label>
            <p className="text-sm text-muted-foreground">
              Quando ativado, os alunos poderão comentar nas aulas desta área de membros
            </p>
          </div>
          <Switch
            id="comments-enabled"
            checked={commentsEnabled}
            onCheckedChange={handleToggleComments}
            disabled={isSaving}
          />
        </div>

        <div className="pt-4 border-t">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-destructive">Zona de Perigo</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Ações irreversíveis que afetam todos os comentários desta área de membros
              </p>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full sm:w-auto"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Todos os Comentários
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os comentários e respostas desta área de membros 
                    serão permanentemente eliminados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllComments}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, eliminar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}