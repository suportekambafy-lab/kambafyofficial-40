import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BarChart3, Play, CheckCircle, Clock, LogOut } from 'lucide-react';
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
}
export function MemberAreaSlideMenu({
  lessons,
  modules,
  lessonProgress,
  getCourseProgress,
  totalDuration,
  completedLessons,
  onLessonSelect,
  onLogout
}: MemberAreaSlideMenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
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
          
          <SheetDescription className="text-slate-300">
            Acompanhe seu progresso e pesquise aulas
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Progresso do Curso */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Progresso do Curso</h3>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500 ease-out" style={{
              width: `${getCourseProgress(totalLessonsCount)}%`
            }}></div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-300">
                {completedLessons} de {totalLessonsCount} aulas
              </p>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                {getCourseProgress(totalLessonsCount)}%
              </Badge>
            </div>

            {/* Estatísticas Adicionais */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <p className="text-lg font-bold text-white">{totalLessonsCount}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className="text-center p-3 bg-emerald-500/20 rounded-lg">
                <p className="text-lg font-bold text-emerald-400">{completedLessons}</p>
                <p className="text-xs text-emerald-300">Concluídas</p>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <p className="text-lg font-bold text-white">
                  {totalDuration > 0 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}min` : 'N/A'}
                </p>
                <p className="text-xs text-gray-400">Duração</p>
              </div>
            </div>
          </div>

          {/* Pesquisa de Aulas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Pesquisar Aulas</h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Digite o nome da aula..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" />
            </div>

            {searchTerm && <div className="text-sm text-gray-300">
                {filteredLessons.length} resultado{filteredLessons.length !== 1 ? 's' : ''} encontrado{filteredLessons.length !== 1 ? 's' : ''}
              </div>}
          </div>

          {/* Resultados da Pesquisa */}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="space-y-4">
              {searchTerm ? <div className="space-y-4">
                  {/* Aulas de módulos */}
                  {Object.values(filteredLessonsByModule).map(({
                module,
                lessons: moduleLessons
              }) => <div key={module.id} className="space-y-2">
                      <h4 className="font-medium text-emerald-400 text-sm px-2 py-1 bg-gray-800 rounded">
                        📁 {module.title}
                      </h4>
                      {moduleLessons.map(lesson => <div key={lesson.id} onClick={() => handleLessonClick(lesson)} className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                          {getLessonStatusIcon(lesson)}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-white truncate">{lesson.title}</h5>
                            {lesson.description && <p className="text-xs text-gray-400 line-clamp-2">{lesson.description}</p>}
                          </div>
                        </div>)}
                    </div>)}

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
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm">Digite algo para pesquisar aulas</p>
                </div>}
            </div>
          </ScrollArea>

          {/* Botão de Logout */}
          {onLogout && <div className="mt-6 pt-4 border-t border-gray-700">
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