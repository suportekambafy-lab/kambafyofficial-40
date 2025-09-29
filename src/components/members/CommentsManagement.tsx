import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Trash2, Reply, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Comment {
  id: string;
  comment: string;
  user_email: string;
  user_name: string;
  created_at: string;
  updated_at: string;
  lesson_id: string;
  parent_comment_id: string | null;
  lesson_title?: string;
}

interface CommentsManagementProps {
  memberAreaId: string;
  isOwner: boolean;
}

export function CommentsManagement({ memberAreaId, isOwner }: CommentsManagementProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOwner && memberAreaId) {
      loadComments();
    }
  }, [memberAreaId, isOwner]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      
      // Buscar todos os comentários da área de membros
      const { data: commentsData, error } = await supabase
        .from('lesson_comments')
        .select(`
          *,
          lessons!inner(title)
        `)
        .eq('lessons.member_area_id', memberAreaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar comentários:', error);
        toast.error('Erro ao carregar comentários');
        return;
      }

      // Processar os dados para incluir o título da aula
      const processedComments = commentsData?.map(comment => ({
        ...comment,
        lesson_title: comment.lessons?.title || 'Aula removida'
      })) || [];

      setComments(processedComments);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar comentários');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setDeletingCommentId(commentId);
      
      const { error } = await supabase
        .from('lesson_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Erro ao deletar comentário:', error);
        toast.error('Erro ao deletar comentário');
        return;
      }

      toast.success('Comentário deletado com sucesso');
      
      // Remover o comentário da lista local
      setComments(prev => prev.filter(c => c.id !== commentId));
      
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao deletar comentário');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOwner) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5" />
            Gestão de Comentários
          </CardTitle>
          <CardDescription>
            Carregando comentários...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageCircle className="h-5 w-5" />
          Gestão de Comentários
        </CardTitle>
        <CardDescription>
          Gerencie todos os comentários da sua área de membros ({comments.length} comentários)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum comentário encontrado</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 bg-zinc-800 rounded-lg border border-zinc-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-emerald-600 text-white text-xs">
                      {getInitials(comment.user_name || comment.user_email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white text-sm">
                      {comment.user_name || comment.user_email}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatDate(comment.created_at)}
                    </div>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      disabled={deletingCommentId === comment.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">
                        Deletar Comentário
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        Tem certeza que deseja deletar este comentário? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteComment(comment.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="mb-3">
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                  {comment.lesson_title}
                </Badge>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed">
                {comment.comment}
              </p>

              {comment.parent_comment_id && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Reply className="h-3 w-3" />
                  Resposta a outro comentário
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}