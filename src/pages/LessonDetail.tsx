import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  Star,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { MemberAreaAuthProvider, useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import VideoPlayer from '@/components/ui/video-player';
import { useState, useEffect } from 'react';
import type { Lesson } from '@/types/memberArea';

function LessonDetailContent() {
  const { areaId, lessonId } = useParams<{ areaId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, student } = useMemberAreaAuth();
  const [newComment, setNewComment] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [videoError, setVideoError] = useState(false);

  const { 
    lessonProgress, 
    comments, 
    updateLessonProgress, 
    saveRating, 
    loadComments, 
    saveComment
  } = useLessonProgress(areaId || '');

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      
      if (error) {
        console.error('Error fetching lesson:', error);
        return null;
      }
      
      return data as Lesson;
    },
    enabled: !!lessonId && isAuthenticated
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ['area-lessons', areaId],
    queryFn: async () => {
      if (!areaId) return [];
      
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('member_area_id', areaId)
        .eq('status', 'published')
        .order('order_number');
      
      if (error) {
        console.error('Error fetching lessons:', error);
        return [];
      }
      
      return data as Lesson[];
    },
    enabled: !!areaId && isAuthenticated
  });

  useEffect(() => {
    if (lesson) {
      loadComments(lesson.id);
      setUserRating(lessonProgress[lesson.id]?.rating || 0);
    }
  }, [lesson, loadComments, lessonProgress]);

  const currentIndex = lesson ? allLessons.findIndex(l => l.id === lesson.id) : -1;
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const handleRating = (rating: number) => {
    if (lesson) {
      setUserRating(rating);
      saveRating(lesson.id, rating);
    }
  };

  const handleSubmitComment = async () => {
    if (lesson && newComment.trim()) {
      await saveComment(lesson.id, newComment);
      setNewComment('');
      toast({
        title: 'Comentário enviado',
        description: 'Seu comentário foi adicionado com sucesso!'
      });
    }
  };

  const handleBackToDashboard = () => {
    navigate(`/area/${areaId}`);
  };

  const handleVideoError = () => {
    setVideoError(true);
    toast({
      title: "Erro no vídeo",
      description: "Não foi possível carregar o vídeo. Verifique se a URL está correta.",
      variant: "destructive"
    });
  };

  if (!isAuthenticated) {
    navigate(`/login/${areaId}`);
    return null;
  }

  if (lessonLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Carregando aula..." />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Aula não encontrada</h1>
          <p className="text-muted-foreground mb-4">A aula solicitada não existe ou não está disponível.</p>
          <Button onClick={handleBackToDashboard}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Curso
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleBackToDashboard}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Curso
            </Button>
            
            <div className="text-center">
              <Badge variant="outline" className="mb-1">
                Aula {lesson.order_number}
              </Badge>
              <h1 className="font-semibold text-foreground">{lesson.title}</h1>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-2">
              {previousLesson && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/area/${areaId}/lesson/${previousLesson.id}`)}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
              )}
              {nextLesson && (
                <Button 
                  size="sm"
                  onClick={() => navigate(`/area/${areaId}/lesson/${nextLesson.id}`)}
                  className="gap-1"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="aspect-video bg-background">
                {lesson.video_url && !videoError ? (
                  <VideoPlayer
                    src={lesson.video_url}
                    onError={handleVideoError}
                    onTimeUpdate={(currentTime, duration) => {
                      if (duration > 0) {
                        const progress = Math.floor((currentTime / duration) * 100);
                        updateLessonProgress(lessonId!, { 
                          progress_percentage: progress,
                          completed: progress >= 90 
                        });
                      }
                    }}
                    onPlay={() => {
                      console.log('Vídeo iniciado');
                    }}
                    onPause={() => {
                      console.log('Vídeo pausado');
                    }}
                    onEnded={() => {
                      updateLessonProgress(lessonId!, { 
                        progress_percentage: 100,
                        completed: true 
                      });
                      toast({
                        title: "Aula concluída!",
                        description: "Você completou esta aula com sucesso."
                      });
                    }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-muted">
                    <div className="text-center p-8">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {videoError ? 'Erro ao carregar vídeo' : 'Vídeo não disponível'}
                      </h3>
                      <p className="text-muted-foreground">
                        {videoError ? 'Tente novamente mais tarde' : 'Este conteúdo estará disponível em breve'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Lesson Info */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">{lesson.title}</h2>
                    {lesson.description && (
                      <p className="text-muted-foreground">{lesson.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lesson.duration || 5} min
                  </Badge>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <span className="text-sm font-medium text-foreground">Avalie esta aula:</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-5 h-5 cursor-pointer transition-colors ${
                          i < userRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                        }`}
                        onClick={() => handleRating(i + 1)}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comments Sidebar */}
          <div className="space-y-6">
            {/* Add Comment */}
            {student && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Comentários
                  </h3>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Adicione um comentário sobre esta aula..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <Button 
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim()}
                      size="sm"
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Comentário
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments List */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium text-foreground mb-4">
                  Comentários ({comments[lesson.id]?.length || 0})
                </h4>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments[lesson.id]?.map((comment) => (
                    <div key={comment.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-foreground text-sm">
                          {comment.user_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.comment}</p>
                    </div>
                  )) || (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Nenhum comentário ainda. Seja o primeiro a comentar!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lesson Navigation */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium text-foreground mb-4">Navegação</h4>
                <div className="space-y-2">
                  {previousLesson && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/area/${areaId}/lesson/${previousLesson.id}`)}
                      className="w-full justify-start gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <div className="text-left">
                        <div className="text-xs text-muted-foreground">Anterior</div>
                        <div className="truncate">{previousLesson.title}</div>
                      </div>
                    </Button>
                  )}
                  {nextLesson && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/area/${areaId}/lesson/${nextLesson.id}`)}
                      className="w-full justify-start gap-2"
                    >
                      <div className="text-left flex-1">
                        <div className="text-xs text-primary-foreground/80">Próxima</div>
                        <div className="truncate">{nextLesson.title}</div>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LessonDetail() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();

  if (!areaId) {
    navigate('/');
    return null;
  }

  return (
    <MemberAreaAuthProvider memberAreaId={areaId}>
      <LessonDetailContent />
    </MemberAreaAuthProvider>
  );
}