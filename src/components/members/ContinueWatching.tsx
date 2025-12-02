import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ContinueWatchingProps {
  memberAreaId: string;
  studentEmail: string;
  onLessonSelect?: (lesson: any) => void;
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

export function ContinueWatching({ memberAreaId, studentEmail, onLessonSelect }: ContinueWatchingProps) {
  const [lastLesson, setLastLesson] = useState<LastLesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  console.log('🎬 ContinueWatching render:', { memberAreaId, studentEmail, lastLesson, isLoading });

  useEffect(() => {
    console.log('🔄 ContinueWatching useEffect triggered');
    loadLastWatchedLesson();

    // Recarregar quando a página recebe foco (usuário volta da aula)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Página visível novamente, recarregando última aula...');
        loadLastWatchedLesson();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Configurar realtime subscription para mudanças no progresso
    const normalizedEmail = studentEmail.toLowerCase().trim();
    const channel = supabase
      .channel('lesson-progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_progress',
          filter: `member_area_id=eq.${memberAreaId}`,
        },
        (payload) => {
          console.log('🔔 Progresso atualizado:', payload);
          // Verificar se é do usuário atual
          if (payload.new && (payload.new as any).user_email === normalizedEmail) {
            loadLastWatchedLesson();
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [memberAreaId, studentEmail]);

  const loadLastWatchedLesson = async () => {
    console.log('🔍 Carregando última aula assistida para:', { memberAreaId, studentEmail });
    try {
      setIsLoading(true);
      
      // Normalizar email
      const normalizedEmail = studentEmail.toLowerCase().trim();
      
      console.log('📧 Buscando progresso para email:', normalizedEmail);

      // Buscar o progresso mais recente (sem join com lessons devido a RLS)
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id, progress_percentage, video_current_time, last_watched_at')
        .eq('member_area_id', memberAreaId)
        .eq('user_email', normalizedEmail)
        .order('last_watched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('📊 Progress query result:', { progressData, progressError });

      if (progressError) {
        console.error('❌ Erro ao buscar progresso:', progressError);
        setLastLesson(null);
        return;
      }

      if (!progressData) {
        console.log('ℹ️ Nenhum progresso encontrado');
        setLastLesson(null);
        return;
      }

      // Buscar detalhes da aula usando RPC (bypassa RLS)
      const { data: lessonsData, error: lessonsError } = await supabase
        .rpc('get_lessons_for_student', {
          p_student_email: normalizedEmail,
          p_member_area_id: memberAreaId
        });

      if (lessonsError) {
        console.error('❌ Erro ao buscar aulas:', lessonsError);
        setLastLesson(null);
        return;
      }

      const lesson = lessonsData?.find((l: any) => l.id === progressData.lesson_id);
      
      if (!lesson) {
        console.log('ℹ️ Aula não encontrada');
        setLastLesson(null);
        return;
      }
      
      const lessonData = {
        id: lesson.id,
        title: lesson.title,
        progress_percentage: progressData.progress_percentage,
        video_current_time: progressData.video_current_time || 0,
        duration: lesson.duration || 0,
        module_id: lesson.module_id,
        last_watched_at: progressData.last_watched_at
      };

      console.log('✅ Última aula carregada:', lessonData);
      setLastLesson(lessonData);
    } catch (error) {
      console.error('❌ Erro ao carregar última aula:', error);
      setLastLesson(null);
    } finally {
      setIsLoading(false);
      console.log('🏁 Carregamento finalizado');
    }
  };

  const handleContinueWatching = async () => {
    if (!lastLesson) return;
    
    try {
      const normalizedEmail = studentEmail.toLowerCase().trim();
      
      // Buscar dados completos da aula usando RPC (bypassa RLS)
      const { data: lessonsData, error } = await supabase
        .rpc('get_lessons_for_student', {
          p_student_email: normalizedEmail,
          p_member_area_id: memberAreaId
        });
      
      if (error) throw error;
      
      const lessonData = lessonsData?.find((l: any) => l.id === lastLesson.id);
      
      if (lessonData && onLessonSelect) {
        // Processar dados da aula para converter JSON
        const processedLesson = {
          ...lessonData,
          complementary_links: lessonData.complementary_links ? 
            typeof lessonData.complementary_links === 'string' ? 
              JSON.parse(lessonData.complementary_links) : lessonData.complementary_links : [],
          lesson_materials: lessonData.lesson_materials ? 
            typeof lessonData.lesson_materials === 'string' ? 
              JSON.parse(lessonData.lesson_materials) : lessonData.lesson_materials : []
        };
        
        // Usar a função de callback se disponível
        onLessonSelect(processedLesson);
      } else {
        // Fallback para navegação direta
        navigate(`/members/area/${memberAreaId}?lesson=${lastLesson.id}`);
      }
    } catch (error) {
      console.error('Erro ao abrir aula:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    console.log('⏳ ContinueWatching ainda carregando...');
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-primary/10 rounded animate-pulse w-32" />
              <div className="h-3 bg-primary/10 rounded animate-pulse w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lastLesson) {
    console.log('❌ ContinueWatching: Nenhuma aula para continuar');
    return null;
  }

  console.log('✅ ContinueWatching renderizando card:', lastLesson);

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
