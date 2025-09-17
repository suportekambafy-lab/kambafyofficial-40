import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { 
  ArrowLeft, 
  Clock, 
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { MemberAreaAuthProvider, useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import VideoPlayer from '@/components/ui/video-player';
import { LessonViewSidebar } from '@/components/LessonViewSidebar';
import { LessonComments } from '@/components/LessonComments';
import { LessonRating } from '@/components/LessonRating';
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
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        {/* Lesson List Sidebar */}
        <LessonViewSidebar
          lessons={allLessons}
          currentLessonId={lesson.id}
          lessonProgress={lessonProgress}
          memberAreaId={areaId || ''}
          onLessonSelect={(lessonId) => navigate(`/area/${areaId}/lesson/${lessonId}`)}
        />

        {/* Main Content */}
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="flex h-16 items-center px-6 gap-4">
              <SidebarTrigger />
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBackToDashboard}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Curso
              </Button>
              
              <div className="flex-1 text-center">
                <Badge variant="outline" className="mb-1">
                  Aula {lesson.order_number}
                </Badge>
                <h1 className="font-semibold text-foreground truncate">{lesson.title}</h1>
              </div>
              
              {/* Navigation Buttons */}
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
          </header>

          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Video Player - Takes 3 columns */}
                <div className="xl:col-span-3">
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
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-foreground mb-2">{lesson.title}</h2>
                          {lesson.description && (
                            <p className="text-muted-foreground leading-relaxed">{lesson.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1 ml-4 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {lesson.duration || 5} min
                        </Badge>
                      </div>
                      
                      {/* Progress indicator */}
                      {lessonProgress[lesson.id]?.progress_percentage > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                            <span>Progresso da aula</span>
                            <span>{lessonProgress[lesson.id].progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${lessonProgress[lesson.id].progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar - Takes 1 column */}
                <div className="xl:col-span-1 space-y-6">
                  {/* Rating */}
                  <LessonRating
                    userRating={userRating}
                    onRating={handleRating}
                  />

                  {/* Comments */}
                  <LessonComments
                    comments={comments[lesson.id] || []}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    onSubmitComment={handleSubmitComment}
                    isAuthenticated={!!student}
                  />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
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