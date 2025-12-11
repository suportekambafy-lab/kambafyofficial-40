import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Play, Check, Lock, Clock, BookOpen, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  duration?: number;
  isCompleted?: boolean;
  isLocked?: boolean;
  progress?: number;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  isLocked?: boolean;
  progress?: number;
  cover_image_url?: string;
}

interface NetflixModuleSidebarProps {
  modules: Module[];
  currentLessonId?: string;
  courseProgress?: number;
  onLessonSelect: (lessonId: string) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export function NetflixModuleSidebar({
  modules,
  currentLessonId,
  courseProgress = 0,
  onLessonSelect,
  onClose,
  isOpen = true,
}: NetflixModuleSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    // Auto-expand module with current lesson
    const moduleWithCurrentLesson = modules.find(m => 
      m.lessons.some(l => l.id === currentLessonId)
    );
    return new Set(moduleWithCurrentLesson ? [moduleWithCurrentLesson.id] : [modules[0]?.id]);
  });

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const getModuleProgress = (module: Module) => {
    const completedCount = module.lessons.filter(l => l.isCompleted).length;
    return module.lessons.length > 0 
      ? Math.round((completedCount / module.lessons.length) * 100)
      : 0;
  };

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        'fixed right-0 top-0 bottom-0 w-full md:w-[400px] lg:w-[450px]',
        'bg-[hsl(var(--netflix-surface))]/95 backdrop-blur-lg z-40',
        'border-l border-white/10 shadow-2xl'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Conteúdo do Curso</h2>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={courseProgress} className="w-24 h-1.5 bg-white/20" />
            <span className="text-xs text-white/50">{courseProgress}% completo</span>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Module List */}
      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="p-4 md:p-6 space-y-3">
          {modules.map((module, moduleIndex) => {
            const isExpanded = expandedModules.has(module.id);
            const moduleProgress = getModuleProgress(module);
            const completedCount = module.lessons.filter(l => l.isCompleted).length;

            return (
              <div
                key={module.id}
                className="rounded-xl overflow-hidden bg-white/5 border border-white/10"
              >
                {/* Module Header */}
                <button
                  onClick={() => !module.isLocked && toggleModule(module.id)}
                  disabled={module.isLocked}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 text-left transition-colors',
                    module.isLocked 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-white/5'
                  )}
                >
                  {/* Module Number or Cover */}
                  <div className="relative flex-shrink-0">
                    {module.cover_image_url ? (
                      <img 
                        src={module.cover_image_url} 
                        alt="" 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{moduleIndex + 1}</span>
                      </div>
                    )}
                    {module.isLocked && (
                      <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                        <Lock className="w-4 h-4 text-white/70" />
                      </div>
                    )}
                  </div>

                  {/* Module Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm line-clamp-1">
                      {module.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/50">
                        {completedCount}/{module.lessons.length} aulas
                      </span>
                      {moduleProgress === 100 && (
                        <Badge className="h-4 text-[10px] bg-primary/20 text-primary border-0">
                          Concluído
                        </Badge>
                      )}
                    </div>
                    {/* Progress Bar */}
                    <Progress 
                      value={moduleProgress} 
                      className="h-1 mt-2 bg-white/10"
                    />
                  </div>

                  {/* Expand Icon */}
                  {!module.isLocked && (
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-white/50" />
                    </motion.div>
                  )}
                </button>

                {/* Lessons List */}
                <AnimatePresence>
                  {isExpanded && !module.isLocked && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-1">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const isCurrent = lesson.id === currentLessonId;
                          
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => !lesson.isLocked && onLessonSelect(lesson.id)}
                              disabled={lesson.isLocked}
                              className={cn(
                                'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                                isCurrent 
                                  ? 'bg-primary/20 border border-primary/30' 
                                  : 'hover:bg-white/5',
                                lesson.isLocked && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              {/* Lesson Status Icon */}
                              <div className="flex-shrink-0">
                                {lesson.isLocked ? (
                                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                    <Lock className="w-3.5 h-3.5 text-white/50" />
                                  </div>
                                ) : lesson.isCompleted ? (
                                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                ) : isCurrent ? (
                                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                    <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                    <span className="text-xs text-white/70">{lessonIndex + 1}</span>
                                  </div>
                                )}
                              </div>

                              {/* Lesson Info */}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  'text-sm line-clamp-1',
                                  isCurrent ? 'text-white font-medium' : 'text-white/80'
                                )}>
                                  {lesson.title}
                                </p>
                                {lesson.duration && (
                                  <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(lesson.duration)}
                                  </p>
                                )}
                                {/* Individual Progress */}
                                {lesson.progress && lesson.progress > 0 && lesson.progress < 100 && (
                                  <Progress 
                                    value={lesson.progress} 
                                    className="h-0.5 mt-1.5 bg-white/10 w-full"
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </motion.aside>
  );
}
