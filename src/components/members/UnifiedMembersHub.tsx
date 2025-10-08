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
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* Animated background with grid */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs - usando apenas verde em diferentes opacidades */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00A651]/8 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#00A651]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00A651]/3 rounded-full blur-[100px]" />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,166,81,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,166,81,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b border-white/5 bg-[#09090b]/60 backdrop-blur-2xl"
      >
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00A651]/20 rounded-2xl blur-xl" />
                <div className="relative p-2.5 rounded-2xl bg-[#00A651]/10 border border-[#00A651]/20">
                  <img 
                    src="/kambafy-logo-new.svg" 
                    alt="Kambafy" 
                    className="w-8 h-8 object-contain brightness-0 invert"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Meus Cursos
                </h1>
                <p className="text-sm text-zinc-500">
                  {studentName || studentEmail}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-10 space-y-8 relative z-10">
        {/* Estatísticas */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Total Cursos */}
          <div className="group relative">
            <div className="absolute inset-0 bg-[#00A651]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#18181b]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-[#00A651]/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#00A651]/10 border border-[#00A651]/20">
                  <BookOpen className="w-6 h-6 text-[#00A651]" />
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-white mb-1">{totalCourses}</div>
                  <p className="text-sm text-zinc-500">Cursos</p>
                </div>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-[#00A651] rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Aulas Concluídas */}
          <div className="group relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#18181b]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-white mb-1">{completedLessons}</div>
                  <p className="text-sm text-zinc-500">Concluídas</p>
                </div>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: totalLessons > 0 ? `${(completedLessons / totalLessons) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>

          {/* Total Aulas */}
          <div className="group relative">
            <div className="absolute inset-0 bg-zinc-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#18181b]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-zinc-600/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                  <TrendingUp className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-white mb-1">{totalLessons}</div>
                  <p className="text-sm text-zinc-500">Total</p>
                </div>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-600 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filtros e Busca */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="flex-1">
            <TabsList className="bg-[#18181b]/80 backdrop-blur-xl border border-white/5 p-1 h-auto">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-[#00A651] data-[state=active]:text-white text-zinc-500 rounded-lg px-4 py-2.5 transition-all"
              >
                Todos
              </TabsTrigger>
              <TabsTrigger 
                value="in-progress" 
                className="data-[state=active]:bg-[#00A651] data-[state=active]:text-white text-zinc-500 rounded-lg px-4 py-2.5 transition-all"
              >
                Em andamento
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="data-[state=active]:bg-[#00A651] data-[state=active]:text-white text-zinc-500 rounded-lg px-4 py-2.5 transition-all"
              >
                Concluídos
              </TabsTrigger>
              <TabsTrigger 
                value="not-started" 
                className="data-[state=active]:bg-[#00A651] data-[state=active]:text-white text-zinc-500 rounded-lg px-4 py-2.5 transition-all"
              >
                Não iniciados
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
            <Input
              placeholder="Buscar curso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-[#18181b]/80 backdrop-blur-xl border-white/5 text-white placeholder:text-zinc-600 focus:border-[#00A651]/50 transition-all rounded-xl"
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
            <div className="bg-[#18181b]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-16">
              <div className="text-center">
                <div className="relative w-fit mx-auto mb-6">
                  <div className="absolute inset-0 bg-zinc-900/50 rounded-full blur-2xl" />
                  <div className="relative p-6 rounded-full bg-zinc-900/50 border border-white/5">
                    <GraduationCap className="w-16 h-16 text-zinc-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Nenhum curso encontrado</h3>
                <p className="text-zinc-500">
                  {searchQuery || filter !== 'all'
                    ? 'Tente ajustar seus filtros'
                    : 'Você ainda não tem acesso a nenhum curso'}
                </p>
              </div>
            </div>
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
                transition={{ delay: 0.3 + (index * 0.05) }}
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
