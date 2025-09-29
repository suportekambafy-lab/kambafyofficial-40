import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, Clock, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  lesson_id: string;
  parent_comment_id?: string | null;
  user_email?: string;
  user_name?: string;
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

  // Carregar comentários com informações de usuário
  useEffect(() => {
    if (!lessonId) return;
    const loadComments = async () => {
      try {
        setIsLoading(true);
        
        // Buscar comentários da aula
        const { data: commentsData, error } = await supabase
          .from('lesson_comments')
          .select(`
            id,
            comment,
            created_at,
            updated_at,
            user_id,
            lesson_id,
            parent_comment_id,
            user_email,
            user_name
          `)
          .eq('lesson_id', lessonId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Erro ao carregar comentários:', error);
          toast.error('Erro ao carregar comentários');
          return;
        }

        console.log('Comentários carregados:', commentsData);

        if (!commentsData) {
          setComments([]);
          return;
        }

        // Organizar comentários com informações de usuário
        const commentsWithUsers = commentsData.map(comment => ({
          ...comment,
          user_email: comment.user_email || studentEmail || '',
          user_name: comment.user_name || studentName || 'Usuário',
          replies: [] as Comment[]
        }));

        // Organizar estrutura de replies
        const topLevelComments: Comment[] = [];
        const commentMap: Record<string, Comment> = {};
        
        commentsWithUsers.forEach(comment => {
          commentMap[comment.id] = comment;
          if (!comment.parent_comment_id) {
            topLevelComments.push(comment);
          }
        });
        
        commentsWithUsers.forEach(comment => {
          if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
            if (!commentMap[comment.parent_comment_id].replies) {
              commentMap[comment.parent_comment_id].replies = [];
            }
            commentMap[comment.parent_comment_id].replies!.push(comment);
          }
        });
        
        setComments(topLevelComments);
      } catch (error) {
        console.error('Erro inesperado ao carregar comentários:', error);
        toast.error('Erro ao carregar comentários');
      } finally {
        setIsLoading(false);
      }
    };
    loadComments();
  }, [lessonId, studentEmail, studentName]);

  const handleSubmitComment = async (parentCommentId?: string) => {
    const commentText = parentCommentId ? replyText : newComment;
    
    if (!commentText.trim()) {
      toast.error('Digite um comentário válido');
      return;
    }
    
    if (!studentEmail || !studentName) {
      toast.error('Erro de autenticação. Tente fazer login novamente.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Usar a edge function para adicionar comentário
      const { data, error } = await supabase.functions.invoke('add-member-area-comment', {
        body: {
          lessonId: lessonId,
          comment: commentText.trim(),
          studentEmail: studentEmail,
          studentName: studentName,
          parentCommentId: parentCommentId || null
        }
      });
        
      if (error) {
        console.error('Erro ao adicionar comentário via edge function:', error);
        toast.error('Erro ao adicionar comentário');
        return;
      }

      // Recarregar comentários após adicionar
      window.location.reload();
    } catch (error) {
      console.error('Erro inesperado ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setIsSubmitting(false);
      if (parentCommentId) {
        setReplyingTo(null);
        setReplyText('');
      } else {
        setNewComment('');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM 'às' HH:mm", {
      locale: ptBR
    });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name !== 'Usuário' && name !== 'Estudante') {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'AN';
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <motion.div 
      key={comment.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 ${isReply ? 'ml-8 mt-2' : ''}`}
    >
      <Avatar className="h-10 w-10 ring-2 ring-gray-700">
        <AvatarFallback className="bg-emerald-600 text-white text-sm">
          {getInitials(comment.user_name, comment.user_email)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">
                {comment.user_name || 'Usuário'}
              </p>
              <p className="text-xs text-emerald-400">
                {comment.user_email}
              </p>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {formatDate(comment.created_at)}
            </p>
          </div>
        </div>
        
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {comment.comment}
        </p>
        
        {!isReply && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-xs text-emerald-400 hover:text-emerald-300 h-7 px-2"
            >
              {replyingTo === comment.id ? 'Cancelar' : 'Responder'}
            </Button>
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
                {isSubmitting ? 'Enviando...' : 'Responder'}
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
    </motion.div>
  );

  return (
    <Card className="mt-6 bg-zinc-950 border-0">
      <CardHeader className="bg-zinc-950">
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageCircle className="h-5 w-5" />
          Comentários ({comments.reduce((count, comment) => count + 1 + (comment.replies?.length || 0), 0)})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 bg-zinc-950">
        {/* Formulário para novo comentário */}
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

        {/* Lista de comentários */}
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
            <AnimatePresence>
              {comments.map(comment => renderComment(comment))}
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  );
}