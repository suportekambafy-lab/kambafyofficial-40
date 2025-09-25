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
  MoreVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useModernMembersAuth } from './ModernMembersAuth';
import { ModernLessonViewer } from './ModernLessonViewer';
import { Lesson, Module } from '@/types/memberArea';

export default function ModernMembersArea() {
  const { id: memberAreaId } = useParams();
  const { session, memberArea, isAuthenticated, logout, isLoading: authLoading } = useModernMembersAuth();
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

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

  const handleLogout = () => {
    logout();
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleNavigateLesson = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedLesson(lesson);
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'completed' && Math.random() > 0.5) || // Simulado
      (filterStatus === 'pending' && Math.random() <= 0.5);   // Simulado
      
    return matchesSearch && matchesFilter;
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

  // Render lesson viewer
  if (selectedLesson) {
    return (
      <ModernLessonViewer
        lesson={selectedLesson}
        lessons={lessons}
        onNavigateLesson={handleNavigateLesson}
        onClose={() => setSelectedLesson(null)}
      />
    );
  }

  const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.duration, 0);
  const completedLessons = Math.floor(lessons.length * 0.3); // Simulado

  return (
    <div className="min-h-screen bg-slate-900 dark">
      
      {/* Hero Section - Estilo Hotmart/Kiwify */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-700/[0.05] bg-[size:40px_40px]" />
        
        {/* Hero Image Background */}
        {memberArea?.hero_image_url && (
          <div className="absolute inset-0 opacity-20">
            <img 
              src={memberArea.hero_image_url} 
              alt={memberArea.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
          </div>
        )}
        
        <div className="relative container mx-auto px-4 py-12">
          {/* Header */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex justify-between items-center mb-8"
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
                <p className="text-sm text-emerald-300">Área de Membros</p>
                <p className="text-sm text-slate-300">Olá, {session?.studentName}</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </motion.div>

          {/* Course Hero */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-12"
          >
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 mb-4">
              <Trophy className="h-3 w-3 mr-1" />
              Curso Premium
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {memberArea?.hero_title || memberArea?.name}
            </h1>
            
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              {memberArea?.hero_description || memberArea?.description}
            </p>

            {/* Progress Overview */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 max-w-lg mx-auto">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-300 font-medium">Seu Progresso</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {Math.round((completedLessons / lessons.length) * 100) || 0}%
                </span>
              </div>
              
              <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((completedLessons / lessons.length) * 100) || 0}%` }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{lessons.length}</p>
                  <p className="text-xs text-slate-400">Aulas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{completedLessons}</p>
                  <p className="text-xs text-slate-400">Concluídas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-300">{Math.round(totalDuration / 60)}h</p>
                  <p className="text-xs text-slate-400">Duração</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Main Content Area */}
      <div className="bg-slate-100 min-h-screen">
        <div className="container mx-auto px-4 py-8">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Módulos do Curso */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Módulos do Curso</h2>
                <p className="text-slate-600">Escolha um módulo para começar a aprender</p>
              </div>

              {modules.length > 0 ? (
                <div className="grid gap-6">
                  {modules.map((module, index) => (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ y: -4 }}
                      className="group cursor-pointer"
                    >
                      <Card className="overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                        <div className="relative">
                          {/* Module Cover */}
                          <div className="aspect-[16/9] bg-gradient-to-br from-slate-700 to-slate-900 relative overflow-hidden">
                            {module.cover_image_url ? (
                              <>
                                <img 
                                  src={module.cover_image_url} 
                                  alt={module.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-16 w-16 text-slate-400" />
                              </div>
                            )}
                            
                            {/* Module Number Badge */}
                            <div className="absolute top-4 left-4">
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                Módulo {module.order_number}
                              </Badge>
                            </div>
                            
                            {/* Play Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <Play className="h-8 w-8 text-white ml-1" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Module Info */}
                          <CardContent className="p-6">
                            <div className="mb-3">
                              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                                {module.title}
                              </h3>
                              {module.description && (
                                <p className="text-slate-600 line-clamp-2">
                                  {module.description}
                                </p>
                              )}
                            </div>
                            
                            {/* Module Stats */}
                            <div className="flex items-center justify-between text-sm text-slate-500">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <PlayCircle className="h-4 w-4" />
                                  {Math.floor(Math.random() * 8) + 3} aulas
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {Math.floor(Math.random() * 120) + 60} min
                                </span>
                              </div>
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                                {Math.random() > 0.5 ? 'Iniciado' : 'Novo'}
                              </Badge>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-500">Progresso</span>
                                <span className="text-xs font-medium text-emerald-600">
                                  {Math.floor(Math.random() * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-slate-300">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">
                      Nenhum módulo disponível
                    </h3>
                    <p className="text-sm text-slate-500">
                      Os módulos do curso serão adicionados em breve
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Aulas Sidebar */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-8">
                <Card className="bg-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PlayCircle className="h-5 w-5 text-emerald-600" />
                      Todas as Aulas ({lessons.length})
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar aulas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-slate-200"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {filteredLessons.map((lesson, index) => (
                        <motion.div
                          key={lesson.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * index }}
                          whileHover={{ x: 4 }}
                          className="group cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-all duration-200"
                          onClick={() => handleLessonClick(lesson)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-lg flex items-center justify-center">
                                <Play className="h-4 w-4 text-emerald-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs border-slate-200">
                                  {lesson.order_number}
                                </Badge>
                                <span className="text-xs text-slate-500">{lesson.duration} min</span>
                                {Math.random() > 0.5 && (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    {filteredLessons.length === 0 && (
                      <div className="text-center py-8">
                        <Search className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          Nenhuma aula encontrada
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

    </div>
  );
}