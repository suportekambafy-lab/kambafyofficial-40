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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      
      {/* Header Moderno */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              {memberArea?.logo_url ? (
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarImage src={memberArea.logo_url} alt={memberArea.name} />
                  <AvatarFallback>
                    <GraduationCap className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-12 w-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {memberArea?.hero_title || memberArea?.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {memberArea?.hero_description || memberArea?.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Olá, {session?.studentName}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Stats Dashboard */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="container mx-auto px-4 py-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <PlayCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Aulas</p>
                <p className="text-2xl font-bold text-primary">{lessons.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{completedLessons}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Target className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progresso</p>
                <p className="text-2xl font-bold text-accent-foreground">
                  {Math.round((completedLessons / lessons.length) * 100) || 0}%
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Clock className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duração</p>
                <p className="text-2xl font-bold text-secondary-foreground">
                  {Math.round(totalDuration / 60)}h
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Content Area */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Content - Lessons */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Search & Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aulas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['all', 'completed', 'pending'].map((status) => (
                      <Button
                        key={status}
                        variant={filterStatus === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus(status as any)}
                        className="text-xs"
                      >
                        {status === 'all' ? 'Todas' : 
                         status === 'completed' ? 'Concluídas' : 'Pendentes'}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lessons Grid */}
            <div className="space-y-4">
              <AnimatePresence>
                {filteredLessons.map((lesson, index) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ scale: 1.02 }}
                    className="group cursor-pointer"
                    onClick={() => handleLessonClick(lesson)}
                  >
                    <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/30 hover:border-l-primary overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {/* Thumbnail/Icon */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-all">
                              <Play className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs">
                                  Aula {lesson.order_number}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {lesson.duration} min
                                </Badge>
                                {Math.random() > 0.5 && (
                                  <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Concluída
                                  </Badge>
                                )}
                              </div>
                              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">
                              {lesson.title}
                            </h3>
                            
                            {lesson.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {lesson.description}
                              </p>
                            )}
                            
                            {/* Progress Bar (simulado) */}
                            <div className="w-full bg-muted rounded-full h-2 mb-2">
                              <div 
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${Math.random() * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredLessons.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                      <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        {searchTerm ? 'Nenhuma aula encontrada' : 'Nenhuma aula disponível ainda'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? 'Tente pesquisar por outro termo' : 'Novas aulas serão adicionadas em breve'}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 space-y-6">
              
              {/* Módulos */}
              {modules.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-accent" />
                      Módulos ({modules.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {modules.map((module, index) => (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ scale: 1.02 }}
                        className="p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        {module.cover_image_url && (
                          <div className="aspect-video bg-muted rounded mb-2 overflow-hidden">
                            <img 
                              src={module.cover_image_url} 
                              alt={module.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <h4 className="font-medium text-sm mb-1">{module.title}</h4>
                        {module.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {module.description}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}