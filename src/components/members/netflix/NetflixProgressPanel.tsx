import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Lesson, Module } from '@/types/memberArea';

interface LessonProgress {
  [lessonId: string]: {
    progress_percentage?: number;
    completed?: boolean;
    video_current_time?: number;
    last_watched_at?: string;
  };
}

interface NetflixProgressPanelProps {
  isOpen: boolean;
  onClose: () => void;
  modules: Module[];
  lessons: Lesson[];
  lessonProgress: LessonProgress;
  onLessonSelect: (lesson: Lesson) => void;
  userName?: string;
}

export function NetflixProgressPanel({
  isOpen,
  onClose,
  modules,
  lessons,
  lessonProgress,
  onLessonSelect,
  userName,
}: NetflixProgressPanelProps) {
  // Calculate overall stats
  const stats = useMemo(() => {
    const completedLessons = Object.values(lessonProgress).filter(p => p.completed).length;
    const inProgressLessons = Object.values(lessonProgress).filter(
      p => p.progress_percentage && p.progress_percentage > 0 && !p.completed
    ).length;
    const totalLessons = lessons.length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      completedLessons,
      inProgressLessons,
      totalLessons,
      progressPercentage,
      remainingLessons: totalLessons - completedLessons,
    };
  }, [lessons, lessonProgress]);

  // Calculate module progress
  const moduleProgress = useMemo(() => {
    return modules.map(module => {
      const moduleLessons = lessons.filter(l => l.module_id === module.id);
      const completedInModule = moduleLessons.filter(l => lessonProgress[l.id]?.completed).length;
      
      return {
        ...module,
        lessons: moduleLessons,
        completedLessons: completedInModule,
        totalLessons: moduleLessons.length,
        percentage: moduleLessons.length > 0 
          ? Math.round((completedInModule / moduleLessons.length) * 100) 
          : 0,
      };
    });
  }, [modules, lessons, lessonProgress]);

  // Get recently watched lessons
  const recentlyWatched = useMemo(() => {
    return lessons
      .filter(l => lessonProgress[l.id]?.progress_percentage && lessonProgress[l.id]?.progress_percentage! > 0 && !lessonProgress[l.id]?.completed)
      .slice(0, 3);
  }, [lessons, lessonProgress]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md bg-stone-950 border-l border-white/10 p-0 z-[100]"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-semibold text-white">
                  Meu Progresso
                </SheetTitle>
                {userName && (
                  <p className="text-sm text-white/50 mt-0.5">{userName}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 pb-6 space-y-6">
              {/* Overall Progress */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6"
              >
                <div className="relative inline-flex items-center justify-center w-32 h-32">
                  {/* Circular progress background */}
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-white/10"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      className="text-amber-500"
                      strokeDasharray={`${stats.progressPercentage * 3.52} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{stats.progressPercentage}%</span>
                  </div>
                </div>
                <p className="text-white/60 text-sm mt-3">
                  {stats.completedLessons} de {stats.totalLessons} aulas concluídas
                </p>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-3 gap-3 text-center"
              >
                <div className="bg-white/5 rounded-xl py-3">
                  <p className="text-xl font-bold text-green-400">{stats.completedLessons}</p>
                  <p className="text-white/40 text-xs mt-0.5">Concluídas</p>
                </div>
                <div className="bg-white/5 rounded-xl py-3">
                  <p className="text-xl font-bold text-amber-400">{stats.inProgressLessons}</p>
                  <p className="text-white/40 text-xs mt-0.5">Em progresso</p>
                </div>
                <div className="bg-white/5 rounded-xl py-3">
                  <p className="text-xl font-bold text-white/60">{stats.remainingLessons}</p>
                  <p className="text-white/40 text-xs mt-0.5">Restantes</p>
                </div>
              </motion.div>

              {/* Module Progress */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <h3 className="text-white/70 text-xs font-medium uppercase tracking-wider mb-3">
                  Por módulo
                </h3>

                {moduleProgress.map((module, index) => (
                  <div
                    key={module.id}
                    className="bg-white/5 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium truncate flex-1 mr-2">
                        {module.title}
                      </span>
                      <span className="text-white/50 text-xs shrink-0">
                        {module.completedLessons}/{module.totalLessons}
                      </span>
                    </div>
                    <Progress 
                      value={module.percentage} 
                      className="h-1 bg-white/10"
                    />
                  </div>
                ))}
              </motion.div>

              {/* Continue Watching */}
              {recentlyWatched.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <h3 className="text-white/70 text-xs font-medium uppercase tracking-wider mb-3">
                    Continuar assistindo
                  </h3>

                  {recentlyWatched.map((lesson) => {
                    const progress = lessonProgress[lesson.id];
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          onLessonSelect(lesson);
                          onClose();
                        }}
                        className="w-full bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors text-left flex items-center gap-3"
                      >
                        <div className="relative w-14 h-9 rounded overflow-hidden bg-white/10 shrink-0">
                          {lesson.cover_image_url ? (
                            <img 
                              src={lesson.cover_image_url} 
                              alt={lesson.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-3 h-3 text-white/40 fill-white/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{lesson.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress 
                              value={progress?.progress_percentage || 0} 
                              className="h-1 flex-1 bg-white/10"
                            />
                            <span className="text-white/40 text-xs">
                              {progress?.progress_percentage || 0}%
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
