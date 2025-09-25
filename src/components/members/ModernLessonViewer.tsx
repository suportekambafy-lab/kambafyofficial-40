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
          // lesson.duration já está em minutos, então convertemos para segundos
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

  // lesson.duration está em minutos, convertemos para segundos
  const totalSeconds = lesson.duration * 60;

  return (
    <div className="space-y-6">
      {/* Video Player - sozinho */}
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
    </div>
  );
}