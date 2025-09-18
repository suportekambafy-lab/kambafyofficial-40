import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, Clock, CheckCircle } from 'lucide-react';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';

export default function MemberAreaContent() {
  const { student, memberArea } = useMemberAreaAuth();
  const navigate = useNavigate();

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

  return (
    <>
      <SEO 
        title={`Conteúdos - ${memberArea?.name || 'Área de Membros'}`}
        description="Acesse todos os conteúdos disponíveis na sua área de membros"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Todos os Conteúdos</h1>
            <p className="text-muted-foreground">Explore todo o material disponível</p>
          </div>

          {/* Modules Section */}
          {modules.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Módulos
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((module) => (
                  <Card key={module.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate(`/member-area/${memberArea?.id}/module/${module.id}`)}>
                    <CardHeader>
                      {module.cover_image_url && (
                        <img 
                          src={module.cover_image_url} 
                          alt={module.title}
                          className="w-full h-40 object-cover rounded-md mb-4"
                        />
                      )}
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        {module.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{module.description}</p>
                      <Button className="w-full">
                        Ver Módulo
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Individual Lessons Section */}
          {lessons.filter(l => !l.module_id).length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Play className="w-6 h-6" />
                Aulas Avulsas
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons.filter(l => !l.module_id).map((lesson) => (
                  <Card key={lesson.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate(`/member-area/${memberArea?.id}/lesson/${lesson.id}`)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        {lesson.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{lesson.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {lesson.duration || 5} min
                        </span>
                        <Button size="sm">
                          Assistir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {modules.length === 0 && lessons.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum conteúdo disponível</h3>
              <p className="text-muted-foreground">Novos conteúdos serão adicionados em breve!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}