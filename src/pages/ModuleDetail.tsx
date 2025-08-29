import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  CheckCircle,
  BookOpen,
  Lock
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { MemberAreaAuthProvider, useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import type { Lesson, Module } from '@/types/memberArea';

function ModuleDetailContent() {
  const { areaId, moduleId } = useParams<{ areaId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useMemberAreaAuth();

  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .single();
      
      if (error) {
        console.error('Error fetching module:', error);
        return null;
      }
      
      return data as Module;
    },
    enabled: !!moduleId && isAuthenticated
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['module-lessons', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', moduleId)
        .eq('status', 'published')
        .order('order_number');
      
      if (error) {
        console.error('Error fetching lessons:', error);
        return [];
      }
      
      return data as Lesson[];
    },
    enabled: !!moduleId && isAuthenticated
  });

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`/area/${areaId}/lesson/${lesson.id}`);
  };

  const handleBackToDashboard = () => {
    navigate(`/area/${areaId}`);
  };

  if (!isAuthenticated) {
    navigate(`/login/${areaId}`);
    return null;
  }

  if (moduleLoading || lessonsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Carregando módulo..." />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Módulo não encontrado</h1>
          <p className="text-muted-foreground mb-4">O módulo solicitado não existe ou não está disponível.</p>
          <Button onClick={handleBackToDashboard}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleBackToDashboard}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Curso
            </Button>
            
            <div className="text-center">
              <h1 className="font-semibold text-foreground">Módulo</h1>
            </div>
            
            <div></div>
          </div>
        </div>
      </header>

      {/* Module Hero */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center text-primary-foreground">
            <div className="w-20 h-20 bg-primary-foreground/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4">{module.title}</h1>
            {module.description && (
              <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-6">
                {module.description}
              </p>
            )}
            <div className="flex items-center justify-center gap-6 text-primary-foreground/80">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                <span>{lessons.length} aulas</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{lessons.reduce((acc, lesson) => acc + (lesson.duration || 5), 0)} min total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Aulas do Módulo</h2>
          <p className="text-muted-foreground">
            Clique em uma aula para começar a assistir
          </p>
        </div>

        <div className="space-y-4">
          {lessons.map((lesson, index) => (
            <Card
              key={lesson.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => handleLessonClick(lesson)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* Lesson Number/Play Button */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      {lesson.video_url ? (
                        <Play className="w-6 h-6 text-primary" />
                      ) : (
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Lesson Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          Aula {lesson.order_number}
                        </Badge>
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {lesson.title}
                        </h3>
                      </div>
                      {/* Completion Status */}
                      <div className="flex-shrink-0 ml-4">
                        <CheckCircle className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    
                    {lesson.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {lesson.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.duration || 5} minutos</span>
                      </div>
                      {lesson.video_url ? (
                        <Badge variant="secondary" className="text-xs">
                          Disponível
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Em breve
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {lessons.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma aula disponível</h3>
            <p className="text-muted-foreground">
              As aulas deste módulo ainda estão sendo preparadas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModuleDetail() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();

  if (!areaId) {
    navigate('/');
    return null;
  }

  return (
    <MemberAreaAuthProvider memberAreaId={areaId}>
      <ModuleDetailContent />
    </MemberAreaAuthProvider>
  );
}