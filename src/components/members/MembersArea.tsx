import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Play, 
  BookOpen, 
  LogOut, 
  Clock, 
  Users, 
  Star,
  ChevronRight,
  GraduationCap,
  Trophy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMembersAuth } from './MembersAuth';
import { useInternalMembersNavigation } from '@/utils/internalMembersLinks';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  order_number: number;
  video_url?: string;
  status: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_number: number;
  status: string;
  cover_image_url?: string;
}

export default function MembersArea() {
  const { id: memberAreaId } = useParams();
  const { goToLogin } = useInternalMembersNavigation();
  const { session, memberArea, logout, isLoading: authLoading } = useMembersAuth();
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect se não autenticado
  useEffect(() => {
    if (!authLoading && !session && memberAreaId) {
      goToLogin(memberAreaId);
    }
  }, [authLoading, session, memberAreaId, goToLogin]);

  // Carregar conteúdo da área
  useEffect(() => {
    if (!session || !memberAreaId) return;

    const loadContent = async () => {
      try {
        // Carregar lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');

        if (!lessonsError) {
          setLessons(lessonsData || []);
        }

        // Carregar módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');

        if (!modulesError) {
          setModules(modulesData || []);
        }

      } catch (error) {
        console.error('Erro ao carregar conteúdo:', error);
        toast.error('Erro ao carregar conteúdo');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [session, memberAreaId]);

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso');
    if (memberAreaId) {
      goToLogin(memberAreaId);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
          <p className="text-muted-foreground">Carregando área de membros...</p>
        </motion.div>
      </div>
    );
  }

  if (!memberArea || !session) {
    return null;
  }

  const totalDuration = Math.round(lessons.reduce((sum, lesson) => sum + lesson.duration, 0) / 60);
  const totalContent = lessons.length + modules.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-primary/5">
      {/* Header moderno */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {memberArea.logo_url && (
                <Avatar className="h-12 w-12">
                  <AvatarImage src={memberArea.logo_url} alt={memberArea.name} />
                  <AvatarFallback>
                    <GraduationCap className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {memberArea.hero_title || memberArea.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {memberArea.hero_description || memberArea.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Olá, {session.studentName}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Stats rápidos */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="container mx-auto px-4 py-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Play className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Aulas</p>
                <p className="text-2xl font-bold text-primary">{lessons.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <BookOpen className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Módulos</p>
                <p className="text-2xl font-bold text-accent-foreground">{modules.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Clock className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duração Total</p>
                <p className="text-2xl font-bold text-secondary-foreground">{Math.round(totalDuration / 60)}h</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Aulas - Coluna principal */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Play className="h-6 w-6 text-primary" />
                Aulas ({lessons.length})
              </h2>
              {lessons.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(totalDuration / 60)} horas de conteúdo
                </Badge>
              )}
            </div>
            
            <AnimatePresence>
              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.01 }}
                    className="group"
                  >
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-primary/30 hover:border-l-primary">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="text-xs">
                                Aula {lesson.order_number}
                              </Badge>
                              {lesson.duration > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {Math.round(lesson.duration / 60)} min
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                              {lesson.title}
                            </h3>
                            {lesson.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {lesson.description}
                              </p>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                
                {lessons.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="border-dashed">
                      <CardContent className="p-12 text-center">
                        <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-2">
                          Nenhuma aula disponível ainda
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Novas aulas serão adicionadas em breve
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          </motion.div>

          {/* Sidebar - Módulos */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                Módulos ({modules.length})
              </h2>
              
              <div className="space-y-3">
                {modules.map((module, index) => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardHeader className="p-4">
                        {module.cover_image_url && (
                          <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                            <img 
                              src={module.cover_image_url} 
                              alt={module.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                              {module.title}
                            </CardTitle>
                            {module.description && (
                              <CardDescription className="text-xs line-clamp-2">
                                {module.description}
                              </CardDescription>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
                
                {modules.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="p-6 text-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum módulo disponível
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}