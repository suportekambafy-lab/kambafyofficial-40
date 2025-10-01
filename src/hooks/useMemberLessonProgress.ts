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

// Hook específico para áreas de membros com autenticação regular
export const useMemberLessonProgress = (memberAreaId: string, userEmail?: string) => {
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [comments, setComments] = useState<Record<string, LessonComment[]>>({});
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  console.log('🔧 useMemberLessonProgress initialized:', {
    memberAreaId,
    userEmail
  });

  // Para áreas de membros, vamos usar localStorage por usuário
  const getStorageKey = (lessonId: string) => `lesson_progress_${memberAreaId}_${userEmail}_${lessonId}`;
  const getCourseStorageKey = () => `course_progress_${memberAreaId}_${userEmail}`;

  // Load lesson progress from Supabase database
  const loadLessonProgress = async () => {
    console.log('🔄 loadLessonProgress called for member area:', { memberAreaId, userEmail });
    
    if (!memberAreaId || !userEmail) {
      console.log('❌ No memberAreaId or userEmail provided');
      return;
    }

    try {
      setIsLoadingProgress(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try to load from Supabase using user_id OR user_email
      let progressData = null;
      let error = null;

      if (user) {
        console.log('✅ User authenticated, loading from Supabase by user_id');
        const result = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('member_area_id', memberAreaId);
        
        progressData = result.data;
        error = result.error;
      } else if (userEmail) {
        console.log('✅ Loading from Supabase by user_email:', userEmail);
        const result = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_email', userEmail)
          .eq('member_area_id', memberAreaId);
        
        progressData = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error loading progress from Supabase:', error);
      } else if (progressData && progressData.length > 0) {
        // Transform array to object keyed by lesson_id
        const progressMap: Record<string, LessonProgress> = {};
        progressData.forEach(progress => {
          progressMap[progress.lesson_id] = progress;
        });

        setLessonProgress(progressMap);
        
        // Also save to localStorage as cache
        localStorage.setItem(getCourseStorageKey(), JSON.stringify(progressMap));
        
        console.log('✅ Progresso carregado do Supabase:', {
          count: Object.keys(progressMap).length,
          data: progressMap
        });
        return;
      }
      
      // Fallback to localStorage if no data from Supabase
      console.log('📦 No data from Supabase, loading from localStorage');
      const cached = localStorage.getItem(getCourseStorageKey());
      if (cached) {
        try {
          const progressMap = JSON.parse(cached);
          setLessonProgress(progressMap);
          console.log('✅ Progresso carregado do localStorage:', Object.keys(progressMap).length);
        } catch (e) {
          console.error('Error parsing cached progress:', e);
        }
      }
    } catch (error) {
      console.error('Error loading lesson progress:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  // Save lesson progress to Supabase database
  const updateLessonProgress = async (lessonId: string, progressData: Partial<LessonProgress & { video_current_time?: number }>) => {
    console.log('💾 updateLessonProgress called:', { lessonId, progressData });

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const progressRecord = {
        lesson_id: lessonId,
        user_id: user?.id || 'anonymous',
        user_email: userEmail || null,
        member_area_id: memberAreaId,
        progress_percentage: progressData.progress_percentage || lessonProgress[lessonId]?.progress_percentage || 0,
        completed: progressData.completed !== undefined ? progressData.completed : lessonProgress[lessonId]?.completed || false,
        rating: progressData.rating !== undefined ? progressData.rating : lessonProgress[lessonId]?.rating,
        video_current_time: progressData.video_current_time || lessonProgress[lessonId]?.video_current_time || 0,
        last_watched_at: new Date().toISOString()
      };

      // Update local state immediately
      const updatedProgress = {
        ...lessonProgress,
        [lessonId]: progressRecord
      };
      setLessonProgress(updatedProgress);
      
      // Always save to localStorage
      localStorage.setItem(getCourseStorageKey(), JSON.stringify(updatedProgress));

      // Try to save to Supabase if user is authenticated OR we have userEmail
      if (user || userEmail) {
        const { error } = await supabase
          .from('lesson_progress')
          .upsert(progressRecord, {
            onConflict: user ? 'user_id,lesson_id,member_area_id' : 'user_email,lesson_id,member_area_id'
          });

        if (error) {
          console.error('Error saving progress to Supabase:', error);
        } else {
          console.log('✅ Progresso salvo no Supabase:', lessonId);
        }
      } else {
        console.log('📦 Progresso salvo apenas no localStorage (sem auth ou email)');
      }
    } catch (error) {
      console.error('Error updating lesson progress:', error);
    }
  };

  // Update video progress with throttling
  const updateVideoProgress = async (lessonId: string, currentTime: number, duration: number) => {
    if (!duration || duration === 0) return;

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

    // Save to localStorage (throttled)
    const now = Date.now();
    const lastUpdateKey = `last_update_${lessonId}`;
    const lastUpdate = parseInt(localStorage.getItem(lastUpdateKey) || '0');
    
    if (now - lastUpdate > 5000) { // Save every 5 seconds
      localStorage.setItem(lastUpdateKey, now.toString());
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

  // Load comments (simplified for member area)
  const loadComments = async (lessonId: string) => {
    console.log('💬 loadComments called for:', lessonId);
    // For member areas, we'll use a simplified comment system
    const savedComments = localStorage.getItem(`comments_${memberAreaId}_${userEmail}_${lessonId}`);
    if (savedComments) {
      const commentsData = JSON.parse(savedComments);
      setComments(prev => ({ ...prev, [lessonId]: commentsData }));
    }
  };

  // Save comment (simplified for member area)
  const saveComment = async (lessonId: string, commentText: string) => {
    if (!commentText.trim()) return;

    const newComment: LessonComment = {
      id: Date.now().toString(),
      lesson_id: lessonId,
      user_id: 'member',
      comment: commentText.trim(),
      created_at: new Date().toISOString(),
      user_name: userEmail?.split('@')[0] || 'Estudante'
    };

    const updatedComments = [newComment, ...(comments[lessonId] || [])];
    setComments(prev => ({ ...prev, [lessonId]: updatedComments }));
    localStorage.setItem(`comments_${memberAreaId}_${userEmail}_${lessonId}`, JSON.stringify(updatedComments));

    toast.success('Comentário adicionado');
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
      userEmail
    });
    
    if (memberAreaId && userEmail) {
      loadLessonProgress();
    }
  }, [memberAreaId, userEmail]);

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