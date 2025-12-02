import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Clock, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  name: string;
  logo_url: string | null;
  hero_image_url: string | null;
  totalLessons: number;
  completedLessons: number;
  lastActivity?: string;
}

interface AppCoursesProps {
  onCourseSelect?: (courseId: string, courseName: string) => void;
}

export function AppCourses({ onCourseSelect }: AppCoursesProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      // Buscar áreas de membros onde o usuário tem acesso
      const { data: studentAreas } = await supabase
        .from('member_area_students')
        .select('member_area_id')
        .eq('student_email', user.email.toLowerCase());

      const { data: orderAreas } = await supabase
        .from('orders')
        .select('product_id, products!inner(member_area_id)')
        .eq('customer_email', user.email.toLowerCase())
        .eq('status', 'completed')
        .not('products', 'is', null);

      const memberAreaIds = new Set<string>();
      
      studentAreas?.forEach(area => {
        if (area.member_area_id) memberAreaIds.add(area.member_area_id);
      });

      orderAreas?.forEach(order => {
        const memberAreaId = (order.products as any)?.member_area_id;
        if (memberAreaId) memberAreaIds.add(memberAreaId);
      });

      if (memberAreaIds.size === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Buscar detalhes das áreas de membros
      const { data: memberAreas } = await supabase
        .from('member_areas')
        .select('id, name, logo_url, hero_image_url')
        .in('id', Array.from(memberAreaIds));

      // Buscar progresso
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, member_area_id, last_watched_at')
        .eq('user_email', user.email.toLowerCase())
        .in('member_area_id', Array.from(memberAreaIds));

      // Buscar total de aulas por área usando RPC (bypassa RLS)
      const lessonsCountByArea: Record<string, number> = {};
      for (const areaId of Array.from(memberAreaIds)) {
        const { data: lessonsData } = await supabase
          .rpc('get_lessons_for_student', {
            p_student_email: user.email.toLowerCase(),
            p_member_area_id: areaId
          });
        lessonsCountByArea[areaId] = lessonsData?.length || 0;
      }

      const coursesWithProgress = memberAreas?.map(area => {
        const areaProgress = progressData?.filter(p => p.member_area_id === area.id) || [];
        const completedLessons = areaProgress.filter(p => p.completed).length;
        const lastActivity = areaProgress.length > 0 
          ? areaProgress.sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())[0]?.last_watched_at
          : undefined;

        return {
          id: area.id,
          name: area.name,
          logo_url: area.logo_url,
          hero_image_url: area.hero_image_url,
          totalLessons: lessonsCountByArea[area.id] || 0,
          completedLessons,
          lastActivity
        };
      }) || [];

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage === 0) {
      return { label: 'Não iniciado', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' };
    } else if (percentage === 100) {
      return { label: 'Concluído', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
    } else {
      return { label: 'Em andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' };
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold px-2 text-foreground">Meus Cursos</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold px-2 text-foreground">Meus Cursos</h2>
      
      {courses.length === 0 ? (
        <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-card">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-base mb-2 text-foreground">Nenhum curso encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Você ainda não possui cursos. Compre um curso para começar seus estudos!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const progress = getProgressPercentage(course.completedLessons, course.totalLessons);
            const status = getStatusBadge(progress);

            return (
              <Card key={course.id} className="overflow-hidden rounded-xl border-none shadow-sm bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Course Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {course.hero_image_url || course.logo_url ? (
                        <img 
                          src={course.hero_image_url || course.logo_url || ''} 
                          alt={course.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Course Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                          {course.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{course.completedLessons} de {course.totalLessons} aulas</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="w-full justify-between h-8 text-xs"
                        onClick={() => onCourseSelect?.(course.id, course.name)}
                      >
                        {progress === 0 ? 'Começar Curso' : progress === 100 ? 'Revisar' : 'Continuar'}
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card className="overflow-hidden rounded-xl border-none shadow-sm bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">
                💡 Continue seus cursos e acompanhe seu progresso
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
