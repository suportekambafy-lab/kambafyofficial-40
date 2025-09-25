import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  BookOpen, 
  LogOut, 
  Clock, 
  Users, 
  Star,
  Search,
  Filter,
  GraduationCap,
  Trophy,
  Target,
  CheckCircle2,
  PlayCircle,
  MoreVertical,
  ArrowLeft,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useModernMembersAuth } from './ModernMembersAuth';
import { ModernLessonViewer } from './ModernLessonViewer';
import { MemberAreaSlideMenu } from '../MemberAreaSlideMenu';
import { Lesson, Module } from '@/types/memberArea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLessonProgress } from '@/hooks/useLessonProgress';

// Função para detectar e atualizar duração do vídeo automaticamente
const detectAndUpdateVideoDuration = async (lesson: Lesson) => {
  return new Promise<void>((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    
    video.onloadedmetadata = async () => {
      const durationInSeconds = Math.round(video.duration);
      console.log(`🎬 Duração detectada para "${lesson.title}": ${durationInSeconds}s`);
      
      if (durationInSeconds > 0) {
        try {
          const { error } = await supabase
            .from('lessons')
            .update({ duration: durationInSeconds })
            .eq('id', lesson.id);
            
          if (error) {
            console.error('❌ Erro ao atualizar duração:', error);
          } else {
            console.log(`✅ Duração atualizada no banco: ${lesson.title}`);
          }
        } catch (err) {
          console.error('❌ Erro na atualização:', err);
        }
      }
      resolve();
    };
    
    video.onerror = () => {
      console.log(`❌ Erro ao carregar vídeo: ${lesson.title}`);
      resolve();
    };
    
    // Para vídeos Bunny.net embed não conseguimos detectar automaticamente
    if (lesson.video_url && !lesson.video_url.includes('mediadelivery.net/embed')) {
      video.src = lesson.video_url;
    } else {
      console.log(`⚠️ Vídeo embed detectado (${lesson.title}) - duração deve ser inserida manualmente`);
      resolve();
    }
  });
};

export default function ModernMembersArea() {
  const { id: memberAreaId } = useParams();
  const { session, memberArea, isAuthenticated, logout, isLoading: authLoading } = useModernMembersAuth();
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const isMobile = useIsMobile();

  // Hook de progresso das aulas
  const { 
    lessonProgress, 
    updateVideoProgress,
    getCourseProgress,
    isLoadingProgress
  } = useLessonProgress(memberAreaId || '', session?.studentEmail);

  console.log('🎬 ModernMembersArea render:', { 
    memberAreaId, 
    isAuthenticated, 
    sessionExists: !!session,
    memberAreaExists: !!memberArea,
    authLoading 
  });

  // Redirect para login se não autenticado - usar useEffect para evitar render condicional
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !session)) {
      console.log('🔄 ModernMembersArea: Redirecionando para login - não autenticado');
      // Usar window.location para evitar problemas de hooks
      window.location.href = `/members/login/${memberAreaId}`;
    }
  }, [authLoading, isAuthenticated, session, memberAreaId]);

  // Carregar conteúdo da área
  useEffect(() => {
    if (!session || !memberAreaId || !isAuthenticated) {
      console.log('ℹ️ ModernMembersArea: Aguardando autenticação...');
      return;
    }

    console.log('📥 ModernMembersArea: Carregando conteúdo...');
    
    const loadContent = async () => {
      try {
        setIsLoading(true);
        
        // Carregar lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');

        if (!lessonsError && lessonsData) {
          console.log('✅ ModernMembersArea: Lessons carregadas:', lessonsData.length);
          
          // Auto-detectar duração de vídeos que têm duration = 0
          lessonsData.forEach(async (lesson) => {
            if (lesson.duration === 0 && (lesson.video_url || lesson.bunny_embed_url)) {
              console.log('🔍 Detectando duração para:', lesson.title);
              await detectAndUpdateVideoDuration(lesson as Lesson);
            }
          });
          
          setLessons(lessonsData as Lesson[]);
        } else {
          console.error('❌ ModernMembersArea: Erro ao carregar lessons:', lessonsError);
        }

        // Carregar módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');

        if (!modulesError && modulesData) {
          console.log('✅ ModernMembersArea: Módulos carregados:', modulesData.length);
          setModules(modulesData as Module[]);
        } else {
          console.error('❌ ModernMembersArea: Erro ao carregar módulos:', modulesError);
        }

      } catch (error) {
        console.error('❌ ModernMembersArea: Erro inesperado:', error);
        toast.error('Erro ao carregar conteúdo');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [session, memberAreaId, isAuthenticated]);

  // Esconder sidebar automaticamente no mobile quando aula for selecionada
  useEffect(() => {
    if (selectedLesson && isMobile) {
      setSidebarVisible(false);
    } else if (!selectedLesson) {
      setSidebarVisible(true);
    }
  }, [selectedLesson, isMobile]);

  const handleLogout = () => {
    logout();
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleModuleClick = (module: Module) => {
    console.log('📚 Módulo selecionado:', module.title);
    setSelectedModule(module);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
  };

  const handleNavigateLesson = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedLesson(lesson);
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    // Filtrar por módulo se um estiver selecionado
    const matchesModule = !selectedModule || lesson.module_id === selectedModule.id;
    
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'completed' && lessonProgress[lesson.id]?.completed) || 
      (filterStatus === 'pending' && !lessonProgress[lesson.id]?.completed);
      
    return matchesModule && matchesSearch && matchesFilter;
  });

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
          />
          <p className="text-muted-foreground">Carregando sua área de membros...</p>
        </motion.div>
      </div>
    );
  }

  // Calcular duração total em minutos e progresso real
  const totalDuration = Math.round(lessons.reduce((sum, lesson) => sum + lesson.duration, 0) / 60);
  const completedLessons = lessons.filter(lesson => lessonProgress[lesson.id]?.completed).length;
  const courseProgress = getCourseProgress(lessons.length);
  
  console.log('⏱️ Estatísticas do curso:', {
    totalDuration: totalDuration + ' minutos',
    totalLessons: lessons.length,
    completedLessons,
    courseProgress: courseProgress + '%'
  });

  return (
    <div className="min-h-screen bg-gray-950 dark text-white">
      {/* Menu Slide Lateral */}
      <MemberAreaSlideMenu
        lessons={lessons}
        modules={modules}
        lessonProgress={lessonProgress}
        getCourseProgress={getCourseProgress}
        totalDuration={totalDuration}
        completedLessons={completedLessons}
        onLessonSelect={setSelectedLesson}
        onLogout={handleLogout}
      />
      
      {/* Hero Section - Ocultar quando aula selecionada */}
      {!selectedLesson && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative bg-gradient-to-br from-black via-gray-950 to-gray-900 overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
          
          {/* Hero Image Background */}
          {memberArea?.hero_image_url && (
            <div className="absolute inset-0 opacity-40">
              <img 
                src={memberArea.hero_image_url} 
                alt={memberArea.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
            </div>
          )}
          
          <div className="relative container mx-auto px-4 py-20">
            {/* Header */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex justify-between items-center mb-8 absolute top-4 left-4 right-4 z-10"
            >
              <div className="flex items-center gap-3">
                {memberArea?.logo_url ? (
                  <Avatar className="h-12 w-12 ring-2 ring-emerald-400/50">
                    <AvatarImage src={memberArea.logo_url} alt={memberArea.name} />
                    <AvatarFallback className="bg-emerald-600">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="text-white">
                  <p className="text-sm text-emerald-400">Área de Membros</p>
                  <p className="text-sm text-gray-300">Olá, {session?.studentName}</p>
                </div>
              </div>
            </motion.div>

            {/* Course Hero */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-12 mt-20 sm:mt-8"
            >
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-4">
                <Trophy className="h-3 w-3 mr-1" />
                Curso Premium
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {memberArea?.hero_title || memberArea?.name}
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                {memberArea?.hero_description || memberArea?.description}
              </p>
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* Header fixo quando aula selecionada */}
      {selectedLesson && (
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-black/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedLesson(null)} className="text-white hover:text-emerald-400">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                  Aula {lessons.indexOf(selectedLesson) + 1}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-gray-800">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedLesson.duration > 0 ? `${Math.round(selectedLesson.duration / 60)} min` : 'Duração não definida'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarVisible(!sidebarVisible)}
                  className="text-white hover:text-emerald-400"
                >
                  {sidebarVisible ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.header>
      )}

      {/* Main Content Area */}
      <div className="bg-black min-h-screen">
        <div className={selectedLesson ? "" : "container mx-auto px-4 py-12"}>
          
          {/* Layout quando aula selecionada */}
          {selectedLesson ? (
            <div className="flex min-h-screen relative">
              {/* Overlay para mobile */}
              {isMobile && sidebarVisible && (
                <div 
                  className="fixed inset-0 bg-black/50 z-40"
                  onClick={() => setSidebarVisible(false)}
                />
              )}
              
              {/* Área do vídeo */}
              <div className="flex-1 p-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="overflow-hidden mb-6">
                    <ModernLessonViewer
                      lesson={selectedLesson}
                      lessons={lessons}
                      lessonProgress={lessonProgress}
                      onNavigateLesson={handleNavigateLesson}
                      onClose={() => setSelectedLesson(null)}
                      onUpdateProgress={updateVideoProgress}
                    />
                  </Card>
                  
                  {/* Info da aula */}
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-white">{selectedLesson.title}</CardTitle>
                      {selectedLesson.description && (
                        <CardDescription className="text-gray-400 leading-relaxed">
                          {selectedLesson.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </motion.div>
              </div>

              {/* Sidebar com módulos e aulas - condicional */}
              {sidebarVisible && (
                <div className={`bg-gray-950 border-l border-gray-800 p-6 overflow-y-auto ${
                  isMobile ? 'fixed top-0 right-0 h-full w-80 z-50 shadow-2xl' : 'w-96'
                }`}>
                  {isMobile && (
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                      <h3 className="text-lg font-semibold text-white">Lista de Aulas</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarVisible(false)}
                        className="text-white hover:text-emerald-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                  >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-400" />
                      Conteúdo do Curso
                    </h3>
                  </div>

                  {modules.map((module) => {
                    const moduleLessons = lessons.filter(l => l.module_id === module.id);
                    const isExpanded = moduleLessons.some(l => l.id === selectedLesson.id);
                    
                    return (
                      <div key={module.id} className="space-y-3">
                        <div 
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isExpanded ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-gray-800 hover:bg-gray-700'
                          }`}
                          onClick={() => handleModuleClick(module)}
                        >
                          {module.cover_image_url ? (
                            <img 
                              src={module.cover_image_url} 
                              alt={module.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-emerald-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-white text-sm">{module.title}</h4>
                            <p className="text-xs text-gray-400">{moduleLessons.length} aulas</p>
                          </div>
                        </div>

                        {/* Lista de aulas quando expandido */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pl-4 space-y-2"
                            >
                              {moduleLessons.map((lesson) => (
                                <motion.div
                                  key={lesson.id}
                                  whileHover={{ scale: 1.02 }}
                                  className={`p-3 rounded cursor-pointer transition-colors ${
                                    lesson.id === selectedLesson.id 
                                      ? 'bg-emerald-500/20 border-l-4 border-l-emerald-400' 
                                      : 'bg-gray-800/50 hover:bg-gray-800'
                                  }`}
                                  onClick={() => handleLessonClick(lesson)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      <Badge variant="outline" className="text-xs">
                                        {lesson.order_number}
                                      </Badge>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-white line-clamp-1">
                                        {lesson.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Clock className="h-3 w-3 text-gray-400" />
                                        <span className="text-xs text-gray-400">
                                          {Math.round(lesson.duration / 60)} min
                                        </span>
                                        {lesson.id === selectedLesson.id && (
                                          <PlayCircle className="h-3 w-3 text-emerald-400" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                 </motion.div>
                </div>
              )}
            </div>
          ) : (
            /* Layout normal - módulos */
            <div className="grid grid-cols-1 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-3">
                    {selectedModule ? selectedModule.title : 'Módulos do Curso'}
                  </h2>
                  <p className="text-gray-400 text-lg">
                    {selectedModule ? selectedModule.description : 'Escolha um módulo para começar a aprender'}
                  </p>
                </div>

                {modules.length > 0 ? (
                  <div className="relative">
                    {selectedModule ? (
                      /* Aulas do Módulo Selecionado */
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                          <Button 
                            variant="outline" 
                            onClick={handleBackToModules}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border-gray-600 text-white"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar aos Módulos
                          </Button>
                        </div>

                        <div className="grid gap-4">
                          {filteredLessons.map((lesson, index) => (
                            <motion.div
                              key={lesson.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * index }}
                              className="group cursor-pointer"
                              onClick={() => handleLessonClick(lesson)}
                            >
                              <Card className="bg-gray-900 hover:bg-gray-800 transition-all duration-300 border border-gray-800 hover:border-emerald-500/50">
                                <div className="p-6 flex items-center gap-4">
                                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-lg flex items-center justify-center">
                                    <Play className="h-8 w-8 text-emerald-400" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                        Aula {lesson.order_number}
                                      </Badge>
                                      <Badge variant="outline" className="text-gray-400 border-gray-600">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {Math.round(lesson.duration / 60)} min
                                      </Badge>
                                    </div>
                                    <h4 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                      {lesson.title}
                                    </h4>
                                    {lesson.description && (
                                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                        {lesson.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play className="h-6 w-6 text-emerald-400" />
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          ))}

                          {filteredLessons.length === 0 && (
                            <div className="text-center py-12">
                              <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-400 mb-2">
                                Nenhuma aula neste módulo ainda
                              </h3>
                              <p className="text-gray-500">
                                Novas aulas serão adicionadas em breve
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Netflix Style Horizontal Scroll */
                      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide scroll-smooth">
                        <div className="flex gap-6 min-w-max">
                          {modules.map((module, index) => (
                            <motion.div
                              key={module.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 * index }}
                              whileHover={{ scale: 1.05, y: -8 }}
                              className="group cursor-pointer flex-shrink-0 w-80"
                              onClick={() => handleModuleClick(module)}
                            >
                              <Card className="overflow-hidden bg-gray-900 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 border border-gray-800 hover:border-emerald-500/50 transform-gpu">
                                <div className="relative">
                                  {/* Module Cover - Netflix Style com orientação dinâmica */}
                                  <div className={`${
                                    (module as any).cover_orientation === 'vertical' 
                                      ? 'aspect-[9/16]' 
                                      : 'aspect-[16/9]'
                                  } bg-gradient-to-br from-gray-900 to-black relative overflow-hidden`}>
                                    {module.cover_image_url ? (
                                      <>
                                        <img 
                                          src={module.cover_image_url} 
                                          alt={module.title}
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <BookOpen className="h-20 w-20 text-gray-600 group-hover:text-emerald-500 transition-colors duration-300" />
                                      </div>
                                    )}
                                    
                                    {/* Module Number Badge */}
                                    <div className="absolute top-4 left-4">
                                      <Badge className="bg-emerald-500/90 backdrop-blur-sm hover:bg-emerald-600 text-white font-bold px-3 py-1">
                                        {module.order_number}
                                      </Badge>
                                    </div>

                                    {/* Progress Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                      <h3 className="font-bold text-lg mb-1 leading-tight group-hover:text-emerald-300 transition-colors">
                                        {module.title}
                                      </h3>
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-sm text-gray-300">
                                          {lessons.filter(l => l.module_id === module.id).length} aulas
                                        </span>
                                        <span className="text-xs font-medium text-emerald-400">
                                          {Math.floor(Math.random() * 100)}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-800 rounded-full h-2">
                                        <div 
                                          className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-700 shadow-sm shadow-emerald-500/30"
                                          style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Sem módulos disponíveis */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800">
                      <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-6" />
                      <h3 className="text-2xl font-bold text-white mb-4">
                        Nenhum módulo disponível ainda
                      </h3>
                      <p className="text-gray-400 text-lg max-w-md mx-auto">
                        Novos módulos serão adicionados em breve. Fique atento!
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}