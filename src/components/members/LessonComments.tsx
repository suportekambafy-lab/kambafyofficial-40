import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_email: string;
  user_name: string;
  parent_comment_id?: string | null;
  replies?: Comment[];
}

interface LessonCommentsProps {
  lessonId: string;
  studentEmail?: string;
  studentName?: string;
}

export function LessonComments({
  lessonId,
  studentEmail,
  studentName
}: LessonCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lesson_comments')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar comentários:', error);
        return;
      }

      // Organizar comentários em estrutura hierárquica
      const topLevelComments: Comment[] = [];
      const commentMap: Record<string, Comment> = {};

      // Primeiro, criar o mapa de comentários
      data?.forEach(comment => {
        commentMap[comment.id] = { ...comment, replies: [] };
      });

      // Organizar hierarquia
      data?.forEach(comment => {
        if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
          commentMap[comment.parent_comment_id].replies!.push(commentMap[comment.id]);
        } else {
          topLevelComments.push(commentMap[comment.id]);
        }
      });

      setComments(topLevelComments);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) {
      loadComments();
    }
  }, [lessonId]);

  const handleSubmitComment = async (parentCommentId?: string) => {
    const commentText = parentCommentId ? replyText : newComment;
    
    if (!commentText.trim()) {
      toast.error('Digite um comentário');
      return;
    }

    if (!studentEmail || !studentName) {
      toast.error('Erro de autenticação');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('add-member-area-comment', {
        body: {
          lessonId,
          comment: commentText.trim(),
          studentEmail,
          studentName,
          parentCommentId: parentCommentId || null
        }
      });

      if (error) {
        console.error('Erro ao adicionar comentário:', error);
        toast.error('Erro ao adicionar comentário');
        return;
      }

      // Recarregar comentários
      await loadComments();
      
      // Limpar formulários
      if (parentCommentId) {
        setReplyingTo(null);
        setReplyText('');
      } else {
        setNewComment('');
      }

      toast.success('Comentário adicionado!');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Tem certeza que deseja eliminar este comentário?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lesson_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Erro ao eliminar comentário:', error);
        toast.error('Erro ao eliminar comentário');
        return;
      }

      // Recarregar comentários
      await loadComments();
      toast.success('Comentário eliminado!');
    } catch (error) {
      console.error('Erro ao eliminar comentário:', error);
      toast.error('Erro ao eliminar comentário');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string, email: string) => {
    if (name && name !== 'Usuário') {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 ${isReply ? 'ml-8 mt-2' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-gray-700">
          <AvatarFallback className="bg-emerald-600 text-white text-sm">
            {getInitials(comment.user_name, comment.user_email)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{comment.user_name}</p>
            <p className="text-xs text-emerald-400">{comment.user_email}</p>
          </div>
          
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(comment.created_at)}
          </p>
          
          <p className="text-gray-300 leading-relaxed">{comment.comment}</p>
          
          {!isReply && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-xs text-emerald-400 hover:text-emerald-300 h-7 px-2"
              >
                {replyingTo === comment.id ? 'Cancelar' : 'Responder'}
              </Button>
              
              {comment.user_email === studentEmail && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs text-red-400 hover:text-red-300 h-7 px-2"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
          )}
          
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Digite sua resposta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="border-gray-700 text-white placeholder-gray-400 resize-none bg-zinc-900"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleSubmitComment(comment.id)}
                  disabled={!replyText.trim() || isSubmitting}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  Responder
                </Button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="mt-6 bg-zinc-950 border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageCircle className="h-5 w-5" />
          Comentários ({comments.reduce((count, comment) => count + 1 + (comment.replies?.length || 0), 0)})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Textarea 
            placeholder="Deixe seu comentário sobre esta aula..." 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)} 
            rows={3} 
            className="border-gray-700 text-white placeholder-gray-400 resize-none bg-zinc-950" 
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => handleSubmitComment()} 
              disabled={!newComment.trim() || isSubmitting} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Comentar
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Carregando comentários...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Seja o primeiro a comentar nesta aula!</p>
            </div>
          ) : (
            comments.map(comment => renderComment(comment))
          )}
        </div>
      </CardContent>
    </Card>
  );
}