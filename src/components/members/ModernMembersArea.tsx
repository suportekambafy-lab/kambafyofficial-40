import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Play, BookOpen, LogOut, Clock, Users, Star, Search, Filter, GraduationCap, Trophy, Target, CheckCircle2, PlayCircle, MoreVertical, ArrowLeft, Menu, X, Lock, AlertCircle, ExternalLink, Download, FileText } from 'lucide-react';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useModernMembersAuth } from './ModernMembersAuth';
import { ModernLessonViewer } from './ModernLessonViewer';
import { MemberAreaSlideMenu } from '../MemberAreaSlideMenu';
import { LessonComments } from './LessonComments';
import { Lesson, Module } from '@/types/memberArea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMemberLessonProgress } from '@/hooks/useMemberLessonProgress';

// Função para detectar e atualizar duração do vídeo automaticamente
const detectAndUpdateVideoDuration = async (lesson: Lesson) => {
  return new Promise<void>(resolve => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = async () => {
      const durationInSeconds = Math.round(video.duration);
      console.log(`🎬 Duração detectada para "${lesson.title}": ${durationInSeconds}s`);
      if (durationInSeconds > 0) {
        try {
          const {
            error
          } = await supabase.from('lessons').update({
            duration: durationInSeconds
          }).eq('id', lesson.id);
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
  const {
    id: memberAreaId
  } = useParams();
  const {
    user,
    session,
    memberArea,
    isAuthenticated,
    logout,
    checkMemberAccess,
    isLoading: authLoading
  } = useModernMembersAuth();
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
    getModuleProgress,
    getModuleStats,
    isLoadingProgress
  } = useMemberLessonProgress(memberAreaId || '', user?.email);

  console.log('🎬 ModernMembersArea - Progress Hook State:', {
    memberAreaId,
    userEmail: user?.email,
    lessonProgressCount: Object.keys(lessonProgress).length,
    isLoadingProgress,
    lessonProgress: Object.keys(lessonProgress).length > 0 ? lessonProgress : 'EMPTY'
  });
  console.log('🎬 ModernMembersArea render:', {
    memberAreaId,
    isAuthenticated,
    userExists: !!user,
    memberAreaExists: !!memberArea,
    authLoading
  });

  // Verificar acesso à área de membros
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && memberAreaId && !memberArea) {
      console.log('🔑 Verificando acesso à área de membros...');
      checkMemberAccess(memberAreaId).then(hasAccess => {
        if (!hasAccess) {
          toast.error('Acesso negado', {
            description: 'Você não tem acesso a esta área de membros.'
          });
          window.location.href = '/';
        }
      });
    }
  }, [authLoading, isAuthenticated, user, memberAreaId, memberArea, checkMemberAccess]);

  // Redirect para login se não autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🔄 ModernMembersArea: Redirecionando para login - não autenticado');
      window.location.href = `/members/login/${memberAreaId}`;
    }
  }, [authLoading, isAuthenticated, memberAreaId]);

  // Carregar conteúdo da área
  useEffect(() => {
    if (!user || !memberAreaId || !isAuthenticated || !memberArea) {
      console.log('ℹ️ ModernMembersArea: Aguardando autenticação e verificação de acesso...');
      return;
    }
    console.log('📥 ModernMembersArea: Carregando conteúdo...');
    const loadContent = async () => {
      try {
        setIsLoading(true);

        // Carregar lessons
        const {
          data: lessonsData,
          error: lessonsError
        } = await supabase.from('lessons').select('*').eq('member_area_id', memberAreaId).eq('status', 'published').order('order_number');
        if (!lessonsError && lessonsData) {
          console.log('✅ ModernMembersArea: Lessons carregadas:', lessonsData.length);

          // Processar dados das lessons para converter JSON para os tipos corretos
          const processedLessons = lessonsData.map((lesson: any) => ({
            ...lesson,
            complementary_links: lesson.complementary_links ? typeof lesson.complementary_links === 'string' ? JSON.parse(lesson.complementary_links) : lesson.complementary_links : [],
            lesson_materials: lesson.lesson_materials ? typeof lesson.lesson_materials === 'string' ? JSON.parse(lesson.lesson_materials) : lesson.lesson_materials : []
          }));

          // Auto-detectar duração de vídeos que têm duration = 0
          processedLessons.forEach(async lesson => {
            if (lesson.duration === 0 && (lesson.video_url || lesson.bunny_embed_url)) {
              console.log('🔍 Detectando duração para:', lesson.title);
              await detectAndUpdateVideoDuration(lesson as Lesson);
            }
          });
          setLessons(processedLessons as Lesson[]);
        } else {
          console.error('❌ ModernMembersArea: Erro ao carregar lessons:', lessonsError);
        }

        // Carregar módulos
        const {
          data: modulesData,
          error: modulesError
        } = await supabase.from('modules').select('*').eq('member_area_id', memberAreaId).eq('status', 'published').order('order_number');
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
  }, [user, memberAreaId, isAuthenticated, memberArea]);

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
    if (!isLessonAccessible(lesson)) {
      if (lesson.is_scheduled && lesson.scheduled_at && new Date(lesson.scheduled_at) > new Date()) {
        toast.error("Aula agendada", {
          description: `Esta aula será liberada em ${new Date(lesson.scheduled_at).toLocaleString()}`
        });
      } else {
        toast.error("Aula não disponível", {
          description: "Esta aula ainda não está liberada"
        });
      }
      return;
    }
    setSelectedLesson(lesson);
  };
  
  const handleModuleClick = (module: Module) => {
    if (!isModuleAccessible(module)) {
      toast.error("Módulo em breve", {
        description: "Este módulo estará disponível em breve"
      });
      return;
    }
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

  // Funções para verificar acessibilidade
  const isLessonAccessible = (lesson: Lesson) => {
    if (lesson.status !== 'published') return false;
    if (lesson.is_scheduled && lesson.scheduled_at) {
      return new Date(lesson.scheduled_at) <= new Date();
    }
    return true;
  };
  
  const isModuleAccessible = (module: Module) => {
    return module.status === 'published' && !module.coming_soon;
  };
  
  const filteredLessons = lessons.filter(lesson => {
    // Filtrar por módulo se um estiver selecionado
    const matchesModule = !selectedModule || lesson.module_id === selectedModule.id;
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) || lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || filterStatus === 'completed' && lessonProgress[lesson.id]?.completed || filterStatus === 'pending' && !lessonProgress[lesson.id]?.completed;
    return matchesModule && matchesSearch && matchesFilter;
  });

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

  // Renderizar diretamente a área de membros
  return (
    <div className="min-h-screen bg-gray-950 dark text-white">
      {/* Menu Slide Lateral */}
      <MemberAreaSlideMenu 
        lessons={lessons} 
        modules={modules} 
        lessonProgress={lessonProgress} 
        getCourseProgress={getCourseProgress} 
        getModuleProgress={getModuleProgress} 
        getModuleStats={getModuleStats} 
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
              <img src={memberArea.hero_image_url} alt={memberArea.name} className="w-full h-full object-cover" />
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
                  <p className="text-sm text-gray-300">Olá, {user?.email?.split('@')[0] || 'Usuário'}</p>
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
                {memberArea?.hero_title || memberArea?.name || 'Área de Membros'}
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                {memberArea?.hero_description || memberArea?.description || 'Bem-vindo à sua área de membros'}
              </p>
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* Main Content - Simplified */}
      <div className="bg-black min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Área de Membros Carregada</h2>
            <p className="text-gray-300 mb-8">
              {lessons.length} aulas • {modules.length} módulos
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold mb-2">{lesson.title}</h3>
                    <p className="text-gray-400 text-sm mb-4">{lesson.description}</p>
                    <Button 
                      onClick={() => handleLessonClick(lesson)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Assistir Aula
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}