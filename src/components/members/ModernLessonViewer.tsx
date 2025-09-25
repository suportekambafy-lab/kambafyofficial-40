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
  Menu,
  Send,
  Heart,
  ThumbsUp
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
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([
    {
      id: '1',
      user: 'João Silva',
      avatar: '/lovable-uploads/professional-man.jpg',
      comment: 'Excelente aula! Muito esclarecedora.',
      timestamp: '2 horas atrás',
      likes: 5
    },
    {
      id: '2', 
      user: 'Maria Santos',
      avatar: '/lovable-uploads/professional-woman.jpg',
      comment: 'Adorei a explicação sobre esse tópico. Consegui entender perfeitamente!',
      timestamp: '1 dia atrás',
      likes: 3
    }
  ]);

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

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      const newComment = {
        id: Date.now().toString(),
        user: 'Você',
        avatar: '/lovable-uploads/professional-man.jpg',
        comment: comment.trim(),
        timestamp: 'agora',
        likes: 0
      };
      setComments([newComment, ...comments]);
      setComment('');
    }
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
        
        <SheetContent side="right" className="w-[450px] sm:w-[600px] bg-gradient-to-b from-gray-950 to-gray-900 text-white border-gray-800">
          <SheetHeader className="border-b border-gray-800 pb-4">
            <SheetTitle className="text-slate-50 text-xl font-bold">🎬 Lista de Aulas</SheetTitle>
            <SheetDescription className="text-slate-300">
              Navegue entre as aulas do curso • {lessons.length} aulas disponíveis
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)] mt-6">
            <div className="space-y-6">
              {/* Aulas organizadas por módulos */}
              {Object.values(lessonsByModule).map(({ module, lessons: moduleLessons }) => (
                <motion.div 
                  key={module.id} 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-lg border border-emerald-500/30">
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                    <h4 className="font-semibold text-emerald-400">{module.title}</h4>
                    <Badge variant="secondary" className="ml-auto bg-emerald-500/20 text-emerald-300 text-xs">
                      {moduleLessons.length} aulas
                    </Badge>
                  </div>
                  
                  <div className="grid gap-3">
                    {moduleLessons.map((moduleLesson) => (
                      <motion.div
                        key={moduleLesson.id}
                        onClick={() => handleLessonSelect(moduleLesson)}
                        className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                          moduleLesson.id === lesson.id
                            ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                            : 'hover:bg-gray-800/50'
                        }`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-4 p-4 border border-gray-700/50 rounded-xl bg-gray-800/30 backdrop-blur-sm">
                          {/* Thumbnail */}
                          <div className="relative flex-shrink-0">
                            <div className="w-20 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg overflow-hidden">
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            
                            {/* Número da aula */}
                            <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              moduleLesson.id === lesson.id
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-600 text-gray-200'
                            }`}>
                              {moduleLesson.order_number}
                            </div>
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <h5 className={`font-semibold truncate transition-colors ${
                              moduleLesson.id === lesson.id ? 'text-emerald-400' : 'text-white group-hover:text-emerald-300'
                            }`}>
                              {moduleLesson.title}
                            </h5>
                            {moduleLesson.description && (
                              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                {moduleLesson.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs bg-gray-700/50 border-gray-600">
                                <Clock className="h-3 w-3 mr-1" />
                                {moduleLesson.duration} min
                              </Badge>
                              {moduleLesson.id === lesson.id && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-xs">
                                  Assistindo
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Play indicator */}
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              moduleLesson.id === lesson.id
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-700 text-gray-400 group-hover:bg-emerald-500 group-hover:text-white'
                            }`}>
                              <Play className="h-4 w-4 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Aulas sem módulo */}
              {lessonsWithoutModule.length > 0 && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {Object.keys(lessonsByModule).length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-700/20 to-gray-600/20 rounded-lg border border-gray-600/30">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <h4 className="font-semibold text-gray-300">Outras Aulas</h4>
                      <Badge variant="secondary" className="ml-auto bg-gray-600/20 text-gray-300 text-xs">
                        {lessonsWithoutModule.length} aulas
                      </Badge>
                    </div>
                  )}
                  
                  <div className="grid gap-3">
                    {lessonsWithoutModule.map((otherLesson) => (
                      <motion.div
                        key={otherLesson.id}
                        onClick={() => handleLessonSelect(otherLesson)}
                        className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                          otherLesson.id === lesson.id
                            ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                            : 'hover:bg-gray-800/50'
                        }`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-4 p-4 border border-gray-700/50 rounded-xl bg-gray-800/30 backdrop-blur-sm">
                          {/* Thumbnail */}
                          <div className="relative flex-shrink-0">
                            <div className="w-20 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg overflow-hidden">
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            
                            {/* Número da aula */}
                            <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              otherLesson.id === lesson.id
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-600 text-gray-200'
                            }`}>
                              {otherLesson.order_number}
                            </div>
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <h5 className={`font-semibold truncate transition-colors ${
                              otherLesson.id === lesson.id ? 'text-emerald-400' : 'text-white group-hover:text-emerald-300'
                            }`}>
                              {otherLesson.title}
                            </h5>
                            {otherLesson.description && (
                              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                {otherLesson.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs bg-gray-700/50 border-gray-600">
                                <Clock className="h-3 w-3 mr-1" />
                                {otherLesson.duration} min
                              </Badge>
                              {otherLesson.id === lesson.id && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-xs">
                                  Assistindo
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Play indicator */}
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              otherLesson.id === lesson.id
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-700 text-gray-400 group-hover:bg-emerald-500 group-hover:text-white'
                            }`}>
                              <Play className="h-4 w-4 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Video Player */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
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

      {/* Controles abaixo do vídeo */}
      <div className="space-y-6">
        {/* Navegação de aulas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  disabled={!prevLesson}
                  onClick={() => prevLesson && onNavigateLesson(prevLesson.id)}
                  className="bg-gray-800 hover:bg-gray-700 border-gray-600 text-white flex items-center gap-2"
                >
                  <SkipBack className="h-4 w-4" />
                  <div className="text-left">
                    <p className="text-xs text-gray-400">Anterior</p>
                    <p className="text-sm font-medium truncate max-w-32">
                      {prevLesson ? prevLesson.title : 'Nenhuma'}
                    </p>
                  </div>
                </Button>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                    Aula {lesson.order_number}
                  </Badge>
                  <Badge variant="outline" className="text-gray-400 border-gray-600">
                    <Clock className="h-3 w-3 mr-1" />
                    {lesson.duration} min
                  </Badge>
                </div>
                
                <Button 
                  variant="outline"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && onNavigateLesson(nextLesson.id)}
                  className="bg-gray-800 hover:bg-gray-700 border-gray-600 text-white flex items-center gap-2"
                >
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Próxima</p>
                    <p className="text-sm font-medium truncate max-w-32">
                      {nextLesson ? nextLesson.title : 'Nenhuma'}
                    </p>
                  </div>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avaliação da aula */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Como foi esta aula?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRating(star)}
                    className="transition-colors p-1"
                  >
                    <Star 
                      className={`h-8 w-8 ${
                        star <= rating 
                          ? 'text-yellow-500 fill-current' 
                          : 'text-gray-400 hover:text-yellow-400'
                      }`} 
                    />
                  </motion.button>
                ))}
              </div>
              {rating > 0 && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-emerald-400 text-sm mt-3"
                >
                  Obrigado por avaliar esta aula! ⭐
                </motion.p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Seção de comentários */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                Comentários ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input para novo comentário */}
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 space-y-3">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Adicione um comentário sobre esta aula..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleCommentSubmit}
                      disabled={!comment.trim()}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Comentar
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              {/* Lista de comentários */}
              <div className="space-y-4">
                {comments.map((commentItem) => (
                  <motion.div
                    key={commentItem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <img
                      src={commentItem.avatar}
                      alt={commentItem.user}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-white text-sm">{commentItem.user}</p>
                          <p className="text-xs text-gray-400">{commentItem.timestamp}</p>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{commentItem.comment}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 ml-3">
                        <button className="flex items-center gap-1 text-gray-400 hover:text-emerald-400 transition-colors text-xs">
                          <ThumbsUp className="h-3 w-3" />
                          {commentItem.likes}
                        </button>
                        <button className="text-gray-400 hover:text-emerald-400 transition-colors text-xs">
                          Responder
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {comments.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm">Seja o primeiro a comentar sobre esta aula!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}