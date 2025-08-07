
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LessonProgress {
  lesson_id: string;
  progress_percentage: number;
  completed: boolean;
  rating?: number;
  last_watched_at: string;
}

interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name: string;
}

export const useLessonProgress = (memberAreaId: string) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [comments, setComments] = useState<Record<string, LessonComment[]>>({});

  // Load lesson progress
  const loadLessonProgress = async () => {
    if (!user || !memberAreaId) return;

    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('member_area_id', memberAreaId);

      if (error) throw error;

      const progressMap: Record<string, LessonProgress> = {};
      data?.forEach((progress: any) => {
        progressMap[progress.lesson_id] = {
          lesson_id: progress.lesson_id,
          progress_percentage: progress.progress_percentage,
          completed: progress.completed,
          rating: progress.rating,
          last_watched_at: progress.last_watched_at
        };
      });
      setLessonProgress(progressMap);
    } catch (error) {
      console.error('Error loading lesson progress:', error);
    }
  };

  // Save lesson progress with proper conflict resolution
  const updateLessonProgress = async (lessonId: string, progressData: Partial<LessonProgress>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          member_area_id: memberAreaId,
          lesson_id: lessonId,
          progress_percentage: progressData.progress_percentage || 0,
          completed: progressData.completed || false,
          rating: progressData.rating,
          last_watched_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lesson_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Update local state only after successful database update
      setLessonProgress(prev => ({
        ...prev,
        [lessonId]: {
          ...prev[lessonId],
          lesson_id: lessonId,
          progress_percentage: progressData.progress_percentage || prev[lessonId]?.progress_percentage || 0,
          completed: progressData.completed !== undefined ? progressData.completed : prev[lessonId]?.completed || false,
          rating: progressData.rating !== undefined ? progressData.rating : prev[lessonId]?.rating,
          last_watched_at: new Date().toISOString()
        }
      }));

      console.log('Progress updated successfully for lesson:', lessonId, progressData);
    } catch (error) {
      console.error('Error updating lesson progress:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o progresso",
        variant: "destructive"
      });
    }
  };

  // Save rating
  const saveRating = async (lessonId: string, rating: number) => {
    await updateLessonProgress(lessonId, { rating });
    toast({
      title: "Avaliação salva",
      description: `Você avaliou esta aula com ${rating} estrelas`,
    });
  };

  // Load comments - simplified approach
  const loadComments = async (lessonId: string) => {
    try {
      console.log('Loading comments for lesson:', lessonId);
      const { data, error } = await supabase
        .from('lesson_comments')
        .select(`
          *,
          profiles(full_name)
        `)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading comments:', error);
        throw error;
      }

      console.log('Comments loaded:', data);

      const formattedComments: LessonComment[] = (data as any)?.map((comment: any) => ({
        id: comment.id,
        lesson_id: comment.lesson_id,
        user_id: comment.user_id,
        comment: comment.comment,
        created_at: comment.created_at,
        user_name: comment.profiles?.full_name || 'Usuário Anônimo'
      })) || [];

      setComments(prev => ({
        ...prev,
        [lessonId]: formattedComments
      }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // Save comment - with better authentication check
  const saveComment = async (lessonId: string, commentText: string) => {
    console.log('SaveComment called with:', { lessonId, commentText, user: !!user, session: !!session });
    
    if (!session || !user) {
      console.log('No session or user found');
      toast({
        title: "Erro",
        description: "Você precisa estar logado para comentar",
        variant: "destructive"
      });
      return;
    }

    if (!commentText.trim()) {
      console.log('Empty comment text');
      return;
    }

    console.log('Attempting to save comment:', { lessonId, userId: user.id, comment: commentText.trim() });

    try {
      // Insert the comment
      const { data: commentData, error: commentError } = await supabase
        .from('lesson_comments')
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          comment: commentText.trim()
        })
        .select()
        .single();

      if (commentError) {
        console.error('Error inserting comment:', commentError);
        throw commentError;
      }

      console.log('Comment inserted successfully:', commentData);

      // Get the user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const newComment: LessonComment = {
        id: commentData.id,
        lesson_id: commentData.lesson_id,
        user_id: commentData.user_id,
        comment: commentData.comment,
        created_at: commentData.created_at,
        user_name: profileData?.full_name || 'Usuário Anônimo'
      };

      setComments(prev => ({
        ...prev,
        [lessonId]: [newComment, ...(prev[lessonId] || [])]
      }));

      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi salvo com sucesso",
      });

      console.log('Comment saved successfully:', newComment);
    } catch (error: any) {
      console.error('Error saving comment - full error:', error);
      
      let errorMessage = "Não foi possível salvar o comentário";
      
      if (error.message?.includes('permission') || error.message?.includes('policy')) {
        errorMessage = "Erro de permissão. Tente fazer login novamente";
      } else if (error.code === '23503') {
        errorMessage = "Erro de referência na base de dados";
      } else if (error.code === '42501') {
        errorMessage = "Acesso negado. Verifique suas permissões";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Calculate course progress
  const getCourseProgress = (totalLessons: number) => {
    const completedLessons = Object.values(lessonProgress).filter(p => p.completed).length;
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  };

  useEffect(() => {
    if (memberAreaId) {
      loadLessonProgress();
    }
  }, [memberAreaId, user]);

  return {
    lessonProgress,
    comments,
    updateLessonProgress,
    saveRating,
    loadComments,
    saveComment,
    getCourseProgress
  };
};
