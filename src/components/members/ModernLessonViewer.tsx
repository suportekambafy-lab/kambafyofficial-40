import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import VideoPlayer from '@/components/ui/video-player';
import { Play, Pause, SkipForward, SkipBack, Clock, CheckCircle2, Star, MessageCircle, BookOpen, ArrowLeft, Users, Target } from 'lucide-react';
import { Lesson } from '@/types/memberArea';
import { LessonContentTabs } from './LessonContentTabs';
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
  return <div className="space-y-8 bg-zinc-950">
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
        <div className="overflow-hidden bg-black border border-gray-800 rounded-none my-0 py-0 px-0 mx-0">
          {lesson.video_url || lesson.bunny_embed_url ? <VideoPlayer src={lesson.video_url && !lesson.video_url.includes('mediadelivery.net/embed') ? lesson.video_url : ''} embedUrl={lesson.bunny_embed_url || (lesson.video_url?.includes('mediadelivery.net/embed') ? lesson.video_url : undefined)} startTime={startTime} onProgress={setProgress} onTimeUpdate={(currentTime, duration) => {
          setCurrentTime(currentTime);

          // Salvar progresso automaticamente
          if (onUpdateProgress && duration > 0) {
            onUpdateProgress(lesson.id, currentTime, duration);
          }

          // Marcar como completo quando assistir 90% ou mais
          const progressPercent = currentTime / duration * 100;
          if (progressPercent >= 90 && !isCompleted) {
            setIsCompleted(true);
          }
        }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} /> : <div className="aspect-video bg-black relative">
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