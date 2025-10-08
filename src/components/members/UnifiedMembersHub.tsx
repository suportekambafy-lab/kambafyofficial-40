import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUnifiedMembersAuth } from './UnifiedMembersAuth';
import { CourseCard } from './CourseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Search, 
  LogOut,
  Loader2,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-10 border-b border-border/30 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 shadow-sm"
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Meus Cursos
                </h1>
                <p className="text-sm text-muted-foreground">
                  Olá, {studentName || studentEmail} 👋
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Estatísticas */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:border-primary/20 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de Cursos</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {totalCourses}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:border-green-500/20 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5">
                  <Award className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Aulas Concluídas</p>
                  <p className="text-3xl font-bold text-green-500">
                    {completedLessons}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:border-blue-500/20 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de Aulas</p>
                  <p className="text-3xl font-bold text-blue-500">
                    {totalLessons}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filtros e Busca */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        >
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Todos
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Em andamento
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Concluídos
              </TabsTrigger>
              <TabsTrigger value="not-started" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Não iniciados
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar curso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 backdrop-blur-sm border-border/50"
            />
          </div>
        </motion.div>

        {/* Grid de Cursos */}
        {filteredAreas.length === 0 ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-12 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="text-center">
                <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                  <GraduationCap className="w-16 h-16 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhum curso encontrado</h3>
                <p className="text-muted-foreground">
                  {searchQuery || filter !== 'all'
                    ? 'Tente ajustar seus filtros'
                    : 'Você ainda não tem acesso a nenhum curso'}
                </p>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredAreas.map((area, index) => (
              <motion.div
                key={area.memberAreaId}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + (index * 0.1) }}
              >
                <CourseCard
                  {...area}
                  onClick={() => navigate(`/members/area/${area.memberAreaId}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
