import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  BarChart3, 
  Play, 
  CheckCircle, 
  Clock, 
  LogOut, 
  Menu,
  BookOpen,
  ChevronDown,
  ChevronRight,
  List
} from 'lucide-react';
import type { Lesson, Module } from '@/types/memberArea';
interface MemberAreaSlideMenuProps {
  lessons: Lesson[];
  modules: Module[];
  lessonProgress: Record<string, any>;
  getCourseProgress: (totalLessons: number) => number;
  totalDuration: number;
  completedLessons: number;
  onLessonSelect?: (lesson: Lesson) => void;
  onLogout?: () => void;
  selectedLesson?: Lesson | null;
}
export function MemberAreaSlideMenu({
  lessons,
  modules,
  lessonProgress,
  getCourseProgress,
  totalDuration,
  completedLessons,
  onLessonSelect,
  onLogout,
  selectedLesson
}: MemberAreaSlideMenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

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
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

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

  const isLessonActive = (lesson: Lesson) => {
    return selectedLesson?.id === lesson.id;
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="fixed top-4 right-4 z-50 shadow-lg bg-gray-900/80 backdrop-blur-sm hover:bg-gray-800/90 text-white border border-gray-700/50 hover:border-emerald-500/50 p-3 rounded-lg transition-all"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-gray-950 text-white border-gray-800">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-slate-50">
            <img src="/kambafy-logo.png" alt="Kambafy" className="h-8 w-auto" />
            <span>Área de Membros</span>
          </SheetTitle>
          <SheetDescription className="text-slate-300">
            Navegue pelos módulos e acompanhe seu progresso
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="modules" className="mt-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="modules" className="data-[state=active]:bg-emerald-600">
              <List className="w-4 h-4 mr-2" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-emerald-600">
              <Search className="w-4 h-4 mr-2" />
              Pesquisar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="space-y-4 mt-6">
            {/* Progresso do Curso */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Progresso do Curso</h3>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${getCourseProgress(totalLessonsCount)}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-300">
                  {completedLessons} de {totalLessonsCount} aulas
                </p>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                  {getCourseProgress(totalLessonsCount)}%
                </Badge>
              </div>
            </div>

            {/* Lista de Módulos */}
            <ScrollArea className="flex-1 max-h-[450px]">
              <div className="space-y-3">
                {modules.map((module) => {
                  const moduleLessons = publishedLessons.filter(lesson => lesson.module_id === module.id);
                  const isExpanded = expandedModules.includes(module.id);
                  const completedInModule = moduleLessons.filter(lesson => lessonProgress[lesson.id]?.completed).length;

                  return (
                    <Collapsible key={module.id} open={isExpanded} onOpenChange={() => toggleModule(module.id)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700/50">
                          {module.cover_image_url ? (
                            <img 
                              src={module.cover_image_url} 
                              alt={module.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-emerald-400" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <h4 className="font-semibold text-white">{module.title}</h4>
                            <p className="text-sm text-gray-400">{moduleLessons.length} aulas</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-24 bg-gray-600 rounded-full h-1">
                                <div 
                                  className="bg-emerald-400 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${moduleLessons.length > 0 ? (completedInModule / moduleLessons.length) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400">
                                {completedInModule}/{moduleLessons.length}
                              </span>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 ml-4 space-y-2">
                        {moduleLessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            onClick={() => handleLessonClick(lesson)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isLessonActive(lesson)
                                ? 'bg-emerald-500/20 border border-emerald-500/50'
                                : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700/30'
                            }`}
                          >
                            {getLessonStatusIcon(lesson)}
                            <div className="flex-1 min-w-0">
                              <h5 className={`font-medium truncate ${
                                isLessonActive(lesson) ? 'text-emerald-300' : 'text-white'
                              }`}>
                                Aula {lesson.order_number}: {lesson.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-400">{lesson.duration} min</span>
                              </div>
                            </div>
                            {isLessonActive(lesson) && (
                              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            )}
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                {/* Aulas sem módulo */}
                {publishedLessons.filter(lesson => !lesson.module_id).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-300 px-2 py-1">Outras Aulas</h4>
                    {publishedLessons.filter(lesson => !lesson.module_id).map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          isLessonActive(lesson)
                            ? 'bg-emerald-500/20 border border-emerald-500/50'
                            : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700/30'
                        }`}
                      >
                        {getLessonStatusIcon(lesson)}
                        <div className="flex-1 min-w-0">
                          <h5 className={`font-medium truncate ${
                            isLessonActive(lesson) ? 'text-emerald-300' : 'text-white'
                          }`}>
                            {lesson.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">{lesson.duration} min</span>
                          </div>
                        </div>
                        {isLessonActive(lesson) && (
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="space-y-4 mt-6">
            {/* Pesquisa de Aulas */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  placeholder="Digite o nome da aula..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" 
                />
              </div>

              {searchTerm && (
                <div className="text-sm text-gray-300">
                  {filteredLessons.length} resultado{filteredLessons.length !== 1 ? 's' : ''} encontrado{filteredLessons.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Resultados da Pesquisa */}
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-4">
                {searchTerm ? (
                  <div className="space-y-4">
                    {/* Aulas de módulos */}
                    {Object.values(filteredLessonsByModule).map(({ module, lessons: moduleLessons }) => (
                      <div key={module.id} className="space-y-2">
                        <h4 className="font-medium text-emerald-400 text-sm px-2 py-1 bg-gray-800 rounded">
                          📁 {module.title}
                        </h4>
                        {moduleLessons.map(lesson => (
                          <div 
                            key={lesson.id} 
                            onClick={() => handleLessonClick(lesson)} 
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              isLessonActive(lesson)
                                ? 'border-emerald-500/50 bg-emerald-500/20'
                                : 'border-gray-700 hover:bg-gray-800'
                            }`}
                          >
                            {getLessonStatusIcon(lesson)}
                            <div className="flex-1 min-w-0">
                              <h5 className={`font-medium truncate ${
                                isLessonActive(lesson) ? 'text-emerald-300' : 'text-white'
                              }`}>
                                {lesson.title}
                              </h5>
                              {lesson.description && (
                                <p className="text-xs text-gray-400 line-clamp-2">{lesson.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Aulas sem módulo */}
                    {filteredLessonsWithoutModule.length > 0 && (
                      <div className="space-y-2">
                        {Object.keys(filteredLessonsByModule).length > 0 && (
                          <h4 className="font-medium text-emerald-400 text-sm px-2 py-1 bg-gray-800 rounded">
                            📄 Outras Aulas
                          </h4>
                        )}
                        {filteredLessonsWithoutModule.map(lesson => (
                          <div 
                            key={lesson.id} 
                            onClick={() => handleLessonClick(lesson)} 
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              isLessonActive(lesson)
                                ? 'border-emerald-500/50 bg-emerald-500/20'
                                : 'border-gray-700 hover:bg-gray-800'
                            }`}
                          >
                            {getLessonStatusIcon(lesson)}
                            <div className="flex-1 min-w-0">
                              <h5 className={`font-medium truncate ${
                                isLessonActive(lesson) ? 'text-emerald-300' : 'text-white'
                              }`}>
                                {lesson.title}
                              </h5>
                              {lesson.description && (
                                <p className="text-xs text-gray-400 line-clamp-2">{lesson.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredLessons.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Search className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <p>Nenhuma aula encontrada</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm">Digite algo para pesquisar aulas</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Botão de Logout */}
        {onLogout && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <Button 
              onClick={() => {
                onLogout();
                setOpen(false);
              }} 
              variant="outline" 
              className="w-full flex items-center gap-2 text-red-400 border-red-400/50 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400"
            >
              <LogOut className="w-4 h-4" />
              Sair da Área
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}