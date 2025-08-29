import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  BookOpen, 
  Clock, 
  Users,
  Search,
  Settings,
  LogOut,
  ChevronRight,
  Star,
  Menu,
  Home,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { Lesson, Module, MemberArea } from '@/types/memberArea';

interface ModernMemberDashboardProps {
  memberArea: MemberArea;
  lessons: Lesson[];
  modules: Module[];
}

export default function ModernMemberDashboard({ memberArea, lessons, modules }: ModernMemberDashboardProps) {
  const navigate = useNavigate();
  const { student, logout } = useMemberAreaAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');

  const publishedLessons = lessons.filter(lesson => lesson.status === 'published').sort((a, b) => a.order_number - b.order_number);
  const publishedModules = modules.filter(module => module.status === 'published').sort((a, b) => a.order_number - b.order_number);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso"
      });
      navigate(`/login/${memberArea.id}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    }
  };

  const handleModuleClick = (module: Module) => {
    navigate(`/area/${memberArea.id}/module/${module.id}`);
  };

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`/area/${memberArea.id}/lesson/${lesson.id}`);
  };

  const NavigationSidebar = ({ isMobileSidebar = false }: { isMobileSidebar?: boolean }) => (
    <div className={`${isMobileSidebar ? 'w-full' : 'w-64'} bg-card border-r border-border h-full flex flex-col`}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">{memberArea.name}</h2>
            <p className="text-xs text-muted-foreground">Área de Membros</p>
          </div>
        </div>

        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/10 text-primary">
            <Home className="w-4 h-4" />
            Início
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <BookOpen className="w-4 h-4" />
            Meus Cursos
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <MessageCircle className="w-4 h-4" />
            Suporte
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <HelpCircle className="w-4 h-4" />
            Ajuda
          </Button>
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {student?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{student?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{student?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <NavigationSidebar isMobileSidebar />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-primary-foreground" />
              </div>
              <h1 className="font-semibold text-foreground truncate">{memberArea.name}</h1>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Content */}
        <div className="p-4 space-y-6">
          {/* Welcome Section */}
          <div className="text-center py-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Bem-vindo, {student?.name?.split(' ')[0]}!
            </h2>
            <p className="text-muted-foreground">Continue seus estudos de onde parou</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar aulas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl border-0 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Modules Grid */}
          {publishedModules.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Módulos do Curso</h3>
              <div className="space-y-3">
                {publishedModules.map((module) => (
                  <Card
                    key={module.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-r from-card to-card/50"
                    onClick={() => handleModuleClick(module)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">{module.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {module.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {lessons.filter(l => l.module_id === module.id).length} aulas
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Individual Lessons */}
          {publishedLessons.filter(l => !l.module_id).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Aulas Avulsas</h3>
              <div className="space-y-3">
                {publishedLessons.filter(l => !l.module_id).map((lesson) => (
                  <Card
                    key={lesson.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200"
                    onClick={() => handleLessonClick(lesson)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Play className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{lesson.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {lesson.duration || 5} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <NavigationSidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Hero Section */}
        <div className="relative h-96 bg-gradient-to-br from-primary via-primary/90 to-primary/80 overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative h-full flex items-center justify-center text-center p-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold text-primary-foreground mb-4">
                {memberArea.name}
              </h1>
              <p className="text-xl text-primary-foreground/90 mb-6">
                {memberArea.description || 'Bem-vindo à sua área exclusiva de aprendizado'}
              </p>
              <div className="flex items-center justify-center gap-6 text-primary-foreground/80">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{publishedLessons.length} aulas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Acesso exclusivo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  <span>Conteúdo premium</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Olá, {student?.name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-muted-foreground">Continue de onde parou ou explore novos conteúdos</p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar aulas e módulos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-muted rounded-xl border-0 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Modules Netflix-style Showcase */}
          {publishedModules.length > 0 && (
            <section className="mb-12">
              <h3 className="text-xl font-semibold text-foreground mb-6">Módulos do Curso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedModules.map((module) => (
                  <Card
                    key={module.id}
                    className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 bg-card overflow-hidden"
                    onClick={() => handleModuleClick(module)}
                  >
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                      <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="w-8 h-8 text-primary" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button size="sm" className="bg-primary/90 hover:bg-primary">
                          <Play className="w-4 h-4 mr-2" />
                          Acessar
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {module.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {module.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {lessons.filter(l => l.module_id === module.id).length} aulas
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Individual Lessons */}
          {publishedLessons.filter(l => !l.module_id).length > 0 && (
            <section>
              <h3 className="text-xl font-semibold text-foreground mb-6">Aulas Avulsas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {publishedLessons.filter(l => !l.module_id).map((lesson) => (
                  <Card
                    key={lesson.id}
                    className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                    onClick={() => handleLessonClick(lesson)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Play className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className="text-xs mb-1">
                            Aula {lesson.order_number}
                          </Badge>
                        </div>
                      </div>
                      <h4 className="font-medium text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {lesson.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{lesson.duration || 5} min</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}