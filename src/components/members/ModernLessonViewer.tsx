import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RotateCcw, SkipForward, HelpCircle } from 'lucide-react';
import { Lesson } from '@/types/memberArea';
import { LessonContentTabs } from './LessonContentTabs';
import { LessonReleaseTimer } from '@/components/ui/lesson-release-timer';
import VideoPlayer from '@/components/ui/video-player';
import LessonQuiz from '@/components/members/LessonQuiz';
import { supabase } from '@/integrations/supabase/client';
interface ModernLessonViewerProps {
  lesson: Lesson;
  lessons: Lesson[];
  lessonProgress?: Record<string, any>;
  memberAreaId: string;
  studentEmail?: string;
  studentName?: string;
  onNavigateLesson: (lessonId: string) => void;
  onClose: () => void;
  onUpdateProgress?: (lessonId: string, currentTime: number, duration: number) => void;
}
export function ModernLessonViewer({
  lesson,
  lessons = [],
  lessonProgress = {},
  memberAreaId,
  studentEmail,
  studentName,
  onNavigateLesson,
  onClose,
  onUpdateProgress
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
  const [hasQuiz, setHasQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showQuizOverlay, setShowQuizOverlay] = useState(false);
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

  // Check if lesson has a quiz
  useEffect(() => {
    const checkQuiz = async () => {
      if (!lesson?.id || !memberAreaId) return;
      
      try {
        const { data: quizData } = await supabase
          .from('member_area_quizzes')
          .select('id')
          .eq('member_area_id', memberAreaId)
          .eq('lesson_id', lesson.id)
          .eq('is_active', true)
          .maybeSingle();

        setHasQuiz(!!quizData);

        // Check if quiz already completed
        if (quizData && studentEmail) {
          const { data: responseData } = await supabase
            .from('member_area_quiz_responses')
            .select('id')
            .eq('quiz_id', quizData.id)
            .eq('student_email', studentEmail.toLowerCase())
            .limit(1);

          setQuizCompleted(responseData && responseData.length > 0);
        }
      } catch (error) {
        console.error('Error checking quiz:', error);
      }
    };

    checkQuiz();
  }, [lesson?.id, memberAreaId, studentEmail]);

  // Gerenciar countdown quando vídeo termina
  useEffect(() => {
    // If has quiz and not completed, show quiz
    if (videoEnded && hasQuiz && !quizCompleted) {
      setShowQuizOverlay(true);
      return;
    }

    if (videoEnded && nextLesson && autoplayCountdown > 0 && (!hasQuiz || quizCompleted)) {
      countdownTimerRef.current = setTimeout(() => {
        setAutoplayCountdown(prev => prev - 1);
      }, 1000);
    } else if (videoEnded && nextLesson && autoplayCountdown === 0 && (!hasQuiz || quizCompleted)) {
      onNavigateLesson(nextLesson.id);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [videoEnded, autoplayCountdown, nextLesson, hasQuiz, quizCompleted]);

  // Reset estados quando mudar de aula
  useEffect(() => {
    setVideoEnded(false);
    setAutoplayCountdown(10);
    setShouldRestart(false);
    setIsReplayMode(false);
    setShowQuizOverlay(false);
    setQuizCompleted(false);
    setHasQuiz(false);
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }
  }, [lesson?.id]);

  const handleQuizComplete = (passed: boolean, score: number) => {
    setQuizCompleted(true);
    setShowQuizOverlay(false);
    if (nextLesson) {
      setAutoplayCountdown(10);
    }
  };

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
                    className="absolute inset-0 bg-black/95 z-50 overflow-hidden"
                  >
                    {/* Show Quiz if has quiz and not completed */}
                    {showQuizOverlay && hasQuiz && !quizCompleted ? (
                      <ScrollArea className="h-full w-full">
                        <div className="w-full max-w-2xl mx-auto p-4 md:p-8">
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-center mb-6"
                          >
                            <HelpCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                            <h3 className="text-xl font-bold text-white">
                              Complete o Quiz para continuar
                            </h3>
                            <p className="text-white/60 text-sm mt-2">
                              Responda ao quiz desta aula para desbloquear a próxima
                            </p>
                          </motion.div>
                          
                          <LessonQuiz
                            lessonId={lesson.id}
                            memberAreaId={memberAreaId}
                            studentEmail={studentEmail || ''}
                            studentName={studentName}
                            onComplete={handleQuizComplete}
                          />

                          {/* Skip button (optional - quiz is informative) */}
                          <div className="mt-6 text-center">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setQuizCompleted(true);
                                setShowQuizOverlay(false);
                              }}
                              className="text-white/40 hover:text-white/60"
                            >
                              Pular Quiz
                            </Button>
                          </div>
                        </div>
                      </ScrollArea>
                    ) : (
                      /* Show Next Lesson Countdown */
                      <div className="h-full flex items-center justify-center">
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
                      </div>
                    )}
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