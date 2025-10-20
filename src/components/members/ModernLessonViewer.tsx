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
  hasModuleAccess?: boolean; // ✅ SEGURANÇA: Flag para verificar acesso ao módulo
}
export function ModernLessonViewer({
  lesson,
  lessons = [],
  lessonProgress = {},
  onNavigateLesson,
  onClose,
  onUpdateProgress,
  hasModuleAccess = true // ✅ Por padrão assume que tem acesso (para módulos gratuitos)
}: ModernLessonViewerProps) {
  console.log('🎬 ModernLessonViewer: Iniciando com', {
    lessonTitle: lesson?.title,
    lessonsCount: lessons?.length,
    hasProgress: !!lessonProgress,
    hasUpdateProgress: !!onUpdateProgress
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [rating, setRating] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(10);
  const [videoKey, setVideoKey] = useState(0);
  const [shouldRestart, setShouldRestart] = useState(false);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Obter progresso da aula atual (com verificação segura)
  const currentProgress = lesson?.id ? lessonProgress[lesson.id] : null;
  const startTime = shouldRestart ? 0 : (currentProgress?.video_current_time || 0);
  const currentIndex = lesson?.id ? lessons.findIndex(l => l.id === lesson.id) : -1;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  // Inicializar estado com progresso salvo
  useEffect(() => {
    if (currentProgress && lesson?.title) {
      setProgress(currentProgress.progress_percentage || 0);
      setIsCompleted(currentProgress.completed || false);
      setRating(currentProgress.rating || 0);
      console.log('📊 Progresso carregado para aula:', lesson.title, {
        progress: currentProgress.progress_percentage + '%',
        completed: currentProgress.completed,
        startTime: currentProgress.video_current_time
      });
    }
  }, [lesson?.id, currentProgress, lesson?.title]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // lesson.duration está em segundos
  const totalSeconds = lesson?.duration || 0;

  // Verificar se a aula está agendada para liberação futura
  const isScheduled = lesson?.is_scheduled && lesson?.scheduled_at;
  const isNotYetReleased = isScheduled && new Date(lesson.scheduled_at!) > new Date();

  // Derivar HLS URL do embed URL do Bunny se necessário
  const getHlsUrl = () => {
    if (!lesson) return null;
    
    // Se já tem hls_url e NÃO é Vimeo
    if (lesson.hls_url && !lesson.hls_url.includes('vimeo.com') && !lesson.hls_url.includes('player.vimeo.com')) {
      // Se for URL do Bunny CDN, usar proxy reverso
      if (lesson.hls_url.includes('vz-5c879716-268.b-cdn.net')) {
        const videoId = lesson.hls_url.split('/')[3]; // Extrair videoId da URL
        const proxyUrl = `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/bunny-proxy/video/${videoId}/playlist.m3u8`;
        console.log('🔄 Usando proxy para Bunny:', { original: lesson.hls_url, proxy: proxyUrl });
        return proxyUrl;
      }
      return lesson.hls_url;
    }
    
    // Se temos um embed URL do Bunny, derivar o HLS URL através do proxy
    const embedUrl = lesson.bunny_embed_url || lesson.video_url;
    
    if (embedUrl?.includes('iframe.mediadelivery.net/embed/')) {
      const videoId = embedUrl.split('/').pop();
      const proxyUrl = `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/bunny-proxy/video/${videoId}/playlist.m3u8`;
      console.log('🔄 Gerando URL de proxy para Bunny:', { embedUrl, videoId, proxyUrl });
      return proxyUrl;
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
    setShouldRestart(false);
    setIsReplayMode(false);
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }
  }, [lesson?.id]);

  const handleVideoEnd = () => {
    console.log('🎬 Video ended for:', lesson?.title);
    setVideoEnded(true);
    setAutoplayCountdown(10);
    setIsReplayMode(false);
    setShouldRestart(false);
  };

  const handleReplay = () => {
    setVideoEnded(false);
    setAutoplayCountdown(10);
    setIsReplayMode(true);
    setShouldRestart(true);
    setVideoKey(prev => prev + 1);
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      onNavigateLesson(nextLesson.id);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8 bg-zinc-950 w-full max-w-full overflow-x-hidden">
      {!lesson ? (
        <div className="p-8 text-center">
          <p className="text-red-500">Erro ao carregar aula</p>
        </div>
      ) : (
        <>
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
          ) : !hasModuleAccess ? (
            // ✅ SEGURANÇA: Bloquear reprodução se não tiver acesso ao módulo
            <div className="w-full aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative flex items-center justify-center border border-amber-500/30">
              <div className="text-center p-8 max-w-md">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Módulo Pago</h3>
                <p className="text-gray-300 mb-4">
                  Esta aula faz parte de um módulo pago. Você precisa comprar o módulo para acessar o conteúdo.
                </p>
                <Button 
                  onClick={onClose} 
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  Voltar aos Módulos
                </Button>
              </div>
            </div>
          ) : hlsUrl || lesson.video_url || lesson.bunny_embed_url ? (
            <div className="w-full aspect-video bg-black relative">
              <VideoPlayer
                key={`${lesson.id}-${videoKey}`}
                hlsUrl={hlsUrl || undefined}
                embedUrl={lesson.bunny_embed_url || lesson.video_url || undefined}
                startTime={startTime}
                onTimeUpdate={onUpdateProgress && !isReplayMode ? (currentTime, duration) => {
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
                    className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 overflow-y-auto"
                  >
                    <div className="w-full max-w-md sm:max-w-xl text-center space-y-4 sm:space-y-6 p-4 sm:p-8 my-auto">
                      {/* Próxima aula (se existir) */}
                      {nextLesson && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 space-y-3"
                        >
                          <p className="text-xs sm:text-sm text-gray-400">Próxima aula</p>
                          <h4 className="text-base sm:text-lg font-semibold text-white line-clamp-2">
                            {nextLesson.title}
                          </h4>
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                            <span>Iniciando em</span>
                            <span className="text-2xl font-bold text-primary">
                              {autoplayCountdown}s
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* Botões de ação */}
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-row gap-2 sm:gap-3 justify-center"
                      >
                        <Button
                          onClick={handleReplay}
                          variant="outline"
                          className="gap-2 flex-1 h-11"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Repetir
                        </Button>
                        
                        {nextLesson && (
                          <Button
                            onClick={handleNextLesson}
                            className="gap-2 flex-1 h-11"
                          >
                            <SkipForward className="h-4 w-4" />
                            Próxima
                          </Button>
                        )}
                      </motion.div>

                      {/* Barra de progresso do countdown */}
                      {nextLesson && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Progress 
                            value={(10 - autoplayCountdown) * 10} 
                            className="h-1"
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
        </>
      )}
    </div>
  );
}