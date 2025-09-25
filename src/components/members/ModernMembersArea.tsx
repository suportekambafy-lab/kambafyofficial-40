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
    <div className="min-h-screen bg-gray-950 dark text-white">
      
      {/* Hero Section - Estilo Hotmart/Kiwify */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative bg-gradient-to-br from-gray-900 via-gray-950 to-black overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-transparent to-transparent" />
        
        {/* Hero Image Background */}
        {memberArea?.hero_image_url && (
          <div className="absolute inset-0 opacity-20">
            <img 
              src={memberArea.hero_image_url} 
              alt={memberArea.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
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
                <p className="text-sm text-emerald-400">Área de Membros</p>
                <p className="text-sm text-gray-300">Olá, {session?.studentName}</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
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

            {/* Progress Overview */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto border border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-200 font-semibold text-lg">Seu Progresso</span>
                <span className="text-3xl font-bold text-emerald-400">
                  {Math.round((completedLessons / lessons.length) * 100) || 0}%
                </span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-4 mb-6 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-400 h-4 rounded-full transition-all duration-700 shadow-lg shadow-emerald-500/20"
                  style={{ width: `${Math.round((completedLessons / lessons.length) * 100) || 0}%` }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <p className="text-3xl font-bold text-white mb-1">{lessons.length}</p>
                  <p className="text-sm text-gray-400">Total de Aulas</p>
                </div>
                <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                  <p className="text-3xl font-bold text-emerald-400 mb-1">{completedLessons}</p>
                  <p className="text-sm text-emerald-300">Concluídas</p>
                </div>
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <p className="text-3xl font-bold text-gray-200 mb-1">{Math.round(totalDuration / 60)}h</p>
                  <p className="text-sm text-gray-400">Duração Total</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Main Content Area */}
      <div className="bg-gray-900 min-h-screen">
        <div className="container mx-auto px-4 py-12">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Módulos do Curso - Estilo Netflix */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-3">Módulos do Curso</h2>
                <p className="text-gray-400 text-lg">Escolha um módulo para começar a aprender</p>
              </div>

              {modules.length > 0 ? (
                <div className="relative">
                  {/* Netflix Style Horizontal Scroll */}
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
                        >
                          <Card className="overflow-hidden bg-gray-800 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 border border-gray-700 hover:border-emerald-500/50 transform-gpu">
                            <div className="relative">
                              {/* Module Cover - Netflix Style */}
                              <div className="aspect-[16/9] bg-gradient-to-br from-gray-800 to-gray-950 relative overflow-hidden">
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
                                    <BookOpen className="h-20 w-20 text-gray-500 group-hover:text-emerald-500 transition-colors duration-300" />
                                  </div>
                                )}
                                
                                {/* Module Number Badge */}
                                <div className="absolute top-4 left-4">
                                  <Badge className="bg-emerald-500/90 backdrop-blur-sm hover:bg-emerald-600 text-white font-bold px-3 py-1">
                                    Módulo {module.order_number}
                                  </Badge>
                                </div>
                                
                                {/* Progress Badge */}
                                <div className="absolute top-4 right-4">
                                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/50 bg-black/50 backdrop-blur-sm font-medium">
                                    {Math.random() > 0.5 ? 'Em Progresso' : 'Novo'}
                                  </Badge>
                                </div>
                                
                                {/* Play Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <div className="w-20 h-20 bg-emerald-500/80 backdrop-blur-sm rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                    <Play className="h-10 w-10 text-white ml-1" />
                                  </div>
                                </div>
                                
                                {/* Bottom Gradient */}
                                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-800 to-transparent" />
                              </div>
                              
                              {/* Module Info Overlay */}
                              <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-emerald-400 transition-colors duration-300">
                                  {module.title}
                                </h3>
                                
                                {module.description && (
                                  <p className="text-gray-300 text-sm line-clamp-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                    {module.description}
                                  </p>
                                )}
                                
                                {/* Module Stats */}
                                <div className="flex items-center gap-4 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                                  <span className="flex items-center gap-1">
                                    <PlayCircle className="h-3 w-3" />
                                    {Math.floor(Math.random() * 8) + 3} aulas
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {Math.floor(Math.random() * 120) + 60} min
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Progress Bar at Bottom */}
                            <div className="bg-gray-800 p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400">Progresso do Módulo</span>
                                <span className="text-xs font-medium text-emerald-400">
                                  {Math.floor(Math.random() * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-700 shadow-sm shadow-emerald-500/30"
                                  style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                                />
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Scroll Indicators */}
                  <div className="flex justify-center mt-4 gap-2">
                    {modules.map((_, index) => (
                      <div 
                        key={index}
                        className="w-2 h-2 rounded-full bg-gray-600 hover:bg-emerald-500 transition-colors cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-700 bg-gray-800/50">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-300 mb-2">
                      Nenhum módulo disponível
                    </h3>
                    <p className="text-gray-500">
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
                <Card className="bg-gray-800 shadow-xl border border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <PlayCircle className="h-5 w-5 text-emerald-500" />
                      Todas as Aulas ({lessons.length})
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar aulas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-gray-600 bg-gray-700 text-white placeholder:text-gray-400 focus:border-emerald-500"
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
                          className="group cursor-pointer p-3 rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                          onClick={() => handleLessonClick(lesson)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-lg flex items-center justify-center group-hover:from-emerald-500/30 group-hover:to-emerald-600/30 transition-all">
                                <Play className="h-4 w-4 text-emerald-500 group-hover:text-emerald-400" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-200 line-clamp-1 group-hover:text-emerald-400 transition-colors">
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs border-gray-600 text-gray-400 bg-gray-700/50">
                                  {lesson.order_number}
                                </Badge>
                                <span className="text-xs text-gray-500">{lesson.duration} min</span>
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
                        <Search className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
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