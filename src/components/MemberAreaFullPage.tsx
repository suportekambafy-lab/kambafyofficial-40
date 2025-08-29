import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Play, Lock, CheckCircle, Star, ArrowLeft, AlertCircle, Menu, ChevronDown, ChevronUp, MessageCircle, Send, BookOpen, Users, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useMemberAreaAuth } from "@/contexts/MemberAreaAuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import VideoPlayer from "@/components/ui/video-player";
import type { Lesson, Module, MemberArea } from "@/types/memberArea";

interface MemberAreaFullPageProps {
  memberArea: MemberArea;
  lessons: Lesson[];
  modules?: Module[];
}

export default function MemberAreaFullPage({ memberArea, lessons, modules = [] }: MemberAreaFullPageProps) {
  const { toast } = useToast();
  const { student, logout } = useMemberAreaAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const publishedLessons = lessons.filter(lesson => lesson.status === 'published').sort((a, b) => a.order_number - b.order_number);
  const publishedModules = modules.filter(module => module.status === 'published').sort((a, b) => a.order_number - b.order_number);
  
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [activeTab, setActiveTab] = useState("lessons");
  const videoRef = useRef<HTMLVideoElement>(null);

  const { 
    lessonProgress, 
    comments, 
    updateLessonProgress, 
    saveRating, 
    loadComments, 
    saveComment,
    getCourseProgress 
  } = useLessonProgress(memberArea.id);

  const lessonsWithoutModule = publishedLessons.filter(lesson => !lesson.module_id);
  const lessonsByModule = publishedModules.reduce((acc, module) => {
    acc[module.id] = publishedLessons.filter(lesson => lesson.module_id === module.id);
    return acc;
  }, {} as Record<string, Lesson[]>);

  useEffect(() => {
    if (publishedModules.length > 0 && Object.keys(expandedModules).length === 0) {
      const initialState: Record<string, boolean> = {};
      publishedModules.forEach(module => {
        initialState[module.id] = false;
      });
      console.log('Initializing modules as closed:', initialState);
      setExpandedModules(initialState);
    }
  }, [publishedModules, expandedModules]);

  useEffect(() => {
    if (publishedLessons.length > 0 && !selectedLesson) {
      setSelectedLesson(publishedLessons[0]);
    }
  }, [publishedLessons, selectedLesson]);

  useEffect(() => {
    if (selectedLesson) {
      loadComments(selectedLesson.id);
      setUserRating(lessonProgress[selectedLesson.id]?.rating || 0);
    }
  }, [selectedLesson, loadComments, lessonProgress]);

  const handleLessonSelect = (lesson: Lesson) => {
    console.log('Selecting lesson:', lesson.title, lesson.video_url);
    setSelectedLesson(lesson);
    setVideoError(false);
    setShowComments(false);
  };

  const toggleModule = (moduleId: string) => {
    console.log('Toggling module:', moduleId, 'current state:', expandedModules[moduleId]);
    setExpandedModules(prev => {
      const newValue = !prev[moduleId];
      const newState = { ...prev, [moduleId]: newValue };
      console.log('Module toggle - new state:', newState);
      return newState;
    });
  };

  const handleVideoError = () => {
    console.error('Video error for lesson:', selectedLesson?.title);
    setVideoError(true);
    toast({
      title: "Erro no vídeo",
      description: "Não foi possível carregar o vídeo. Verifique se a URL está correta.",
      variant: "destructive"
    });
  };

  const handleVideoLoadedMetadata = () => {
    console.log('Video metadata loaded successfully');
    setVideoError(false);
    if (selectedLesson) {
      const durationInMinutes = 5; // Default fallback
      setVideoDurations(prev => ({
        ...prev,
        [selectedLesson.id]: durationInMinutes
      }));
    }
  };

  const handleVideoTimeUpdate = () => {
    if (selectedLesson) {
      // Progress tracking will be handled by the custom video player
    }
  };

  const handleRating = (rating: number) => {
    if (selectedLesson) {
      setUserRating(rating);
      saveRating(selectedLesson.id, rating);
    }
  };

  const handleSubmitComment = async () => {
    if (selectedLesson && newComment.trim()) {
      await saveComment(selectedLesson.id, newComment);
      setNewComment("");
    }
  };

  const getLessonDuration = (lesson: Lesson) => {
    return videoDurations[lesson.id] || lesson.duration || 5;
  };

  const getNextLesson = () => {
    if (!selectedLesson) return null;
    const currentIndex = publishedLessons.findIndex(l => l.id === selectedLesson.id);
    return currentIndex < publishedLessons.length - 1 ? publishedLessons[currentIndex + 1] : null;
  };

  const handleNextLesson = () => {
    const nextLesson = getNextLesson();
    if (nextLesson) {
      handleLessonSelect(nextLesson);
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress[lessonId]?.completed || false;
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso"
      });
      navigate(`/login/${memberArea.id}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    }
  };

  const renderLessonCard = (lesson: Lesson, index: number) => (
    <Card 
      key={lesson.id} 
      className={`cursor-pointer transition-all duration-200 ${
        selectedLesson?.id === lesson.id 
          ? 'ring-2 ring-blue-500 bg-blue-50' 
          : 'hover:bg-gray-50'
      }`}
      onClick={() => handleLessonSelect(lesson)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
              selectedLesson?.id === lesson.id ? 'bg-blue-600' : 'bg-gray-200'
            }`}>
              {lesson.video_url ? (
                <Play className={`h-3 w-3 sm:h-4 sm:w-4 ${selectedLesson?.id === lesson.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              ) : (
                <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground truncate">{lesson.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden sm:block">{lesson.description}</p>
              </div>
              {isLessonCompleted(lesson.id) && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 ml-2" />
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {getLessonDuration(lesson)} min
              </Badge>
              <span className="text-xs text-muted-foreground">#{lesson.order_number}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLessonsContent = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Conteúdo do Curso</h3>
        {getNextLesson() && selectedLesson && isMobile && (
          <Button 
            onClick={handleNextLesson}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Play className="h-3 w-3 mr-1" />
            Próxima
          </Button>
        )}
      </div>
      
      {publishedModules.map((module) => {
        const moduleLessons = lessonsByModule[module.id] || [];
        const isExpanded = expandedModules[module.id] === true;
        
        return (
          <div key={module.id} className="space-y-2">
            <div 
              className="flex items-center justify-between p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => toggleModule(module.id)}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{module.title}</h4>
                <p className="text-xs text-muted-foreground">{moduleLessons.length} aula{moduleLessons.length !== 1 ? 's' : ''}</p>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            
            {isExpanded && (
              <div className="ml-4 space-y-2">
                {moduleLessons.map((lesson, index) => renderLessonCard(lesson, index))}
              </div>
            )}
          </div>
        );
      })}
      
      {lessonsWithoutModule.length > 0 && (
        <div className="space-y-2">
          {publishedModules.length > 0 && (
            <h4 className="font-medium text-foreground mt-4">Outras Aulas</h4>
          )}
          {lessonsWithoutModule.map((lesson, index) => renderLessonCard(lesson, index))}
        </div>
      )}
    </div>
  );

  const renderCommentsContent = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Comentários</h3>
        {selectedLesson && isMobile && (
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`h-4 w-4 cursor-pointer ${
                  i < userRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                }`}
                onClick={() => handleRating(i + 1)}
              />
            ))}
          </div>
        )}
      </div>
      
          {student && (
        <div className="space-y-2">
          <Textarea
            placeholder="Adicione um comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <Button 
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            size="sm"
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {comments[selectedLesson?.id || '']?.map((comment) => (
          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{comment.user_name}</span>
              <span className="text-xs text-gray-500">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-700">{comment.comment}</p>
          </div>
        )) || (
          <p className="text-gray-500 text-sm">Nenhum comentário ainda. Seja o primeiro!</p>
        )}
      </div>
    </div>
  );

  const renderProgressContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Progresso do Curso</h3>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
          style={{ 
            width: `${getCourseProgress(publishedLessons.length)}%`
          }}
        ></div>
      </div>
      <p className="text-sm text-gray-600">
        {Object.values(lessonProgress).filter(p => p.completed).length} de {publishedLessons.length} aulas concluídas ({getCourseProgress(publishedLessons.length)}%)
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-card border-b shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">K</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 truncate">{memberArea.name}</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex-shrink-0"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        <div className="bg-[hsl(var(--video-bg))] relative" style={{ aspectRatio: '16/9' }}>
          {selectedLesson ? (
            <>
              {!videoError ? (
                <VideoPlayer
                  src={selectedLesson.video_url || ''}
                  onError={handleVideoError}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onTimeUpdate={handleVideoTimeUpdate}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-primary-foreground">
                  <div className="text-center p-4">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
                    <h3 className="text-lg font-semibold mb-2">Erro ao carregar vídeo</h3>
                    <p className="text-gray-300 mb-3 text-sm">Não foi possível reproduzir este vídeo</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setVideoError(false)}
                      className="bg-[hsl(var(--video-overlay))] border-[hsl(var(--video-controls))] text-primary-foreground hover:bg-[hsl(var(--video-controls))]"
                      size="sm"
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              )}

              {!videoError && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                  <h2 className="text-base font-bold text-primary-foreground mb-1 truncate">{selectedLesson.title}</h2>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-xs">Aula #{selectedLesson.order_number}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900">
              <div className="text-center text-primary-foreground p-4">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-700 rounded-full flex items-center justify-center">
                  <Play className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {publishedLessons.length > 0 ? 'Selecione uma aula' : 'Nenhuma aula disponível'}
                </h3>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border-t flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 h-12 rounded-none">
              <TabsTrigger value="lessons" className="flex items-center space-x-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs">Aulas</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center space-x-1">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">Comentários</span>
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Progresso</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="lessons" className="p-4 h-full overflow-y-auto m-0">
                {renderLessonsContent()}
              </TabsContent>
              
              <TabsContent value="comments" className="p-4 h-full overflow-y-auto m-0">
                {renderCommentsContent()}
              </TabsContent>
              
              <TabsContent value="progress" className="p-4 h-full overflow-y-auto m-0">
                {renderProgressContent()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-card border-b border-border shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-sm sm:text-lg">K</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{memberArea.name}</h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1 flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-full overflow-hidden flex-1">
        <aside className={`${
          showSidebar ? 'w-full sm:w-80' : 'w-0'
        } transition-all duration-300 overflow-hidden bg-card border-r border-border flex-shrink-0 ${
          showSidebar ? 'block' : 'hidden'
        } lg:block lg:w-80`}>
          <div className="p-4 sm:p-6 h-full overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Progresso do Curso</h2>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${getCourseProgress(publishedLessons.length)}%`
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {Object.values(lessonProgress).filter(p => p.completed).length} de {publishedLessons.length} aulas concluídas
              </p>
            </div>

            {renderLessonsContent()}
          </div>
        </aside>

        <main className="flex-1 overflow-hidden flex flex-col">
          {selectedLesson ? (
            <>
              <div className="flex-1 bg-[hsl(var(--video-bg))] relative">
                {!videoError ? (
                  <VideoPlayer
                    src={selectedLesson.video_url || ''}
                    onError={handleVideoError}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onTimeUpdate={handleVideoTimeUpdate}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-primary-foreground">
                    <div className="text-center">
                      <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                      <h3 className="text-xl font-semibold mb-2">Erro ao carregar vídeo</h3>
                      <p className="text-gray-300 mb-4">Não foi possível reproduzir este vídeo</p>
                      <p className="text-sm text-gray-400 mb-4 break-all px-4">URL: {selectedLesson.video_url}</p>
                      <Button 
                        variant="outline" 
                        onClick={() => setVideoError(false)}
                        className="bg-[hsl(var(--video-overlay))] border-[hsl(var(--video-controls))] text-primary-foreground hover:bg-[hsl(var(--video-controls))]"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                )}

                {!videoError && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6">
                    <div className="max-w-4xl">
                      <h2 className="text-xl sm:text-2xl font-bold text-primary-foreground mb-2">{selectedLesson.title}</h2>
                      <p className="text-gray-200 mb-4 text-sm sm:text-base">{selectedLesson.description}</p>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 cursor-pointer ${
                                  i < userRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                                }`}
                                onClick={() => handleRating(i + 1)}
                              />
                            ))}
                          </div>
                          <span className="text-gray-300 text-sm">Aula {selectedLesson.order_number}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            onClick={() => setShowComments(!showComments)}
                            variant="outline"
                            size="sm"
                            className="bg-[hsl(var(--video-overlay))] border-[hsl(var(--video-controls))] text-primary-foreground hover:bg-[hsl(var(--video-controls))]"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Comentários ({comments[selectedLesson.id]?.length || 0})
                          </Button>
                          {getNextLesson() && (
                            <Button 
                              onClick={handleNextLesson}
                              className="bg-blue-600 hover:bg-blue-700"
                              size="sm"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Próxima
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {showComments && (
                <div className="bg-card border-t border-border max-h-80 overflow-y-auto">
                  <div className="p-4 sm:p-6">
                    {renderCommentsContent()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-16 sm:w-24 h-16 sm:h-24 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <Play className="h-8 sm:h-12 w-8 sm:w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {publishedLessons.length > 0 ? 'Selecione uma aula' : 'Nenhuma aula disponível'}
                </h3>
                <p className="text-gray-600">
                  {publishedLessons.length > 0 
                    ? 'Escolha uma aula na barra lateral para começar' 
                    : 'Publique algumas aulas para que apareçam aqui.'
                  }
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
