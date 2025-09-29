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
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (progress?.progress_percentage > 0) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <Play className="w-4 h-4 text-gray-400" />;
  };
  return <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="fixed top-4 right-4 z-50 shadow-lg bg-gray-900/80 backdrop-blur-sm hover:bg-gray-800/90 text-white border border-gray-700/50 hover:border-emerald-500/50 p-3 rounded-lg transition-all">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
              <div className="w-4 h-0.5 bg-current rounded-full"></div>
            </div>
            <img src="/kambafy-symbol.svg" alt="Kambafy" className="w-5 h-5 text-emerald-500" />
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-gray-950 text-white border-gray-800">
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
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 px-2">Navegação Rápida</h3>
            
            <Button onClick={() => {
            navigate('/minhas-compras');
            setOpen(false);
          }} variant="outline" className="w-full justify-start gap-3 bg-gray-900 border-gray-700 hover:bg-gray-800 hover:border-emerald-500/50 text-white">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <p className="font-medium">Minhas Compras</p>
                <p className="text-xs text-gray-400">Ver histórico de pedidos</p>
              </div>
            </Button>

            <Button onClick={() => {
            navigate('/vendedor');
            setOpen(false);
          }} variant="outline" className="w-full justify-start gap-3 bg-gray-900 border-gray-700 hover:bg-gray-800 hover:border-emerald-500/50 text-white">
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <p className="font-medium">Painel de Vendedor</p>
                <p className="text-xs text-gray-400">Gerenciar produtos</p>
              </div>
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
                      <div className="px-3 py-2 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-emerald-400 text-sm">
                            📁 {module.title}
                          </h4>
                          <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-400">
                            {moduleStats.progress}%
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-1.5 rounded-full transition-all duration-300" style={{
                        width: `${moduleStats.progress}%`
                      }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {moduleStats.completed}/{moduleStats.total} aulas concluídas
                        </p>
                      </div>
                      {moduleLessons.map(lesson => <div key={lesson.id} onClick={() => handleLessonClick(lesson)} className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors ml-2">
                          {getLessonStatusIcon(lesson)}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-white truncate">{lesson.title}</h5>
                            {lesson.description && <p className="text-xs text-gray-400 line-clamp-2">{lesson.description}</p>}
                            {lessonProgress[lesson.id]?.progress_percentage > 0 && !lessonProgress[lesson.id]?.completed && <div className="mt-1">
                                <div className="w-full bg-gray-700 rounded-full h-1">
                                  <div className="bg-yellow-500 h-1 rounded-full transition-all duration-300" style={{
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
                      {Object.keys(filteredLessonsByModule).length > 0 && <h4 className="font-medium text-emerald-400 text-sm px-2 py-1 bg-gray-800 rounded">
                          📄 Outras Aulas
                        </h4>}
                      {filteredLessonsWithoutModule.map(lesson => <div key={lesson.id} onClick={() => handleLessonClick(lesson)} className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                          {getLessonStatusIcon(lesson)}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-white truncate">{lesson.title}</h5>
                            {lesson.description && <p className="text-xs text-gray-400 line-clamp-2">{lesson.description}</p>}
                          </div>
                        </div>)}
                    </div>}

                  {filteredLessons.length === 0 && <div className="text-center py-8 text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <p>Nenhuma aula encontrada</p>
                    </div>}
                </div> : <div className="text-center py-8 text-gray-400">
                  
                  
                </div>}
            </div>
          </ScrollArea>

          {/* Botão de Logout */}
          {onLogout && <div className="mt-6 pt-4">
              <Button onClick={() => {
            onLogout();
            setOpen(false);
          }} variant="outline" className="w-full flex items-center gap-2 text-red-400 border-red-400/50 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400">
                <LogOut className="w-4 h-4" />
                Sair da Área
              </Button>
            </div>}
        </div>
      </SheetContent>
    </Sheet>;
}