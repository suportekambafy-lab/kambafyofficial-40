import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Send, Clock, Trash2, CheckSquare, Square, BadgeCheck } from 'lucide-react';
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
  avatar_url?: string | null;
  is_owner?: boolean;
}

interface LessonCommentsProps {
  lessonId: string;
  studentEmail?: string;
  studentName?: string;
  memberAreaId?: string;
}

export function LessonComments({
  lessonId,
  studentEmail,
  studentName,
  memberAreaId
}: LessonCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAreaOwner, setIsAreaOwner] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      
      // Primeiro buscar o email do dono da área
      let ownerEmailLocal = ownerEmail;
      if (!ownerEmailLocal && memberAreaId) {
        const { data: memberArea } = await supabase
          .from('member_areas')
          .select('user_id')
          .eq('id', memberAreaId)
          .single();
        
        if (memberArea?.user_id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', memberArea.user_id)
            .single();
          
          if (ownerProfile?.email) {
            ownerEmailLocal = ownerProfile.email.toLowerCase().trim();
            setOwnerEmail(ownerEmailLocal);
          }
        }
      }
      
      const { data, error } = await supabase
        .from('lesson_comments')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar comentários:', error);
        return;
      }

      // Buscar avatares dos usuários baseados nos emails únicos
      const uniqueEmails = [...new Set(data?.map(c => c.user_email?.toLowerCase().trim()).filter(Boolean))];
      let avatarMap: Record<string, string> = {};
      
      if (uniqueEmails.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('email, avatar_url')
          .in('email', uniqueEmails);
        
        profiles?.forEach(profile => {
          if (profile.email && profile.avatar_url) {
            avatarMap[profile.email.toLowerCase().trim()] = profile.avatar_url;
          }
        });
      }

      // Organizar comentários em estrutura hierárquica
      const topLevelComments: Comment[] = [];
      const commentMap: Record<string, Comment> = {};

      // Primeiro, criar o mapa de comentários com avatares e verificar se é dono
      data?.forEach(comment => {
        const email = comment.user_email?.toLowerCase().trim();
        const isOwnerComment = email && ownerEmailLocal && email === ownerEmailLocal;
        commentMap[comment.id] = { 
          ...comment, 
          replies: [],
          avatar_url: email ? avatarMap[email] || null : null,
          is_owner: isOwnerComment
        };
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

  // Verificar se o usuário atual é o dono da área de membros e se comentários estão habilitados
  useEffect(() => {
    const checkAreaOwner = async () => {
      if (!memberAreaId) {
        console.log('[LessonComments] No memberAreaId provided');
        return;
      }
      
      console.log('[LessonComments] Checking member area:', memberAreaId);

      // Buscar configuração da área de membros e o perfil do dono
      const { data: memberArea, error } = await supabase
        .from('member_areas')
        .select('user_id, comments_enabled')
        .eq('id', memberAreaId)
        .single();

      console.log('[LessonComments] Member area data:', memberArea);
      console.log('[LessonComments] Error:', error);

      if (memberArea) {
        const enabled = memberArea.comments_enabled ?? true;
        console.log('[LessonComments] Comments enabled:', enabled);
        setCommentsEnabled(enabled);

        // Buscar o email do dono da área
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', memberArea.user_id)
          .single();

        console.log('[LessonComments] Owner profile:', ownerProfile);
        console.log('[LessonComments] Student email:', studentEmail);

        // Verificar se é o dono via autenticação OU via email de estudante
        const { data: { user } } = await supabase.auth.getUser();
        const isOwnerByAuth = user && memberArea.user_id === user.id;
        const isOwnerByEmail = studentEmail && ownerProfile?.email && 
          studentEmail.toLowerCase().trim() === ownerProfile.email.toLowerCase().trim();

        if (isOwnerByAuth || isOwnerByEmail) {
          console.log('[LessonComments] User is area owner!');
          setIsAreaOwner(true);
        }
      }
    };

    checkAreaOwner();
  }, [memberAreaId, studentEmail]);

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
    if (!confirm('Tem certeza que deseja apagar este comentário?')) {
      return;
    }

    setDeletingCommentId(commentId);
    try {
      const { error } = await supabase
        .from('lesson_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Erro ao apagar comentário:', error);
        toast.error('Erro ao apagar comentário');
        return;
      }

      // Remover da seleção se estava selecionado
      if (selectedComments.has(commentId)) {
        const newSelected = new Set(selectedComments);
        newSelected.delete(commentId);
        setSelectedComments(newSelected);
      }

      // Recarregar comentários
      await loadComments();
      toast.success('Comentário apagado com sucesso!');
    } catch (error) {
      console.error('Erro ao apagar comentário:', error);
      toast.error('Erro ao apagar comentário');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedComments.size === 0) return;

    if (!confirm(`Tem certeza que deseja apagar ${selectedComments.size} comentário(s)?`)) {
      return;
    }

    setIsDeletingMultiple(true);
    try {
      const { error } = await supabase
        .from('lesson_comments')
        .delete()
        .in('id', Array.from(selectedComments));

      if (error) {
        console.error('Erro ao apagar comentários:', error);
        toast.error('Erro ao apagar comentários');
        return;
      }

      setSelectedComments(new Set());
      await loadComments();
      toast.success(`${selectedComments.size} comentário(s) apagado(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao apagar comentários:', error);
      toast.error('Erro ao apagar comentários');
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  const toggleCommentSelection = (commentId: string) => {
    const newSelected = new Set(selectedComments);
    if (newSelected.has(commentId)) {
      newSelected.delete(commentId);
    } else {
      newSelected.add(commentId);
    }
    setSelectedComments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedComments.size === getAllCommentIds().length) {
      setSelectedComments(new Set());
    } else {
      setSelectedComments(new Set(getAllCommentIds()));
    }
  };

  const getAllCommentIds = (): string[] => {
    const ids: string[] = [];
    const collectIds = (commentList: Comment[]) => {
      commentList.forEach(comment => {
        ids.push(comment.id);
        if (comment.replies && comment.replies.length > 0) {
          collectIds(comment.replies);
        }
      });
    };
    collectIds(comments);
    return ids;
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

  const getInitials = (name: string) => {
    if (name && name !== 'Usuário' && name.length > 0) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'US';
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 ${isReply ? 'ml-4 sm:ml-8 mt-2' : ''} ${selectedComments.has(comment.id) ? 'ring-2 ring-emerald-500' : ''}`}>
      <div className="flex gap-2 sm:gap-3">
        {isAreaOwner && (
          <div className="flex-shrink-0 pt-1">
            <Checkbox
              checked={selectedComments.has(comment.id)}
              onCheckedChange={() => toggleCommentSelection(comment.id)}
              className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
            />
          </div>
        )}
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-gray-700 flex-shrink-0">
          {comment.avatar_url && (
            <AvatarImage src={comment.avatar_url} alt={comment.user_name} />
          )}
          <AvatarFallback className="bg-emerald-600 text-white text-xs sm:text-sm">
            {getInitials(comment.user_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-white text-sm truncate">{comment.user_name || 'Usuário'}</p>
            {comment.is_owner && (
              <span title="Professor verificado" className="flex-shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-label="Verificado">
                  <circle cx="12" cy="12" r="10" fill="#1D9BF0" />
                  <path d="M9.5 12.5L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </span>
            )}
          </div>
          
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{formatDate(comment.created_at)}</span>
          </p>
          
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">{comment.comment}</p>
          
          <div className="flex gap-2 mt-2">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-xs text-emerald-400 hover:text-emerald-300 h-7 px-2"
              >
                {replyingTo === comment.id ? 'Cancelar' : 'Responder'}
              </Button>
            )}
            
            {isAreaOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteComment(comment.id)}
                disabled={deletingCommentId === comment.id}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
              >
                {deletingCommentId === comment.id ? (
                  <>
                    <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin mr-1" />
                    Apagando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Apagar
                  </>
                )}
              </Button>
            )}
          </div>
          
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Digite sua resposta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="border-gray-700 text-white placeholder-gray-400 resize-none bg-zinc-900 text-sm w-full"
              />
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="text-xs w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleSubmitComment(comment.id)}
                  disabled={!replyText.trim() || isSubmitting}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full sm:w-auto"
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

  // Se comentários estão desabilitados, mostrar mensagem
  if (!commentsEnabled) {
    return (
      <Card className="mt-6 bg-zinc-950 border-0 mx-0 sm:mx-0">
        <CardContent className="py-8">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-base font-medium">Comentários desativados</p>
            <p className="text-gray-500 text-sm mt-2">O instrutor desativou os comentários para esta área de membros</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 bg-zinc-950 border-0 mx-0 sm:mx-0">
      <CardHeader className="px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">Comentários ({comments.reduce((count, comment) => count + 1 + (comment.replies?.length || 0), 0)})</span>
          </CardTitle>
          
          {isAreaOwner && comments.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs text-gray-400 hover:text-white"
              >
                {selectedComments.size === getAllCommentIds().length ? (
                  <>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Desselecionar Todos
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-1" />
                    Selecionar Todos
                  </>
                )}
              </Button>
              
              {selectedComments.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteMultiple}
                  disabled={isDeletingMultiple}
                  className="text-xs"
                >
                  {isDeletingMultiple ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      Apagando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Apagar ({selectedComments.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-3 sm:px-6">
        <div className="space-y-3">
          <Textarea 
            placeholder="Deixe seu comentário sobre esta aula..." 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)} 
            rows={3} 
            className="border-gray-700 text-sm sm:text-base text-white placeholder-gray-400 resize-none bg-zinc-950 w-full" 
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => handleSubmitComment()} 
              disabled={!newComment.trim() || isSubmitting} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto text-sm"
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