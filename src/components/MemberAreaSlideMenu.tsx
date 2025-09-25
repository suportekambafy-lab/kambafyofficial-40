import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BarChart3, Play, CheckCircle, Clock, Menu } from 'lucide-react';
import type { Lesson, Module } from '@/types/memberArea';

interface MemberAreaSlideMenuProps {
  lessons: Lesson[];
  modules: Module[];
  lessonProgress: Record<string, any>;
  getCourseProgress: (totalLessons: number) => number;
  onLessonSelect?: (lesson: Lesson) => void;
}

export function MemberAreaSlideMenu({ 
  lessons, 
  modules, 
  lessonProgress, 
  getCourseProgress,
  onLessonSelect 
}: MemberAreaSlideMenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const publishedLessons = lessons.filter(lesson => lesson.status === 'published');
  const completedLessons = Object.values(lessonProgress).filter(p => p.completed).length;

  // Filtrar aulas baseado no termo de pesquisa
  const filteredLessons = publishedLessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Organizar aulas por módulos para a pesquisa
  const filteredLessonsByModule = modules.reduce((acc, module) => {
    const moduleLessons = filteredLessons.filter(lesson => lesson.module_id === module.id);
    if (moduleLessons.length > 0) {
      acc[module.id] = { module, lessons: moduleLessons };
    }
    return acc;
  }, {} as Record<string, { module: Module; lessons: Lesson[] }>);

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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          className="fixed top-4 right-4 z-50 shadow-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
        >
          <Menu className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Menu do Curso
          </SheetTitle>
          <SheetDescription>
            Acompanhe seu progresso e pesquise aulas
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Progresso do Curso */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Progresso do Curso</h3>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out" 
                style={{ 
                  width: `${getCourseProgress(publishedLessons.length)}%`
                }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {completedLessons} de {publishedLessons.length} aulas
              </p>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {getCourseProgress(publishedLessons.length)}%
              </Badge>
            </div>
          </div>

          {/* Pesquisa de Aulas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Pesquisar Aulas</h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Digite o nome da aula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchTerm && (
              <div className="text-sm text-gray-600">
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
                      <h4 className="font-medium text-gray-700 text-sm px-2 py-1 bg-gray-100 rounded">
                        📁 {module.title}
                      </h4>
                      {moduleLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          onClick={() => handleLessonClick(lesson)}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          {getLessonStatusIcon(lesson)}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 truncate">{lesson.title}</h5>
                            {lesson.description && (
                              <p className="text-xs text-gray-600 line-clamp-2">{lesson.description}</p>
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
                        <h4 className="font-medium text-gray-700 text-sm px-2 py-1 bg-gray-100 rounded">
                          📄 Outras Aulas
                        </h4>
                      )}
                      {filteredLessonsWithoutModule.map((lesson) => (
                        <div
                          key={lesson.id}
                          onClick={() => handleLessonClick(lesson)}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          {getLessonStatusIcon(lesson)}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 truncate">{lesson.title}</h5>
                            {lesson.description && (
                              <p className="text-xs text-gray-600 line-clamp-2">{lesson.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredLessons.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>Nenhuma aula encontrada</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Digite algo para pesquisar aulas</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}