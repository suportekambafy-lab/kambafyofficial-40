import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LessonProgress {
  lesson_id: string;
  progress_percentage: number;
  completed: boolean;
  rating?: number;
  last_watched_at: string;
  video_current_time: number;
}

interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name: string;
}

// Hook específico para áreas de membros com autenticação baseada em email
export const useMemberLessonProgress = (memberAreaId: string, userEmail?: string) => {
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [comments, setComments] = useState<Record<string, LessonComment[]>>({});
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Normalizar email SEMPRE para garantir consistência entre navegadores
  const normalizedEmail = userEmail?.toLowerCase().trim();

  console.log('🔧 useMemberLessonProgress initialized:', {
    memberAreaId,
    userEmail,
    normalizedEmail,
    hasEmail: !!normalizedEmail,
    hasMemberAreaId: !!memberAreaId
  });

  // Load lesson progress from Supabase ONLY (no localStorage)
  const loadLessonProgress = async () => {
    console.log('🔄 loadLessonProgress called:', { memberAreaId, normalizedEmail });
    
    if (!memberAreaId || !normalizedEmail) {
      console.log('❌ No memberAreaId or normalizedEmail provided');
      return;
    }

    try {
      setIsLoadingProgress(true);
      
      // Load from Supabase using normalized email
      const { data: progressData, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_email', normalizedEmail)
        .eq('member_area_id', memberAreaId);

      if (error) {
        console.error('Error loading progress from Supabase:', error);
      } else if (progressData && progressData.length > 0) {
        // Transform array to object keyed by lesson_id
        const progressMap: Record<string, LessonProgress> = {};
        progressData.forEach(progress => {
          progressMap[progress.lesson_id] = progress;
        });

        setLessonProgress(progressMap);
        
        console.log('✅ Progresso carregado do Supabase:', {
          count: Object.keys(progressMap).length,
          data: progressMap
        });
      } else {
        console.log('📭 Nenhum progresso encontrado no Supabase');
        setLessonProgress({});
      }
    } catch (error) {
      console.error('Error loading lesson progress:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  // Save lesson progress to Supabase ONLY (no localStorage)
  const updateLessonProgress = async (lessonId: string, progressData: Partial<LessonProgress & { video_current_time?: number }>) => {
    if (!normalizedEmail) {
      console.log('❌ Não é possível salvar progresso sem email normalizado');
      return;
    }

    console.log('💾 updateLessonProgress called:', { lessonId, progressData, normalizedEmail, memberAreaId });

    try {
      const progressRecord = {
        lesson_id: lessonId,
        user_id: null, // NULL para membros não autenticados via auth tradicional
        user_email: normalizedEmail,
        member_area_id: memberAreaId,
        progress_percentage: progressData.progress_percentage || lessonProgress[lessonId]?.progress_percentage || 0,
        completed: progressData.completed !== undefined ? progressData.completed : lessonProgress[lessonId]?.completed || false,
        rating: progressData.rating !== undefined ? progressData.rating : lessonProgress[lessonId]?.rating,
        video_current_time: progressData.video_current_time || lessonProgress[lessonId]?.video_current_time || 0,
        last_watched_at: new Date().toISOString()
      };

      console.log('📤 Enviando para Supabase:', progressRecord);

      // Save to Supabase FIRST - usar nome da constraint
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(progressRecord, {
          onConflict: 'user_email,lesson_id,member_area_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Error saving progress to Supabase:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Erro ao salvar progresso: ${error.message}`);
        return;
      }

      console.log('✅ Progresso salvo no Supabase:', { lessonId, data });

      // Update local state AFTER successful save
      const updatedProgress = {
        ...lessonProgress,
        [lessonId]: progressRecord
      };
      setLessonProgress(updatedProgress);

    } catch (error: any) {
      console.error('❌ Exception updating lesson progress:', {
        error,
        message: error?.message,
        stack: error?.stack
      });
      toast.error(`Erro crítico ao salvar progresso: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  // Update video progress with throttling (uses sessionStorage only for throttle timing)
  const updateVideoProgress = async (lessonId: string, currentTime: number, duration: number) => {
    if (!normalizedEmail || !duration || duration === 0) return;

    const progressPercentage = Math.round((currentTime / duration) * 100);
    const isCompleted = progressPercentage >= 90;

    console.log('📹 updateVideoProgress:', {
      lessonId,
      currentTime,
      duration,
      progressPercentage,
      isCompleted
    });

    // Always update local state immediately for smooth UI
    setLessonProgress(prev => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        lesson_id: lessonId,
        progress_percentage: progressPercentage,
        completed: isCompleted,
        video_current_time: currentTime,
        last_watched_at: new Date().toISOString()
      }
    }));

    // Throttle Supabase saves using sessionStorage (per email)
    const now = Date.now();
    const storageKey = `video_progress_${lessonId}_${normalizedEmail}`;
    const lastUpdateStr = sessionStorage.getItem(storageKey);
    const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr, 10) : 0;
    
    if (now - lastUpdate > 10000) { // Save every 10 seconds
      sessionStorage.setItem(storageKey, now.toString());
      await updateLessonProgress(lessonId, {
        progress_percentage: progressPercentage,
        completed: isCompleted,
        video_current_time: currentTime
      });
    }
  };

  // Save rating
  const saveRating = async (lessonId: string, rating: number) => {
    await updateLessonProgress(lessonId, { rating });
    toast.success(`Avaliação salva: ${rating} estrelas`);
  };

  // Load comments from Supabase
  const loadComments = async (lessonId: string) => {
    if (!normalizedEmail) return;
    
    console.log('💬 loadComments called for:', lessonId);
    
    try {
      const { data, error } = await supabase
        .from('lesson_comments')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading comments:', error);
      } else if (data) {
        const formattedComments: LessonComment[] = data.map(comment => ({
          id: comment.id,
          lesson_id: comment.lesson_id,
          user_id: comment.user_id || 'member',
          comment: comment.comment,
          created_at: comment.created_at,
          user_name: comment.user_name || 'Estudante'
        }));
        
        setComments(prev => ({ ...prev, [lessonId]: formattedComments }));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // Save comment to Supabase
  const saveComment = async (lessonId: string, commentText: string) => {
    if (!normalizedEmail || !commentText.trim()) {
      console.log('Não é possível salvar comentário sem email ou texto');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('add-member-area-comment', {
        body: {
          lesson_id: lessonId,
          user_email: normalizedEmail,
          user_name: normalizedEmail.split('@')[0],
          comment: commentText.trim()
        }
      });

      if (error) {
        console.error('Error saving comment:', error);
        toast.error('Erro ao salvar comentário');
      } else {
        toast.success('Comentário adicionado');
        // Reload comments after saving
        await loadComments(lessonId);
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Erro ao salvar comentário');
    }
  };

  // Calculate course progress
  const getCourseProgress = (totalLessons: number) => {
    const completedLessons = Object.values(lessonProgress).filter(p => p.completed).length;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    console.log('📊 getCourseProgress:', {
      totalLessons,
      completedLessons,
      progress,
      lessonProgressKeys: Object.keys(lessonProgress),
      hasProgress: Object.keys(lessonProgress).length > 0
    });
    return progress;
  };

  // Calculate module progress
  const getModuleProgress = (moduleId: string, lessons: any[]) => {
    const moduleLessons = lessons.filter(lesson => lesson.module_id === moduleId);
    if (moduleLessons.length === 0) return 0;
    
    const completedCount = moduleLessons.filter(lesson => lessonProgress[lesson.id]?.completed).length;
    const progress = Math.round((completedCount / moduleLessons.length) * 100);
    
    console.log('📈 getModuleProgress for', moduleId, ':', {
      moduleLessons: moduleLessons.length,
      completed: completedCount,
      progress,
      hasLessonProgress: Object.keys(lessonProgress).length > 0
    });
    
    return progress;
  };

  // Get detailed module statistics
  const getModuleStats = (moduleId: string, lessons: any[]) => {
    const moduleLessons = lessons.filter(lesson => lesson.module_id === moduleId);
    const completedLessons = moduleLessons.filter(lesson => lessonProgress[lesson.id]?.completed).length;
    const inProgressLessons = moduleLessons.filter(lesson => {
      const progress = lessonProgress[lesson.id];
      return progress && progress.progress_percentage > 0 && !progress.completed;
    }).length;
    
    const stats = {
      total: moduleLessons.length,
      completed: completedLessons,
      inProgress: inProgressLessons,
      remaining: moduleLessons.length - completedLessons - inProgressLessons,
      progress: moduleLessons.length > 0 ? Math.round((completedLessons / moduleLessons.length) * 100) : 0
    };
    
    console.log('📈 getModuleStats for', moduleId, ':', stats);
    return stats;
  };

  useEffect(() => {
    console.log('🔄 useMemberLessonProgress useEffect triggered:', {
      memberAreaId,
      normalizedEmail,
      hasEmail: !!normalizedEmail,
      hasMemberAreaId: !!memberAreaId,
      willLoad: !!(memberAreaId && normalizedEmail)
    });
    
    if (memberAreaId && normalizedEmail) {
      console.log('✅ Carregando progresso...');
      loadLessonProgress();
    } else {
      console.warn('❌ NÃO carregando progresso - falta:', {
        missingEmail: !normalizedEmail,
        missingMemberAreaId: !memberAreaId
      });
    }
  }, [memberAreaId, normalizedEmail]);

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