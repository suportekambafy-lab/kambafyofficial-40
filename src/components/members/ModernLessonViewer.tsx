import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Play, RotateCcw, SkipForward } from 'lucide-react';
import { Lesson } from '@/types/memberArea';
import { LessonContentTabs } from './LessonContentTabs';
import { LessonReleaseTimer } from '@/components/ui/lesson-release-timer';
import VideoPlayer from '@/components/ui/video-player';
interface ModernLessonViewerProps {
  lesson: Lesson;
  lessons: Lesson[];
  lessonProgress?: Record<string, any>;
  onNavigateLesson: (lessonId: string) => void;
  onClose: () => void;
  onUpdateProgress?: (lessonId: string, currentTime: number, duration: number) => void;
}
export function ModernLessonViewer({
  lesson,
  lessons,
  lessonProgress = {},
  onNavigateLesson,
  onClose,
  onUpdateProgress
}: ModernLessonViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [rating, setRating] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(10);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Obter progresso da aula atual
  const currentProgress = lessonProgress[lesson.id];
  const startTime = currentProgress?.video_current_time || 0;
  const currentIndex = lessons.findIndex(l => l.id === lesson.id);
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  // Inicializar estado com progresso salvo
  useEffect(() => {
    if (currentProgress) {
      setProgress(currentProgress.progress_percentage || 0);
      setIsCompleted(currentProgress.completed || false);
      setRating(currentProgress.rating || 0);
      console.log('📊 Progresso carregado para aula:', lesson.title, {
        progress: currentProgress.progress_percentage + '%',
        completed: currentProgress.completed,
        startTime: currentProgress.video_current_time
      });
    }
  }, [lesson.id, currentProgress]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // lesson.duration está em segundos
  const totalSeconds = lesson.duration;

  // Verificar se a aula está agendada para liberação futura
  const isScheduled = lesson.is_scheduled && lesson.scheduled_at;
  const isNotYetReleased = isScheduled && new Date(lesson.scheduled_at) > new Date();

  // Derivar HLS URL do embed URL do Bunny se necessário
  const getHlsUrl = () => {
    if (lesson.hls_url) return lesson.hls_url;
    
    // Se temos um embed URL do Bunny, derivar o HLS URL
    const embedUrl = lesson.bunny_embed_url || lesson.video_url;
    if (embedUrl?.includes('iframe.mediadelivery.net/embed/')) {
      const videoId = embedUrl.split('/').pop();
      return `https://vz-5c879716-268.b-cdn.net/${videoId}/playlist.m3u8`;
    }
    
    return null;
  };

  const hlsUrl = getHlsUrl();

  // Gerenciar countdown quando vídeo termina
  useEffect(() => {
    if (videoEnded && nextLesson && autoplayCountdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setAutoplayCountdown(prev => prev - 1);
      }, 1000);
    } else if (videoEnded && nextLesson && autoplayCountdown === 0) {
      onNavigateLesson(nextLesson.id);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [videoEnded, autoplayCountdown, nextLesson]);

  // Reset estados quando mudar de aula
  useEffect(() => {
    setVideoEnded(false);
    setAutoplayCountdown(10);
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }
  }, [lesson.id]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    setAutoplayCountdown(10);
  };

  const handleReplay = () => {
    setVideoEnded(false);
    setAutoplayCountdown(10);
    window.location.reload(); // Força reload para reiniciar vídeo
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      onNavigateLesson(nextLesson.id);
    }
  };
  return <div className="space-y-4 sm:space-y-8 bg-zinc-950 w-full max-w-full overflow-x-hidden">
      {/* Video Player */}
      <motion.div initial={{
      opacity: 0,
      scale: 0.95
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      delay: 0.1
    }}>
        <div className="overflow-hidden bg-black border border-gray-800 rounded-none my-0 py-0 px-0 mx-0 w-full">
          {isNotYetReleased ? (
            <LessonReleaseTimer 
              releaseDate={new Date(lesson.scheduled_at!)} 
              lessonTitle={lesson.title}
            />
          ) : hlsUrl || lesson.video_url || lesson.bunny_embed_url ? (
            <div className="w-full aspect-video bg-black relative">
              <VideoPlayer
                key={lesson.id}
                hlsUrl={hlsUrl}
                embedUrl={!hlsUrl ? (lesson.bunny_embed_url || lesson.video_url) : undefined}
                startTime={startTime}
                onTimeUpdate={onUpdateProgress ? (currentTime, duration) => {
                  onUpdateProgress(lesson.id, currentTime, duration);
                } : undefined}
                onEnded={handleVideoEnd}
              />
              
              {/* Overlay de fim de vídeo */}
              <AnimatePresence>
                {videoEnded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto"
                  >
                    <div className="max-w-md sm:max-w-xl w-full text-center space-y-3 sm:space-y-5 my-auto">
                      {/* Mensagem de conclusão */}
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <h3 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2">
                          Aula Concluída! 🎉
                        </h3>
                        <p className="text-xs sm:text-base text-gray-400 px-1 line-clamp-2">
                          Parabéns por completar &quot;{lesson.title}&quot;
                        </p>
                      </motion.div>

                      {/* Próxima aula (se existir) */}
                      {nextLesson && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-5"
                        >
                          <p className="text-xs text-gray-400 mb-1 sm:mb-2">Próxima aula</p>
                          <h4 className="text-sm sm:text-lg font-semibold text-white mb-2 sm:mb-3 line-clamp-2 px-1">
                            {nextLesson.title}
                          </h4>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400">
                            <span className="text-center">Iniciando em</span>
                            <span className="text-xl sm:text-2xl font-bold text-primary">
                              {autoplayCountdown}s
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* Botões de ação */}
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center px-1"
                      >
                        <Button
                          onClick={handleReplay}
                          variant="outline"
                          size="sm"
                          className="gap-1.5 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
                        >
                          <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Repetir
                        </Button>
                        
                        {nextLesson && (
                          <Button
                            onClick={handleNextLesson}
                            size="sm"
                            className="gap-1.5 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
                          >
                            <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Próxima Aula
                          </Button>
                        )}
                      </motion.div>

                      {/* Barra de progresso do countdown */}
                      {nextLesson && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.4 }}
                          className="w-full"
                        >
                          <Progress 
                            value={(10 - autoplayCountdown) * 10} 
                            className="h-0.5 sm:h-1"
                          />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : <div className="aspect-video bg-black relative">
              {/* Video placeholder para aulas sem vídeo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <Play className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400">Nenhum vídeo disponível</p>
                </div>
              </div>
            </div>}
        </div>
      </motion.div>

      {/* Lesson Content Tabs */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.2
    }}>
        <LessonContentTabs lesson={lesson} />
      </motion.div>
    </div>;
}