import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedMembersAuth } from './UnifiedMembersAuth';
import { CourseCard } from './CourseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Search, 
  LogOut,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type FilterType = 'all' | 'in-progress' | 'completed' | 'not-started';

export default function UnifiedMembersHub() {
  const { studentName, studentEmail, memberAreas, isLoading, logout } = useUnifiedMembersAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !studentEmail) {
      navigate('/members/login');
    }
  }, [isLoading, studentEmail, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filtrar cursos
  const filteredAreas = memberAreas.filter(area => {
    // Filtro de busca
    if (searchQuery && !area.memberAreaName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filtro de status
    const progress = area.totalLessons > 0 ? (area.completedLessons / area.totalLessons) * 100 : 0;
    
    if (filter === 'completed' && progress !== 100) return false;
    if (filter === 'in-progress' && (progress === 0 || progress === 100)) return false;
    if (filter === 'not-started' && progress > 0) return false;

    return true;
  });

  // Estatísticas gerais
  const totalCourses = memberAreas.length;
  const totalLessons = memberAreas.reduce((sum, area) => sum + area.totalLessons, 0);
  const completedLessons = memberAreas.reduce((sum, area) => sum + area.completedLessons, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Meus Cursos</h1>
                <p className="text-sm text-muted-foreground">
                  Olá, {studentName || studentEmail}! Continue seu aprendizado
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCourses}</p>
                <p className="text-sm text-muted-foreground">
                  {totalCourses === 1 ? 'Curso' : 'Cursos'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedLessons}</p>
                <p className="text-sm text-muted-foreground">Aulas Concluídas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLessons}</p>
                <p className="text-sm text-muted-foreground">Total de Aulas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="in-progress">Em andamento</TabsTrigger>
              <TabsTrigger value="completed">Concluídos</TabsTrigger>
              <TabsTrigger value="not-started">Não iniciados</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar curso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Grid de Cursos */}
        {filteredAreas.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum curso encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery || filter !== 'all'
                ? 'Tente ajustar seus filtros'
                : 'Você ainda não tem acesso a nenhum curso'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAreas.map((area) => (
              <CourseCard
                key={area.memberAreaId}
                {...area}
                onClick={() => navigate(`/members/area/${area.memberAreaId}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
