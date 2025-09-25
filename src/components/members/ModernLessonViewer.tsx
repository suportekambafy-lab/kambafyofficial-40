import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Target,
  List,
  Menu
} from 'lucide-react';
import { Lesson, Module } from '@/types/memberArea';

interface ModernLessonViewerProps {
  lesson: Lesson;
  lessons: Lesson[];
  modules: Module[];
  onNavigateLesson: (lessonId: string) => void;
  onClose: () => void;
}

export function ModernLessonViewer({ 
  lesson, 
  lessons, 
  modules,
  onNavigateLesson, 
  onClose 
}: ModernLessonViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [rating, setRating] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lessonsMenuOpen, setLessonsMenuOpen] = useState(false);

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

  // Organizar aulas por módulos
  const lessonsByModule = modules.reduce((acc, module) => {
    const moduleLessons = lessons.filter(l => l.module_id === module.id);
    if (moduleLessons.length > 0) {
      acc[module.id] = {
        module,
        lessons: moduleLessons
      };
    }
    return acc;
  }, {} as Record<string, { module: Module; lessons: Lesson[]; }>);

  const lessonsWithoutModule = lessons.filter(l => !l.module_id);

  const handleLessonSelect = (selectedLesson: Lesson) => {
    onNavigateLesson(selectedLesson.id);
    setLessonsMenuOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Menu de Aulas */}
      <Sheet open={lessonsMenuOpen} onOpenChange={setLessonsMenuOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="fixed top-20 right-4 z-50 shadow-lg bg-gray-900/80 backdrop-blur-sm hover:bg-gray-800/90 text-white border border-gray-700/50 hover:border-emerald-500/50 p-3 rounded-lg transition-all"
          >
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="text-sm">Aulas</span>
            </div>
          </Button>
        </SheetTrigger>
        
        <SheetContent side="right" className="w-[400px] sm:w-[500px] bg-gray-950 text-white border-gray-800">
          <SheetHeader>
            <SheetTitle className="text-slate-50">Lista de Aulas</SheetTitle>
            <SheetDescription className="text-slate-300">
              Navegue entre as aulas do curso
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            <div className="space-y-4">
              {/* Aulas organizadas por módulos */}
              {Object.values(lessonsByModule).map(({ module, lessons: moduleLessons }) => (
                <div key={module.id} className="space-y-2">
                  <h4 className="font-medium text-emerald-400 text-sm px-2 py-1 bg-gray-800 rounded sticky top-0 z-10">
                    📁 {module.title}
                  </h4>
                  <div className="space-y-1">
                    {moduleLessons.map((moduleLesson, index) => (
                      <div
                        key={moduleLesson.id}
                        onClick={() => handleLessonSelect(moduleLesson)}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          moduleLesson.id === lesson.id
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-gray-700 hover:bg-gray-800'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          moduleLesson.id === lesson.id
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {moduleLesson.order_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className={`font-medium truncate ${
                            moduleLesson.id === lesson.id ? 'text-emerald-400' : 'text-white'
                          }`}>
                            {moduleLesson.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {moduleLesson.duration} min
                            </Badge>
                          </div>
                        </div>
                        {moduleLesson.id === lesson.id && (
                          <div className="text-emerald-400">
                            <Play className="h-4 w-4 fill-current" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Aulas sem módulo */}
              {lessonsWithoutModule.length > 0 && (
                <div className="space-y-2">
                  {Object.keys(lessonsByModule).length > 0 && (
                    <h4 className="font-medium text-emerald-400 text-sm px-2 py-1 bg-gray-800 rounded sticky top-0 z-10">
                      📄 Outras Aulas
                    </h4>
                  )}
                  <div className="space-y-1">
                    {lessonsWithoutModule.map((otherLesson) => (
                      <div
                        key={otherLesson.id}
                        onClick={() => handleLessonSelect(otherLesson)}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          otherLesson.id === lesson.id
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-gray-700 hover:bg-gray-800'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          otherLesson.id === lesson.id
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {otherLesson.order_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className={`font-medium truncate ${
                            otherLesson.id === lesson.id ? 'text-emerald-400' : 'text-white'
                          }`}>
                            {otherLesson.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {otherLesson.duration} min
                            </Badge>
                          </div>
                        </div>
                        {otherLesson.id === lesson.id && (
                          <div className="text-emerald-400">
                            <Play className="h-4 w-4 fill-current" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Video Player - Layout simplificado para sidebar */}
      <div className="space-y-4">
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

        {/* Controls de navegação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              disabled={!prevLesson}
              onClick={() => prevLesson && onNavigateLesson(prevLesson.id)}
              className="bg-gray-800 hover:bg-gray-700 border-gray-600 text-white"
            >
              <SkipBack className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            
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
                    className={`h-4 w-4 ${
                      star <= rating 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-400'
                    }`} 
                  />
                </motion.button>
              ))}
            </div>
            
            <Button 
              variant="outline"
              disabled={!nextLesson}
              onClick={() => nextLesson && onNavigateLesson(nextLesson.id)}
              className="bg-gray-800 hover:bg-gray-700 border-gray-600 text-white"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Próxima
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}