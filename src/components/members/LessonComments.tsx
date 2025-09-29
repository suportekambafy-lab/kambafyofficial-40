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
  user?: {
    full_name?: string;
    email?: string;
  };
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar comentários
  useEffect(() => {
    if (!lessonId) return;
    const loadComments = async () => {
      try {
        setIsLoading(true);
        const {
          data,
          error
        } = await supabase.from('lesson_comments').select(`
            id,
            comment,
            created_at,
            updated_at,
            user_id,
            lesson_id
          `).eq('lesson_id', lessonId).order('created_at', {
          ascending: true
        });
        if (error) {
          console.error('Erro ao carregar comentários:', error);
          toast.error('Erro ao carregar comentários');
          return;
        }
        setComments(data || []);
      } catch (error) {
        console.error('Erro inesperado ao carregar comentários:', error);
        toast.error('Erro ao carregar comentários');
      } finally {
        setIsLoading(false);
      }
    };
    loadComments();
  }, [lessonId]);
  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('Digite um comentário válido');
      return;
    }
    
    if (!studentEmail || !studentName) {
      toast.error('Erro de autenticação. Tente fazer login novamente.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Usar uma abordagem que funciona com a sessão customizada da área de membros
      const { data, error } = await supabase.functions.invoke('add-member-area-comment', {
        body: {
          lessonId,
          comment: newComment.trim(),
          studentEmail,
          studentName
        }
      });
        
      if (error) {
        console.error('Erro ao adicionar comentário:', error);
        toast.error('Erro ao adicionar comentário');
        return;
      }

      // Adicionar comentário localmente
      const newCommentData = {
        id: data.id || Date.now().toString(),
        comment: newComment.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: data.user_id || 'student',
        lesson_id: lessonId,
        user: {
          full_name: studentName,
          email: studentEmail
        }
      };
      
      setComments(prev => [...prev, newCommentData]);
      setNewComment('');
      toast.success('Comentário adicionado com sucesso!');
    } catch (error) {
      console.error('Erro inesperado ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setIsSubmitting(false);
    }
  };
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM 'às' HH:mm", {
      locale: ptBR
    });
  };
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'AN';
  };
  return <Card className="mt-6 bg-zinc-950 border-0">
      <CardHeader className="bg-zinc-950">
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageCircle className="h-5 w-5" />
          Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 bg-zinc-950">
        {/* Formulário para novo comentário */}
        <div className="space-y-3">
          <Textarea placeholder="Deixe seu comentário sobre esta aula..." value={newComment} onChange={e => setNewComment(e.target.value)} rows={3} className="border-gray-700 text-white placeholder-gray-400 resize-none bg-zinc-950" />
          <div className="flex justify-end">
            <Button onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </> : <>
                  <Send className="h-4 w-4 mr-2" />
                  Comentar
                </>}
            </Button>
          </div>
        </div>

        {/* Lista de comentários */}
        <div className="space-y-4">
          {isLoading ? <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Carregando comentários...</p>
            </div> : comments.length === 0 ? <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Seja o primeiro a comentar nesta aula!</p>
            </div> : <AnimatePresence>
              {comments.map((comment, index) => <motion.div key={comment.id} initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -20
          }} transition={{
            delay: index * 0.1
          }} className="flex gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <Avatar className="h-10 w-10 ring-2 ring-gray-700">
                    <AvatarImage src="" alt={comment.user?.full_name || studentName} />
                    <AvatarFallback className="bg-emerald-600 text-white text-sm">
                      {getInitials(comment.user?.full_name || studentName, comment.user?.email || studentEmail)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">
                          {comment.user?.full_name || studentName || 'Estudante'}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                </motion.div>)}
            </AnimatePresence>}
        </div>
      </CardContent>
    </Card>;
}