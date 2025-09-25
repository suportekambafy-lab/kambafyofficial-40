import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import VideoPlayer from '@/components/ui/video-player';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Target,
  Menu,
  ChevronRight
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isMobile = useIsMobile();
  const currentIndex = lessons.findIndex(l => l.id === lesson.id);
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  // Calcular tempo total do curso
  const totalCourseDuration = lessons.reduce((total, l) => total + l.duration, 0);
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

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

  // Lista de aulas componente
  const LessonsList = ({ className = "" }: { className?: string }) => (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Aulas do Curso</h3>
        <Badge variant="secondary" className="text-xs">
          {lessons.length} aulas
        </Badge>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {lessons.map((l, index) => (
          <motion.div
            key={l.id}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              l.id === lesson.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
            onClick={() => onNavigateLesson(l.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">{index + 1}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{l.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{l.duration}min</span>
                  {l.id === lesson.id && (
                    <Badge variant="default" className="text-xs">Atual</Badge>
                  )}
                </div>
              </div>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header com tempo do curso */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Curso: {formatDuration(totalCourseDuration)}</span>
        </div>
      </div>

      {/* Video Player */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        {/* Menu móvel para lista de aulas */}
        {isMobile && (
          <div className="absolute top-4 right-4 z-10">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-background/80 backdrop-blur-sm border shadow-sm"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <LessonsList />
              </SheetContent>
            </Sheet>
          </div>
        )}

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

      {/* Informações da aula */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{lesson.title}</CardTitle>
            {lesson.description && (
              <p className="text-muted-foreground">{lesson.description}</p>
            )}
          </CardHeader>
        </Card>
      </motion.div>

      {/* Lista de aulas - apenas desktop */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <LessonsList />
            </CardHeader>
          </Card>
        </motion.div>
      )}
    </div>
  );
}