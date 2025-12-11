import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Play, 
  Trophy, 
  Target, 
  Flame,
  BookOpen,
  TrendingUp
} from 'lucide-react';
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
    
    // Calculate total watch time (estimated based on progress)
    const totalWatchTimeMinutes = lessons.reduce((acc, lesson) => {
      const progress = lessonProgress[lesson.id];
      if (progress?.completed) {
        return acc + (lesson.duration || 0) / 60;
      }
      if (progress?.progress_percentage) {
        return acc + ((lesson.duration || 0) / 60) * (progress.progress_percentage / 100);
      }
      return acc;
    }, 0);

    return {
      completedLessons,
      inProgressLessons,
      totalLessons,
      progressPercentage,
      remainingLessons: totalLessons - completedLessons,
      totalWatchTimeMinutes: Math.round(totalWatchTimeMinutes),
    };
  }, [lessons, lessonProgress]);

  // Calculate module progress
  const moduleProgress = useMemo(() => {
    return modules.map(module => {
      const moduleLessons = lessons.filter(l => l.module_id === module.id);
      const completedInModule = moduleLessons.filter(l => lessonProgress[l.id]?.completed).length;
      const inProgressInModule = moduleLessons.filter(
        l => lessonProgress[l.id]?.progress_percentage && 
             lessonProgress[l.id]?.progress_percentage! > 0 && 
             !lessonProgress[l.id]?.completed
      ).length;
      
      return {
        ...module,
        lessons: moduleLessons,
        completedLessons: completedInModule,
        inProgressLessons: inProgressInModule,
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
      .filter(l => lessonProgress[l.id]?.progress_percentage && lessonProgress[l.id]?.progress_percentage! > 0)
      .slice(0, 5);
  }, [lessons, lessonProgress]);

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg bg-gradient-to-b from-stone-900 via-stone-900 to-black border-l border-white/10 p-0 z-[100]"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold text-white">
                Meu Progresso
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {userName && (
              <p className="text-sm text-white/60 mt-1">Olá, {userName}! 👋</p>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Overall Progress Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent rounded-2xl p-5 border border-amber-500/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Progresso Geral</h3>
                    <p className="text-white/60 text-sm">Continue assim!</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Conclusão do curso</span>
                    <span className="text-white font-bold">{stats.progressPercentage}%</span>
                  </div>
                  <Progress 
                    value={stats.progressPercentage} 
                    className="h-3 bg-white/10"
                  />
                </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-white/60 text-xs">Concluídas</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.completedLessons}</p>
                  <p className="text-white/40 text-xs">de {stats.totalLessons} aulas</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="w-4 h-4 text-blue-400" />
                    <span className="text-white/60 text-xs">Em progresso</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.inProgressLessons}</p>
                  <p className="text-white/40 text-xs">aulas iniciadas</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-orange-400" />
                    <span className="text-white/60 text-xs">Restantes</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.remainingLessons}</p>
                  <p className="text-white/40 text-xs">aulas para concluir</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-white/60 text-xs">Tempo assistido</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatTime(stats.totalWatchTimeMinutes)}</p>
                  <p className="text-white/40 text-xs">de estudo</p>
                </div>
              </motion.div>

              {/* Module Progress */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-white/60" />
                  <h3 className="text-white font-semibold">Progresso por Módulo</h3>
                </div>

                <div className="space-y-2">
                  {moduleProgress.map((module, index) => (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-white/40 text-xs font-medium">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <h4 className="text-white text-sm font-medium truncate">
                            {module.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {module.percentage === 100 && (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          )}
                          <span className="text-white/60 text-xs">
                            {module.completedLessons}/{module.totalLessons}
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={module.percentage} 
                        className="h-1.5 bg-white/10"
                      />
                      {module.inProgressLessons > 0 && (
                        <p className="text-amber-400/80 text-xs mt-2 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {module.inProgressLessons} aula(s) em andamento
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Recently Watched */}
              {recentlyWatched.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-white/60" />
                    <h3 className="text-white font-semibold">Acessadas Recentemente</h3>
                  </div>

                  <div className="space-y-2">
                    {recentlyWatched.map((lesson) => {
                      const progress = lessonProgress[lesson.id];
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            onLessonSelect(lesson);
                            onClose();
                          }}
                          className="w-full bg-white/5 rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-colors text-left flex items-center gap-3"
                        >
                          <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                            {lesson.cover_image_url ? (
                              <img 
                                src={lesson.cover_image_url} 
                                alt={lesson.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-4 h-4 text-white/40" />
                              </div>
                            )}
                            {progress?.completed && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {lesson.title}
                            </p>
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
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
