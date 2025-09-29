import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BarChart3, Play, CheckCircle, Clock, LogOut, User, ShoppingBag, LayoutDashboard, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import type { Lesson, Module } from '@/types/memberArea';
interface MemberAreaSlideMenuProps {
  lessons: Lesson[];
  modules: Module[];
  lessonProgress: Record<string, any>;
  getCourseProgress: (totalLessons: number) => number;
  getModuleProgress: (moduleId: string, lessons: any[]) => number;
  getModuleStats: (moduleId: string, lessons: any[]) => any;
  totalDuration: number;
  completedLessons: number;
  onLessonSelect?: (lesson: Lesson) => void;
  onLogout?: () => void;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}
export function MemberAreaSlideMenu({
  lessons,
  modules,
  lessonProgress,
  getCourseProgress,
  getModuleProgress,
  getModuleStats,
  totalDuration,
  completedLessons,
  onLessonSelect,
  onLogout,
  userEmail,
  userName,
  userAvatar
}: MemberAreaSlideMenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const publishedLessons = lessons.filter(lesson => lesson.status === 'published');
  const totalLessonsCount = publishedLessons.length;

  // Filtrar aulas baseado no termo de pesquisa
  const filteredLessons = publishedLessons.filter(lesson => lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) || lesson.description?.toLowerCase().includes(searchTerm.toLowerCase()));

  // Organizar aulas por módulos para a pesquisa
  const filteredLessonsByModule = modules.reduce((acc, module) => {
    const moduleLessons = filteredLessons.filter(lesson => lesson.module_id === module.id);
    if (moduleLessons.length > 0) {
      acc[module.id] = {
        module,
        lessons: moduleLessons
      };
    }
    return acc;
  }, {} as Record<string, {
    module: Module;
    lessons: Lesson[];
  }>);
  const filteredLessonsWithoutModule = filteredLessons.filter(lesson => !lesson.module_id);
  const handleLessonClick = (lesson: Lesson) => {
    if (onLessonSelect) {
      onLessonSelect(lesson);
    }
    setOpen(false);
  };
  const getLessonStatusIcon = (lesson: Lesson) => {
    const progress = lessonProgress[lesson.id];
    if (progress?.completed) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (progress?.progress_percentage > 0) {
      return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
    return <Play className="w-4 h-4 text-muted-foreground" />;
  };
  return <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
            </div>
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-gray-950 border-gray-800">
        <SheetHeader>
          
          
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Perfil do Usuário */}
          <div className="bg-background/50 p-4 rounded-lg border">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={userAvatar} alt={userName || userEmail} />
                <AvatarFallback className="bg-muted text-foreground text-lg font-semibold">
                  {(userName || userEmail || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-lg truncate">
                  {userName || 'Estudante'}
                </h3>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Mail className="w-3 h-3" />
                  <p className="truncate">{userEmail || 'Email não disponível'}</p>
                </div>
              </div>
            </div>

            {/* Estatísticas do Perfil */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-lg font-bold text-foreground">{completedLessons}</p>
                <p className="text-xs text-muted-foreground">Aulas Concluídas</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-lg font-bold text-foreground">{getCourseProgress(totalLessonsCount)}%</p>
                <p className="text-xs text-muted-foreground">Progresso</p>
              </div>
            </div>
          </div>

          {/* Navegação Rápida */}
          <div className="space-y-2">
            <h3 className="px-2 text-sm font-medium text-muted-foreground">Menu</h3>
            
            <Button onClick={() => {
            navigate('/minhas-compras');
            setOpen(false);
          }} variant="ghost" className="w-full justify-start gap-3">
              <ShoppingBag className="w-4 h-4" />
              <span>Minhas Compras</span>
            </Button>

            <Button onClick={() => {
            navigate('/vendedor');
            setOpen(false);
          }} variant="ghost" className="w-full justify-start gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Painel de Vendedor</span>
            </Button>
          </div>

          {/* Pesquisa de Aulas */}
          

          {/* Resultados da Pesquisa */}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="space-y-4">
              {searchTerm ? <div className="space-y-4">
                  {/* Aulas de módulos */}
                  {Object.values(filteredLessonsByModule).map(({
                module,
                lessons: moduleLessons
              }) => {
                const moduleStats = getModuleStats(module.id, lessons);
                return <div key={module.id} className="space-y-3">
                      <div className="px-3 py-2 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            📁 {module.title}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {moduleStats.progress}%
                          </Badge>
                        </div>
                        <div className="w-full bg-muted-foreground/20 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{
                        width: `${moduleStats.progress}%`
                      }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {moduleStats.completed}/{moduleStats.total} aulas concluídas
                        </p>
                      </div>
                      {moduleLessons.map(lesson => <div key={lesson.id} onClick={() => handleLessonClick(lesson)} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors ml-2">
                          {getLessonStatusIcon(lesson)}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium truncate">{lesson.title}</h5>
                            {lesson.description && <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>}
                            {lessonProgress[lesson.id]?.progress_percentage > 0 && !lessonProgress[lesson.id]?.completed && <div className="mt-1">
                                <div className="w-full bg-muted-foreground/20 rounded-full h-1">
                                  <div className="bg-primary h-1 rounded-full transition-all duration-300" style={{
                            width: `${lessonProgress[lesson.id]?.progress_percentage || 0}%`
                          }} />
                                </div>
                              </div>}
                          </div>
                        </div>)}
                    </div>;
              })}

                  {/* Aulas sem módulo */}
                  {filteredLessonsWithoutModule.length > 0 && <div className="space-y-2">
                      {Object.keys(filteredLessonsByModule).length > 0 && <h4 className="font-medium text-sm px-2 py-1 bg-muted rounded">
                          📄 Outras Aulas
                        </h4>}
                      {filteredLessonsWithoutModule.map(lesson => <div key={lesson.id} onClick={() => handleLessonClick(lesson)} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors">
                          {getLessonStatusIcon(lesson)}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium truncate">{lesson.title}</h5>
                            {lesson.description && <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>}
                          </div>
                        </div>)}
                    </div>}

                  {filteredLessons.length === 0 && <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2" />
                      <p>Nenhuma aula encontrada</p>
                    </div>}
                </div> : <div className="text-center py-8 text-muted-foreground">
                  
                  
                </div>}
            </div>
          </ScrollArea>

          {/* Botão de Logout */}
          {onLogout && <div className="mt-6 pt-4 border-t">
              <Button onClick={() => {
            onLogout();
            setOpen(false);
          }} variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>}
        </div>
      </SheetContent>
    </Sheet>;
}