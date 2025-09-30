import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ContinueWatchingProps {
  memberAreaId: string;
  studentEmail: string;
}

interface LastLesson {
  id: string;
  title: string;
  progress_percentage: number;
  video_current_time: number;
  duration: number;
  module_id: string;
  last_watched_at: string;
}

export function ContinueWatching({ memberAreaId, studentEmail }: ContinueWatchingProps) {
  const [lastLesson, setLastLesson] = useState<LastLesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLastWatchedLesson();
  }, [memberAreaId, studentEmail]);

  const loadLastWatchedLesson = async () => {
    try {
      setIsLoading(true);
      
      // Primeiro buscar user_id do email se existir
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      // Buscar o progresso mais recente - tentar primeiro com user_id, depois com join de sessions
      let progressQuery = supabase
        .from('lesson_progress')
        .select(`
          lesson_id,
          progress_percentage,
          video_current_time,
          last_watched_at,
          lessons!inner (
            id,
            title,
            duration,
            module_id,
            member_area_id
          )
        `)
        .eq('lessons.member_area_id', memberAreaId)
        .gt('progress_percentage', 0)
        .lt('progress_percentage', 100)
        .order('last_watched_at', { ascending: false })
        .limit(1);

      // Se temos userId, buscar por ele, senão buscar via email nas sessions ativas
      if (userId) {
        progressQuery = progressQuery.eq('user_id', userId);
      }

      const { data: progressData, error: progressError } = await progressQuery.maybeSingle();

      if (progressError || !progressData) {
        setLastLesson(null);
        return;
      }

      const lesson = progressData.lessons as any;
      
      setLastLesson({
        id: lesson.id,
        title: lesson.title,
        progress_percentage: progressData.progress_percentage,
        video_current_time: progressData.video_current_time || 0,
        duration: lesson.duration || 0,
        module_id: lesson.module_id,
        last_watched_at: progressData.last_watched_at
      });
    } catch (error) {
      console.error('Erro ao carregar última aula:', error);
      setLastLesson(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWatching = () => {
    if (lastLesson) {
      navigate(`/member-areas/${memberAreaId}/lessons/${lastLesson.id}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return null;
  }

  if (!lastLesson) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Play className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Continuar Vendo
            </h3>
            <p className="text-sm text-muted-foreground truncate mb-3">
              {lastLesson.title}
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {formatTime(lastLesson.video_current_time)} / {formatTime(lastLesson.duration)}
                </span>
              </div>
              
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all duration-300"
                  style={{ width: `${lastLesson.progress_percentage}%` }}
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                {lastLesson.progress_percentage}% concluído
              </p>
            </div>
            
            <Button 
              onClick={handleContinueWatching}
              className="w-full sm:w-auto"
            >
              <Play className="h-4 w-4 mr-2" />
              Continuar de onde parei
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
