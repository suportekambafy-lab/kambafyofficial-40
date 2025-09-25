import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import VideoPlayer from '@/components/ui/video-player';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  Send
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
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentIndex = lessons.findIndex(l => l.id === lesson.id);
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  // Carregar comentários da aula
  useEffect(() => {
    const loadComments = async () => {
      const { data, error } = await supabase
        .from('lesson_comments')
        .select('*')
        .eq('lesson_id', lesson.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar comentários:', error);
      } else {
        setComments(data || []);
      }
    };

    loadComments();
  }, [lesson.id]);

  // Enviar comentário
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('lesson_comments')
        .insert({
          lesson_id: lesson.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          comment: newComment.trim()
        })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao enviar comentário');
        console.error('Erro:', error);
      } else {
        setComments([data, ...comments]);
        setNewComment('');
        toast.success('Comentário enviado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao enviar comentário');
      console.error('Erro:', error);
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Título da aula */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">{lesson.title}</h2>
          {lesson.description && (
            <p className="text-muted-foreground">{lesson.description}</p>
          )}
        </div>
      </motion.div>

      {/* Avaliação com estrelas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-4">
          <div className="flex flex-col items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">Avalie esta aula</h3>
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
                    className={`h-6 w-6 ${
                      star <= rating 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-400'
                    }`} 
                  />
                </motion.button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                Você avaliou com {rating} estrela{rating > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Seção de comentários */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comentários ({comments.length})
            </h3>

            {/* Campo para novo comentário */}
            <div className="space-y-3">
              <Textarea
                placeholder="Deixe seu comentário sobre esta aula..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Comentário'}
                </Button>
              </div>
            </div>

            {/* Lista de comentários */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  Seja o primeiro a comentar esta aula!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-3 bg-muted/20">
                    <p className="text-foreground mb-2">{comment.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}