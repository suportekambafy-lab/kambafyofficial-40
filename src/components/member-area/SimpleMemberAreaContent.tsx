import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, BookOpen, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MemberArea {
  id: string;
  name: string;
  description: string;
  hero_title: string;
  hero_description: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  order_number: number;
  video_url?: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_number: number;
}

export default function SimpleMemberAreaContent() {
  const { id: memberAreaId } = useParams();
  const navigate = useNavigate();
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  console.log('🎯 SimpleMemberAreaContent renderizado:', { memberAreaId });

  useEffect(() => {
    const checkSession = () => {
      const savedSession = localStorage.getItem('memberAreaSession');
      if (!savedSession) {
        console.log('❌ Nenhuma sessão encontrada');
        navigate(`/member-area-login/${memberAreaId}`);
        return;
      }

      const sessionData = JSON.parse(savedSession);
      if (sessionData.memberAreaId !== memberAreaId) {
        console.log('❌ Sessão para área diferente');
        navigate(`/member-area-login/${memberAreaId}`);
        return;
      }

      if (new Date(sessionData.expiresAt) < new Date()) {
        console.log('❌ Sessão expirada');
        localStorage.removeItem('memberAreaSession');
        navigate(`/member-area-login/${memberAreaId}`);
        return;
      }

      console.log('✅ Sessão válida:', sessionData);
      setSession(sessionData);
    };

    checkSession();
  }, [memberAreaId, navigate]);

  useEffect(() => {
    if (!session || !memberAreaId) return;

    const loadContent = async () => {
      try {
        console.log('📚 Carregando conteúdo da área:', memberAreaId);

        // Carregar área de membros
        const { data: areaData, error: areaError } = await supabase
          .from('member_areas')
          .select('*')
          .eq('id', memberAreaId)
          .single();

        if (areaError) {
          console.error('❌ Erro ao carregar área:', areaError);
          toast.error('Erro ao carregar área de membros');
          return;
        }

        setMemberArea(areaData);

        // Carregar lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');

        if (lessonsError) {
          console.error('❌ Erro ao carregar lessons:', lessonsError);
        } else {
          setLessons(lessonsData || []);
        }

        // Carregar módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');

        if (modulesError) {
          console.error('❌ Erro ao carregar módulos:', modulesError);
        } else {
          setModules(modulesData || []);
        }

      } catch (error) {
        console.error('❌ Erro inesperado:', error);
        toast.error('Erro ao carregar conteúdo');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [session, memberAreaId]);

  const handleLogout = () => {
    localStorage.removeItem('memberAreaSession');
    navigate(`/member-area-login/${memberAreaId}`);
    toast.success('Logout realizado com sucesso');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  if (!memberArea) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Área de membros não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{memberArea.hero_title || memberArea.name}</h1>
            <p className="opacity-90">{memberArea.hero_description || memberArea.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Olá, {session?.studentName}</span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lessons */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Play className="h-5 w-5 mr-2" />
              Aulas ({lessons.length})
            </h2>
            
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{lesson.title}</h3>
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground mb-2">{lesson.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Aula {lesson.order_number}</Badge>
                          {lesson.duration > 0 && (
                            <Badge variant="outline">{lesson.duration} min</Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {lessons.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Nenhuma aula disponível ainda.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar - Modules */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Módulos ({modules.length})
            </h2>
            
            <div className="space-y-3">
              {modules.map((module) => (
                <Card key={module.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    {module.description && (
                      <CardDescription className="text-sm">{module.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
              
              {modules.length === 0 && (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum módulo disponível.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}