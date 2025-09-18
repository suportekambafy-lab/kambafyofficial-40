import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Play, Clock, CheckCircle, Trophy, Star } from 'lucide-react';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';

export default function MemberAreaMyCourses() {
  const { student, memberArea } = useMemberAreaAuth();
  const navigate = useNavigate();

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', memberArea?.id],
    queryFn: async () => {
      if (!memberArea?.id) return [];
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('member_area_id', memberArea.id)
        .eq('status', 'published')
        .order('order_number');
      return data || [];
    },
    enabled: !!memberArea?.id
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules', memberArea?.id],
    queryFn: async () => {
      if (!memberArea?.id) return [];
      const { data } = await supabase
        .from('modules')
        .select('*')
        .eq('member_area_id', memberArea.id)
        .eq('status', 'published')
        .order('order_number');
      return data || [];
    },
    enabled: !!memberArea?.id
  });

  // Simulando progresso do estudante
  const studentProgress = {
    totalLessons: lessons.length,
    completedLessons: Math.floor(lessons.length * 0.6), // 60% concluído
    totalTime: lessons.reduce((acc, lesson) => acc + (lesson.duration || 5), 0),
    watchedTime: Math.floor(lessons.reduce((acc, lesson) => acc + (lesson.duration || 5), 0) * 0.6)
  };

  const progressPercentage = studentProgress.totalLessons > 0 
    ? (studentProgress.completedLessons / studentProgress.totalLessons) * 100 
    : 0;

  const achievements = [
    { title: "Primeiro Passo", description: "Completou a primeira aula", earned: true },
    { title: "Dedicado", description: "5 aulas consecutivas", earned: true },
    { title: "Persistente", description: "50% do curso concluído", earned: true },
    { title: "Quase lá", description: "75% do curso concluído", earned: false },
    { title: "Especialista", description: "100% do curso concluído", earned: false }
  ];

  return (
    <>
      <SEO 
        title={`Meus Cursos - ${memberArea?.name || 'Área de Membros'}`}
        description="Acompanhe seu progresso e continue seus estudos"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Meus Cursos</h1>
            <p className="text-muted-foreground">Acompanhe seu progresso e continue aprendendo</p>
          </div>

          {/* Progress Overview */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-primary" />
                  Seu Progresso
                </span>
                <Badge variant="secondary">
                  {progressPercentage.toFixed(0)}% Concluído
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPercentage} className="h-3" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{studentProgress.completedLessons}</div>
                  <div className="text-sm text-muted-foreground">Aulas Concluídas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{studentProgress.totalLessons}</div>
                  <div className="text-sm text-muted-foreground">Total de Aulas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{studentProgress.watchedTime}h</div>
                  <div className="text-sm text-muted-foreground">Tempo Assistido</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{studentProgress.totalTime}h</div>
                  <div className="text-sm text-muted-foreground">Tempo Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Continue Watching */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Continuar Assistindo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lessons.slice(0, 3).map((lesson, index) => (
                    <div key={lesson.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 cursor-pointer"
                         onClick={() => navigate(`/member-area/${memberArea?.id}/lesson/${lesson.id}`)}>
                      <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                        <Play className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{lesson.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {lesson.duration || 5} min
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {index < studentProgress.completedLessons ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-muted-foreground rounded-full" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* All Lessons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Todas as Aulas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <div key={lesson.id} 
                         className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                         onClick={() => navigate(`/member-area/${memberArea?.id}/lesson/${lesson.id}`)}>
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{lesson.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {lesson.duration || 5} min
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {index < studentProgress.completedLessons ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-muted-foreground rounded-full" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Achievements Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Conquistas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {achievements.map((achievement, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      achievement.earned 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-muted/20 border-muted'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Trophy className={`w-5 h-5 ${
                          achievement.earned ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <div>
                          <h4 className={`font-semibold ${
                            achievement.earned ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {achievement.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sequência atual</span>
                    <span className="font-semibold">7 dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tempo médio/aula</span>
                    <span className="font-semibold">6 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conclusão estimada</span>
                    <span className="font-semibold">2 semanas</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}