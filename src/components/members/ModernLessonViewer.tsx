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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar às aulas
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Badge variant="outline" className="text-xs">
                Aula {lesson.order_number}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {isCompleted && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Concluída
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {lesson.duration} min
              </Badge>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Video Player Principal */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden">
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

            {/* Lesson Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">{lesson.title}</CardTitle>
                  {lesson.description && (
                    <p className="text-muted-foreground leading-relaxed">
                      {lesson.description}
                    </p>
                  )}
                </CardHeader>
              </Card>
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        disabled={!prevLesson}
                        onClick={() => prevLesson && onNavigateLesson(prevLesson.id)}
                      >
                        <SkipBack className="h-4 w-4 mr-2" />
                        Anterior
                      </Button>
                      <Button 
                        variant="outline"
                        disabled={!nextLesson}
                        onClick={() => nextLesson && onNavigateLesson(nextLesson.id)}
                      >
                        <SkipForward className="h-4 w-4 mr-2" />
                        Próxima
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <span className="text-sm text-muted-foreground">Avalie esta aula:</span>
                      <div className="flex gap-1">
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
                                  : 'text-muted-foreground'
                              }`} 
                            />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Progresso */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Seu Progresso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {Math.round(progress)}%
                    </div>
                    <p className="text-sm text-muted-foreground">desta aula</p>
                  </div>
                  
                  <Progress value={progress} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-primary/10 rounded-lg p-3">
                      <div className="text-lg font-semibold text-primary">
                        {lessons.filter(l => Math.random() > 0.5).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Concluídas</div>
                    </div>
                    <div className="bg-accent/10 rounded-lg p-3">
                      <div className="text-lg font-semibold text-accent-foreground">
                        {lessons.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Lista de Aulas */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-accent" />
                    Todas as Aulas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-y-auto">
                    {lessons.map((l, index) => (
                      <motion.div
                        key={l.id}
                        whileHover={{ scale: 1.02 }}
                        className={`p-3 border-b border-border/50 cursor-pointer transition-colors ${
                          l.id === lesson.id 
                            ? 'bg-primary/10 border-l-4 border-l-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => onNavigateLesson(l.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {l.order_number}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-2">
                              {l.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {l.duration} min
                              </span>
                              {Math.random() > 0.5 && (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}