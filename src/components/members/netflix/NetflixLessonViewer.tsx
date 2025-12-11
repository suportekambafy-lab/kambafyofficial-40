import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Play, RotateCcw, SkipForward, ChevronDown, ChevronUp, Clock, CheckCircle2, FileText, Link as LinkIcon, Info, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Lesson, Module } from '@/types/memberArea';
import VideoPlayer from '@/components/ui/video-player';
import { LessonReleaseTimer } from '@/components/ui/lesson-release-timer';
import { cn } from '@/lib/utils';

interface NetflixLessonViewerProps {
  lesson: Lesson;
  lessons: Lesson[];
  modules: Module[];
  lessonProgress?: Record<string, any>;
  memberArea: {
    logo_url?: string;
    name: string;
  };
  onNavigateLesson: (lessonId: string) => void;
  onClose: () => void;
  onUpdateProgress?: (lessonId: string, currentTime: number, duration: number) => void;
}

export function NetflixLessonViewer({
  lesson,
  lessons = [],
  modules = [],
  lessonProgress = {},
  memberArea,
  onNavigateLesson,
  onClose,
  onUpdateProgress
}: NetflixLessonViewerProps) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(10);
  const [videoKey, setVideoKey] = useState(0);
  const [shouldRestart, setShouldRestart] = useState(false);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [showLessonList, setShowLessonList] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentProgress = lesson?.id ? lessonProgress[lesson.id] : null;
  const startTime = shouldRestart ? 0 : currentProgress?.video_current_time || 0;
  const currentIndex = lesson?.id ? lessons.findIndex(l => l.id === lesson.id) : -1;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  // Get current module
  const currentModule = modules.find(m => m.id === lesson.module_id);
  const moduleLessons = lessons.filter(l => l.module_id === lesson.module_id);

  // Verificar se a aula está agendada
  const isScheduled = lesson?.is_scheduled && lesson?.scheduled_at;
  const isNotYetReleased = isScheduled && new Date(lesson.scheduled_at!) > new Date();

  // Derivar HLS URL
  const getHlsUrl = () => {
    if (!lesson) return null;
    if (lesson.hls_url && !lesson.hls_url.includes('vimeo.com')) {
      if (lesson.hls_url.includes('vz-5c879716-268.b-cdn.net')) {
        const videoId = lesson.hls_url.split('/')[3];
        return `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/bunny-proxy/video/${videoId}/playlist.m3u8`;
      }
      return lesson.hls_url;
    }
    const embedUrl = lesson.bunny_embed_url || lesson.video_url;
    if (embedUrl?.includes('iframe.mediadelivery.net/embed/')) {
      const videoId = embedUrl.split('/').pop();
      return `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/bunny-proxy/video/${videoId}/playlist.m3u8`;
    }
    return null;
  };
  const hlsUrl = getHlsUrl();

  // Countdown quando vídeo termina
  useEffect(() => {
    if (videoEnded && nextLesson && autoplayCountdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setAutoplayCountdown(prev => prev - 1);
      }, 1000);
    } else if (videoEnded && nextLesson && autoplayCountdown === 0) {
      onNavigateLesson(nextLesson.id);
    }
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [videoEnded, autoplayCountdown, nextLesson]);

  // Reset estados quando mudar de aula
  useEffect(() => {
    setVideoEnded(false);
    setAutoplayCountdown(10);
    setShouldRestart(false);
    setIsReplayMode(false);
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }
  }, [lesson?.id]);
  const handleVideoEnd = () => {
    setVideoEnded(true);
    setAutoplayCountdown(10);
    setIsReplayMode(false);
    setShouldRestart(false);
  };
  const handleReplay = () => {
    setVideoEnded(false);
    setAutoplayCountdown(10);
    setIsReplayMode(true);
    setShouldRestart(true);
    setVideoKey(prev => prev + 1);
  };
  const handleNextLesson = () => {
    if (nextLesson) {
      onNavigateLesson(nextLesson.id);
    }
  };
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };
  const getLessonThumbnail = (l: Lesson) => {
    if (l.video_data?.thumbnail) return l.video_data.thumbnail as string;
    if (l.hls_url) {
      const match = l.hls_url.match(/^(https:\/\/[^/]+\/[^/]+)/);
      if (match) return `${match[1]}/thumbnail.jpg`;
    }
    return undefined;
  };
  // Render lesson item for sidebar
  const renderLessonItem = (l: Lesson, index: number, compact = false) => {
    const isActive = l.id === lesson.id;
    const isCompleted = lessonProgress[l.id]?.completed;
    const progress = lessonProgress[l.id]?.progress_percentage || 0;
    
    return (
      <button 
        key={l.id} 
        onClick={() => !isActive && onNavigateLesson(l.id)} 
        className={cn(
          "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
          isActive ? "bg-netflix-green/10 border-l-2 border-netflix-green" : "hover:bg-white/5"
        )}
      >
        {/* Thumbnail */}
        <div className={cn(
          "relative rounded-lg overflow-hidden flex-shrink-0 bg-white/10",
          compact ? "w-16 h-10" : "w-24 h-14"
        )}>
          {getLessonThumbnail(l) ? (
            <img src={getLessonThumbnail(l)} alt={l.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-4 h-4 text-white/30" />
            </div>
          )}
          {progress > 0 && !isCompleted && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <div className="h-full bg-netflix-green" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">{index + 1}</span>
            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-netflix-green" />}
          </div>
          <h4 className={cn("text-sm font-medium line-clamp-1", isActive ? "text-netflix-green" : "text-white")}>
            {l.title}
          </h4>
          {l.duration > 0 && (
            <span className="text-xs text-white/40">{formatDuration(l.duration)}</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen netflix-member-area" style={{
      background: 'hsl(30 20% 12%)',
      color: 'hsl(40 20% 95%)'
    }}>
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-3 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {memberArea.logo_url && <img src={memberArea.logo_url} alt={memberArea.name} className="h-6 object-contain" />}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-white/70 hidden md:block">
              {currentModule?.title}
            </div>
            {/* Sidebar Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex text-white hover:bg-white/10 rounded-full"
            >
              {sidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Fixed Video + Sidebar Container */}
      <div className="fixed top-[52px] left-0 right-0 z-40 bg-black">
        <div className="flex">
          {/* Video Section - Adapts to sidebar */}
          <div className={cn(
            "flex-1 transition-all duration-300",
            sidebarOpen ? "lg:mr-80 xl:mr-96" : ""
          )}>
            <div className="relative w-full bg-black">
              {isNotYetReleased ? (
                <div className="aspect-video max-h-[50vh] lg:max-h-[60vh]">
                  <LessonReleaseTimer releaseDate={new Date(lesson.scheduled_at!)} lessonTitle={lesson.title} />
                </div>
              ) : hlsUrl || lesson.video_url || lesson.bunny_embed_url ? (
                <div className="w-full aspect-video max-h-[50vh] lg:max-h-[60vh] relative">
                  <VideoPlayer 
                    key={`${lesson.id}-${videoKey}`} 
                    hlsUrl={hlsUrl || undefined} 
                    embedUrl={lesson.bunny_embed_url || lesson.video_url || undefined} 
                    startTime={startTime}
                    autoPlay={true}
                    onTimeUpdate={onUpdateProgress && !isReplayMode ? (currentTime, duration) => {
                      onUpdateProgress(lesson.id, currentTime, duration);
                    } : undefined} 
                    onEnded={handleVideoEnd} 
                  />
                  
                  {/* Video End Overlay */}
                  <AnimatePresence>
                    {videoEnded && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-black/95 flex items-center justify-center z-50"
                      >
                        <div className="w-full max-w-xl text-center space-y-4 p-6">
                          {nextLesson && (
                            <motion.div 
                              initial={{ y: 20, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }} 
                              className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2"
                            >
                              <p className="text-sm text-white/60">Próxima aula</p>
                              <h4 className="text-base font-semibold text-white line-clamp-2">
                                {nextLesson.title}
                              </h4>
                              <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                                <span>Iniciando em</span>
                                <span className="text-2xl font-bold text-netflix-green">
                                  {autoplayCountdown}s
                                </span>
                              </div>
                            </motion.div>
                          )}

                          <motion.div 
                            initial={{ y: 20, opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            transition={{ delay: 0.1 }} 
                            className="flex gap-3 justify-center"
                          >
                            <Button onClick={handleReplay} variant="outline" size="sm" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
                              <RotateCcw className="h-4 w-4" />
                              Repetir
                            </Button>
                            
                            {nextLesson && (
                              <Button onClick={handleNextLesson} size="sm" className="gap-2 bg-netflix-green hover:bg-netflix-green/90 text-black font-bold">
                                <SkipForward className="h-4 w-4" />
                                Próxima
                              </Button>
                            )}
                          </motion.div>

                          {nextLesson && <Progress value={(10 - autoplayCountdown) * 10} className="h-1 bg-white/20" />}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="aspect-video max-h-[50vh] lg:max-h-[60vh] flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-stone-900">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
                      <Play className="h-6 w-6 text-white/40" />
                    </div>
                    <p className="text-white/40 text-sm">Nenhum vídeo disponível</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Fixed alongside video */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="hidden lg:block w-80 xl:w-96 bg-black/60 backdrop-blur-sm border-l border-white/10 overflow-hidden"
              >
                <div className="flex flex-col h-full max-h-[50vh] lg:max-h-[60vh]">
                  {/* Sidebar Header */}
                  <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">Aulas do Módulo</span>
                        <Badge variant="secondary" className="bg-white/10 text-white/70 border-0 text-xs">
                          {moduleLessons.length}
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSidebarOpen(false)}
                        className="text-white/60 hover:text-white hover:bg-white/10 h-7 w-7"
                      >
                        <PanelRightClose className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Lesson List */}
                  <div className="flex-1 overflow-y-auto">
                    {moduleLessons.map((l, index) => renderLessonItem(l, index, true))}
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scrollable Content - Below fixed video */}
      <div 
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "lg:mr-80 xl:mr-96" : ""
        )}
        style={{ marginTop: 'calc(52px + 50vh)', minHeight: '50vh' }}
      >
        <div className="px-4 md:px-8 lg:px-12 py-6">
          <div className="max-w-4xl">
            {/* Navigation Buttons */}
            <div className="flex justify-between mb-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => prevLesson && onNavigateLesson(prevLesson.id)} 
                disabled={!prevLesson} 
                className="gap-2 text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                Anterior
              </Button>
              <Button 
                size="sm"
                onClick={() => nextLesson && onNavigateLesson(nextLesson.id)} 
                disabled={!nextLesson} 
                className="gap-2 bg-netflix-green hover:bg-netflix-green/90 text-black font-bold"
              >
                Próxima
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Title & Meta */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="bg-netflix-green/20 text-netflix-green border-0 text-xs">
                  {currentModule?.title}
                </Badge>
                {lesson.duration > 0 && (
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    <Clock className="w-3 h-3" />
                    {formatDuration(lesson.duration)}
                  </span>
                )}
                {currentProgress?.completed && (
                  <Badge className="bg-white/10 text-white/70 border-0 gap-1 text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Concluída
                  </Badge>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                {lesson.title}
              </h1>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="about" className="mb-6">
              <TabsList className="bg-white/5 border border-white/10 p-1 h-auto">
                <TabsTrigger value="about" className="data-[state=active]:bg-netflix-green data-[state=active]:text-black text-white/70 gap-2 text-sm">
                  <Info className="w-3.5 h-3.5" />
                  Sobre
                </TabsTrigger>
                {lesson.lesson_materials && (lesson.lesson_materials as any[]).length > 0 && (
                  <TabsTrigger value="materials" className="data-[state=active]:bg-netflix-green data-[state=active]:text-black text-white/70 gap-2 text-sm">
                    <FileText className="w-3.5 h-3.5" />
                    Materiais
                    <Badge className="bg-white/20 text-white/80 border-0 text-xs ml-1">
                      {(lesson.lesson_materials as any[]).length}
                    </Badge>
                  </TabsTrigger>
                )}
                {lesson.complementary_links && (lesson.complementary_links as any[]).length > 0 && (
                  <TabsTrigger value="links" className="data-[state=active]:bg-netflix-green data-[state=active]:text-black text-white/70 gap-2 text-sm">
                    <LinkIcon className="w-3.5 h-3.5" />
                    Links
                    <Badge className="bg-white/20 text-white/80 border-0 text-xs ml-1">
                      {(lesson.complementary_links as any[]).length}
                    </Badge>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="about" className="mt-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  {lesson.description ? (
                    <p className="text-white/70 leading-relaxed whitespace-pre-wrap text-sm">
                      {lesson.description}
                    </p>
                  ) : (
                    <p className="text-white/40 italic text-sm">Nenhuma descrição disponível para esta aula.</p>
                  )}
                </div>
              </TabsContent>

              {lesson.lesson_materials && (lesson.lesson_materials as any[]).length > 0 && (
                <TabsContent value="materials" className="mt-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="grid gap-2">
                      {(lesson.lesson_materials as any[]).map((material, i) => (
                        <a 
                          key={i} 
                          href={material.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-netflix-green/20 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-netflix-green" />
                          </div>
                          <span className="text-white/80 group-hover:text-netflix-green transition-colors text-sm">
                            {material.name || `Material ${i + 1}`}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              )}

              {lesson.complementary_links && (lesson.complementary_links as any[]).length > 0 && (
                <TabsContent value="links" className="mt-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="grid gap-2">
                      {(lesson.complementary_links as any[]).map((link, i) => (
                        <a 
                          key={i} 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-netflix-green/20 flex items-center justify-center">
                            <LinkIcon className="w-4 h-4 text-netflix-green" />
                          </div>
                          <span className="text-white/80 group-hover:text-netflix-green transition-colors text-sm">
                            {link.title || link.url}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {/* Module Lessons List - Mobile Only */}
            <div className="lg:hidden bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <button 
                onClick={() => setShowLessonList(!showLessonList)} 
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">Aulas do Módulo</span>
                  <Badge variant="secondary" className="bg-white/10 text-white/70 border-0 text-xs">
                    {moduleLessons.length}
                  </Badge>
                </div>
                {showLessonList ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
              </button>
              
              <AnimatePresence>
                {showLessonList && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="border-t border-white/10"
                  >
                    <div className="max-h-80 overflow-y-auto">
                      {moduleLessons.map((l, index) => renderLessonItem(l, index))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}