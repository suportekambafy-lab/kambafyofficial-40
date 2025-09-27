
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
  video_current_time: number; // Posição onde parou no vídeo (em segundos)
}

interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name: string;
}

export const useLessonProgress = (memberAreaId: string, studentEmail?: string) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [comments, setComments] = useState<Record<string, LessonComment[]>>({});
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Load lesson progress - funciona tanto com user autenticado quanto com sessão de member area
  const loadLessonProgress = async () => {
    if (!memberAreaId) return;
    
    // Usar user_id se autenticado, ou buscar por email da sessão de member area
    const userId = user?.id;
    const email = studentEmail;
    
    if (!userId && !email) {
      console.log('Nenhum user_id ou email disponível para carregar progresso');
      return;
    }

    try {
      setIsLoadingProgress(true);
      
      let query = supabase
        .from('lesson_progress')
        .select('*')
        .eq('member_area_id', memberAreaId);
        
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (email) {
        // Para sessões de member area, usar uma query personalizada se necessário
        // Por agora, vamos assumir que temos user_id via sessão
        console.log('Usando email para carregar progresso:', email);
        return; // Implementar lógica para buscar por sessão se necessário
      }

      const { data, error } = await query;

      if (error) throw error;

      const progressMap: Record<string, LessonProgress> = {};
      data?.forEach((progress: any) => {
        progressMap[progress.lesson_id] = {
          lesson_id: progress.lesson_id,
          progress_percentage: progress.progress_percentage,
          completed: progress.completed,
          rating: progress.rating,
          last_watched_at: progress.last_watched_at,
          video_current_time: progress.video_current_time || 0
        };
      });
      setLessonProgress(progressMap);
      console.log('✅ Progresso das aulas carregado:', Object.keys(progressMap).length, 'aulas');
    } catch (error) {
      console.error('Error loading lesson progress:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  // Save lesson progress with proper conflict resolution
  const updateLessonProgress = async (lessonId: string, progressData: Partial<LessonProgress & { video_current_time?: number }>) => {
    if (!user) {
      console.log('Não é possível salvar progresso sem usuário autenticado');
      return;
    }

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
          video_current_time: progressData.video_current_time || 0,
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
          video_current_time: progressData.video_current_time || prev[lessonId]?.video_current_time || 0,
          last_watched_at: new Date().toISOString()
        }
      }));

      console.log('✅ Progresso salvo:', lessonId, {
        progress: progressData.progress_percentage,
        completed: progressData.completed,
        currentTime: progressData.video_current_time
      });
    } catch (error) {
      console.error('Error updating lesson progress:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o progresso",
        variant: "destructive"
      });
    }
  };

  // Função específica para salvar progresso do vídeo (chamada frequentemente)
  const updateVideoProgress = async (lessonId: string, currentTime: number, duration: number) => {
    if (!user || !duration || duration === 0) return;

    const progressPercentage = Math.round((currentTime / duration) * 100);
    const isCompleted = progressPercentage >= 90; // Considera completo quando assiste 90% ou mais

    // Salvar no banco apenas a cada 10 segundos para evitar spam
    const now = Date.now();
    const lastUpdate = lessonProgress[lessonId]?.last_watched_at 
      ? new Date(lessonProgress[lessonId].last_watched_at).getTime() 
      : 0;
    
    if (now - lastUpdate < 10000) { // 10 segundos
      // Apenas atualizar estado local
      setLessonProgress(prev => ({
        ...prev,
        [lessonId]: {
          ...prev[lessonId],
          lesson_id: lessonId,
          progress_percentage: progressPercentage,
          completed: isCompleted,
          video_current_time: currentTime,
          last_watched_at: prev[lessonId]?.last_watched_at || new Date().toISOString()
        }
      }));
      return;
    }

    // Salvar no banco de dados
    await updateLessonProgress(lessonId, {
      progress_percentage: progressPercentage,
      completed: isCompleted,
      video_current_time: currentTime
    });
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

  // Calculate module progress based on completed lessons in that module
  const getModuleProgress = (moduleId: string, lessons: any[]) => {
    const moduleLessons = lessons.filter(lesson => lesson.module_id === moduleId);
    if (moduleLessons.length === 0) return 0;
    
    const completed = moduleLessons.filter(lesson => lessonProgress[lesson.id]?.completed).length;
    return Math.round((completed / moduleLessons.length) * 100);
  };

  // Get detailed module statistics
  const getModuleStats = (moduleId: string, lessons: any[]) => {
    const moduleLessons = lessons.filter(lesson => lesson.module_id === moduleId);
    const completedLessons = moduleLessons.filter(lesson => lessonProgress[lesson.id]?.completed).length;
    const inProgressLessons = moduleLessons.filter(lesson => {
      const progress = lessonProgress[lesson.id];
      return progress && progress.progress_percentage > 0 && !progress.completed;
    }).length;
    
    return {
      total: moduleLessons.length,
      completed: completedLessons,
      inProgress: inProgressLessons,
      remaining: moduleLessons.length - completedLessons - inProgressLessons,
      progress: moduleLessons.length > 0 ? Math.round((completedLessons / moduleLessons.length) * 100) : 0
    };
  };

  useEffect(() => {
    if (memberAreaId) {
      loadLessonProgress();
    }
  }, [memberAreaId, user, studentEmail]);

  return {
    lessonProgress,
    comments,
    isLoadingProgress,
    updateLessonProgress,
    updateVideoProgress,
    saveRating,
    loadComments,
    saveComment,
    getCourseProgress,
    getModuleProgress,
    getModuleStats
  };
};
