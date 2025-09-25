import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import VideoPlayer from '@/components/ui/video-player';
import { 
  Play, 
  Pause,
  SkipForward,
  SkipBack,
  Clock,
  CheckCircle2,
  Star,
  MessageCircle,
  BookOpen,
  ArrowLeft,
  Users,
  Target
} from 'lucide-react';
import { Lesson } from '@/types/memberArea';

interface ModernLessonViewerProps {
  lesson: Lesson;
  lessons: Lesson[];
  onNavigateLesson: (lessonId: string) => void;
  onClose: () => void;
}

export function ModernLessonViewer({ 
  lesson, 
  lessons, 
  onNavigateLesson, 
  onClose 
}: ModernLessonViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [rating, setRating] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentIndex = lessons.findIndex(l => l.id === lesson.id);
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  useEffect(() => {
    // Simular progresso para demo
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const newProgress = (newTime / (lesson.duration * 60)) * 100;
          setProgress(newProgress);
          
          if (newProgress >= 90 && !isCompleted) {
            setIsCompleted(true);
          }
          
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, lesson.duration, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = lesson.duration * 60;

  return (
    <div className="space-y-6">
      {/* Video Player - Layout simplificado para sidebar */}
      <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden border-0 bg-background/95">
                {lesson.video_url || lesson.bunny_embed_url ? (
                  <VideoPlayer
                    src={lesson.video_url && !lesson.video_url.includes('mediadelivery.net/embed') ? lesson.video_url : ''}
                    embedUrl={
                      lesson.bunny_embed_url || 
                      (lesson.video_url?.includes('mediadelivery.net/embed') ? lesson.video_url : undefined)
                    }
                    onProgress={setProgress}
                    onTimeUpdate={(currentTime, duration) => {
                      setCurrentTime(currentTime);
                      if (currentTime / duration >= 0.9 && !isCompleted) {
                        setIsCompleted(true);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 relative">
                    {/* Video placeholder para aulas sem vídeo */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <Play className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">Nenhum vídeo disponível</p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

        {/* Botões de navegação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              disabled={!prevLesson}
              onClick={() => prevLesson && onNavigateLesson(prevLesson.id)}
              className="bg-muted/20 hover:bg-muted/30 text-foreground border-0"
            >
              <SkipBack className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            
            <Button 
              variant="ghost"
              disabled={!nextLesson}
              onClick={() => nextLesson && onNavigateLesson(nextLesson.id)}
              className="bg-muted/20 hover:bg-muted/30 text-foreground border-0"
            >
              Próxima
              <SkipForward className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>

        {/* Avaliação da aula */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Avalie esta aula</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRating(star)}
                  className="transition-colors"
                >
                  <Star 
                    className={`h-5 w-5 ${
                      star <= rating 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-400'
                    }`} 
                  />
                </motion.button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-muted-foreground">
                Você avaliou com {rating} estrela{rating > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}