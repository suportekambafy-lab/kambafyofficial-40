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
import { MemberAreaSlideMenu } from '../MemberAreaSlideMenu';
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
      {/* Menu Slide Lateral */}
      <MemberAreaSlideMenu
        lessons={lessons}
        modules={modules}
        lessonProgress={{}} // Você pode implementar o hook de progresso aqui depois
        getCourseProgress={(total) => Math.round((Math.floor(lessons.length * 0.3) / total) * 100) || 0}
        totalDuration={lessons.reduce((sum, lesson) => sum + lesson.duration, 0)}
        completedLessons={Math.floor(lessons.length * 0.3)}
        onLessonSelect={setSelectedLesson}
        onLogout={handleLogout}
      />
      
      {/* Hero Section - Estilo Netflix */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative bg-gradient-to-br from-black via-gray-950 to-gray-900 overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        
        {/* Hero Image Background */}
        {memberArea?.hero_image_url && (
          <div className="absolute inset-0 opacity-10">
            <img 
              src={memberArea.hero_image_url} 
              alt={memberArea.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          </div>
        )}
        
        <div className="relative container mx-auto px-4 py-16">
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
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Removido o botão de logout - agora está no menu slide */}
            </div>
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
          </motion.div>
        </div>
      </motion.section>

      {/* Main Content Area */}
      <div className="bg-black min-h-screen">
        <div className="container mx-auto px-4 py-12">

          <div className="grid grid-cols-1 gap-8">
            
            {/* Módulos do Curso - Estilo Netflix */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
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
                                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-900 to-transparent" />
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
                            <div className="bg-gray-900 p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400">Progresso do Módulo</span>
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
                        className="w-2 h-2 rounded-full bg-gray-700 hover:bg-emerald-500 transition-colors cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-800 bg-gray-900/50">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
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
          </div>
        </div>
      </div>

    </div>
  );
}