import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Play, Lock, CheckCircle, Star, X, AlertCircle, Menu, ChevronDown, ChevronUp, MessageCircle, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAuth } from "@/contexts/AuthContext";
import VideoPlayer from "@/components/ui/video-player";
import { MemberAreaSlideMenu } from "@/components/MemberAreaSlideMenu";
import type { Lesson, Module, MemberArea } from "@/types/memberArea";

interface MemberAreaPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberArea: MemberArea;
  lessons: Lesson[];
  modules?: Module[];
}

export default function MemberAreaPreview({ open, onOpenChange, memberArea, lessons, modules = [] }: MemberAreaPreviewProps) {
  const { toast } = useToast();
  const { user } = useAuth();
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

  // Organizar aulas por módulos
  const lessonsWithoutModule = publishedLessons.filter(lesson => !lesson.module_id);
  const lessonsByModule = publishedModules.reduce((acc, module) => {
    acc[module.id] = publishedLessons.filter(lesson => lesson.module_id === module.id);
    return acc;
  }, {} as Record<string, Lesson[]>);

  // Expandir todos os módulos por padrão
  useEffect(() => {
    const initialExpanded = publishedModules.reduce((acc, module) => {
      acc[module.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedModules(initialExpanded);
  }, [publishedModules]);

  // Selecionar primeira aula quando abrir o modal
  useEffect(() => {
    if (open && publishedLessons.length > 0 && !selectedLesson) {
      setSelectedLesson(publishedLessons[0]);
    }
  }, [open, publishedLessons, selectedLesson]);

  // Carregar comentários quando selecionar aula
  useEffect(() => {
    if (selectedLesson) {
      loadComments(selectedLesson.id);
      setUserRating(lessonProgress[selectedLesson.id]?.rating || 0);
    }
  }, [selectedLesson, loadComments, lessonProgress]);

  // Limpar estado quando fechar o modal
  useEffect(() => {
    if (!open) {
      setSelectedLesson(null);
      setVideoError(false);
      setVideoDurations({});
      setShowComments(false);
      setNewComment("");
    }
  }, [open]);

  const handleLessonSelect = (lesson: Lesson) => {
    console.log('Selecting lesson:', lesson.title, lesson.video_url);
    setSelectedLesson(lesson);
    setVideoError(false);
    setShowComments(false);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
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
      // Duration will be handled by the custom video player
      const durationInMinutes = 5; // Default fallback
      setVideoDurations(prev => ({
        ...prev,
        [selectedLesson.id]: durationInMinutes
      }));
    }
  };

  const handleVideoTimeUpdate = () => {
    if (selectedLesson) {
      // This will be handled by the custom video player internally
      // We can add progress tracking logic here if needed
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
                <Play className={`h-3 w-3 sm:h-4 sm:w-4 ${selectedLesson?.id === lesson.id ? 'text-white' : 'text-gray-600'}`} />
              ) : (
                <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 truncate">{lesson.title}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 hidden sm:block">{lesson.description}</p>
              </div>
              {isLessonCompleted(lesson.id) && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 ml-2" />
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {getLessonDuration(lesson)} min
              </Badge>
              <span className="text-xs text-gray-400">#{lesson.order_number}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!memberArea) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden">
        {/* Menu Slide Lateral */}
        <MemberAreaSlideMenu
          lessons={lessons}
          modules={modules}
          lessonProgress={lessonProgress}
          getCourseProgress={getCourseProgress}
          totalDuration={publishedLessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0)}
          completedLessons={Object.values(lessonProgress).filter(p => p.completed).length}
          onLessonSelect={setSelectedLesson}
        />
        
        <div className="h-[90vh] bg-gray-50 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b shadow-sm flex-shrink-0">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4">
              <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm sm:text-lg">K</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{memberArea.name}</h1>
                  <p className="text-xs text-gray-500">👉 Use o menu lateral direito para progresso e pesquisa</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <div className="flex h-full overflow-hidden">
            {/* Sidebar */}
            <aside className={`${
              showSidebar ? 'w-full sm:w-80' : 'w-0'
            } transition-all duration-300 overflow-hidden bg-white border-r flex-shrink-0 ${
              showSidebar ? 'block' : 'hidden'
            } lg:block lg:w-80`}>
              <div className="p-4 sm:p-6 h-full overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700">Conteúdo do Curso</h3>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      {publishedLessons.length} aulas
                    </Badge>
                  </div>
                  
                  {/* Módulos com suas aulas */}
                  {publishedModules.map((module) => {
                    const moduleLessons = lessonsByModule[module.id] || [];
                    const isExpanded = expandedModules[module.id];
                    
                    return (
                      <div key={module.id} className="space-y-2">
                        <div 
                          className="flex items-center justify-between p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => toggleModule(module.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{module.title}</h4>
                            <p className="text-xs text-gray-600">{moduleLessons.length} aula{moduleLessons.length !== 1 ? 's' : ''}</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-600 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />
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
                  
                  {/* Aulas sem módulo */}
                  {lessonsWithoutModule.length > 0 && (
                    <div className="space-y-2">
                      {publishedModules.length > 0 && (
                        <h4 className="font-medium text-gray-700 mt-4">Outras Aulas</h4>
                      )}
                      {lessonsWithoutModule.map((lesson, index) => renderLessonCard(lesson, index))}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Main Content - Video Player */}
            <main className="flex-1 overflow-hidden flex flex-col">
              {selectedLesson ? (
                <>
                  <div className="flex-1 bg-black relative">
                    {!videoError ? (
                      <VideoPlayer
                        src={selectedLesson.video_url || ''}
                        onError={handleVideoError}
                        onLoadedMetadata={handleVideoLoadedMetadata}
                        onTimeUpdate={handleVideoTimeUpdate}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-white">
                        <div className="text-center">
                          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                          <h3 className="text-xl font-semibold mb-2">Erro ao carregar vídeo</h3>
                          <p className="text-gray-300 mb-4">Não foi possível reproduzir este vídeo</p>
                          <p className="text-sm text-gray-400 mb-4 break-all px-4">URL: {selectedLesson.video_url}</p>
                          <Button 
                            variant="outline" 
                            onClick={() => setVideoError(false)}
                            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                          >
                            Tentar novamente
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Video Info Overlay */}
                    {!videoError && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6">
                        <div className="max-w-4xl">
                          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{selectedLesson.title}</h2>
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
                                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
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

                  {/* Comments Section */}
                  {showComments && (
                    <div className="bg-white border-t max-h-80 overflow-y-auto">
                      <div className="p-4 sm:p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Comentários</h3>
                        
                        {/* Add comment */}
                        {user && (
                          <div className="mb-4">
                            <Textarea
                              placeholder="Adicione um comentário..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="mb-2"
                              rows={3}
                            />
                            <Button 
                              onClick={handleSubmitComment}
                              disabled={!newComment.trim()}
                              size="sm"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar
                            </Button>
                          </div>
                        )}

                        {/* Comments list */}
                        <div className="space-y-3">
                          {comments[selectedLesson.id]?.map((comment) => (
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
      </DialogContent>
    </Dialog>
  );
}
