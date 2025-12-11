import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { NetflixHeader } from './NetflixHeader';
import { NetflixHeroBanner } from './NetflixHeroBanner';
import { NetflixCarousel } from './NetflixCarousel';
import { NetflixCourseCard } from './NetflixCourseCard';
import { NetflixModuleSidebar } from './NetflixModuleSidebar';
import { Lesson, Module } from '@/types/memberArea';

interface MemberArea {
  id: string;
  name: string;
  description?: string;
  hero_image_url?: string;
  hero_video_url?: string;
  hero_title?: string;
  hero_description?: string;
  logo_url?: string;
  primary_color?: string;
}

interface LessonProgress {
  [lessonId: string]: {
    progress_percentage?: number;
    completed?: boolean;
    video_current_time?: number;
  };
}

interface NetflixMembersHomeProps {
  memberArea: MemberArea;
  modules: Module[];
  lessons: Lesson[];
  lessonProgress: LessonProgress;
  user?: {
    name?: string;
    email?: string;
    avatar_url?: string;
  };
  onLessonSelect: (lesson: Lesson) => void;
  onLogout: () => void;
}

export function NetflixMembersHome({
  memberArea,
  modules,
  lessons,
  lessonProgress,
  user,
  onLessonSelect,
  onLogout,
}: NetflixMembersHomeProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate course stats
  const completedLessons = useMemo(() => {
    return Object.values(lessonProgress).filter(p => p.completed).length;
  }, [lessonProgress]);

  const totalLessons = lessons.length;
  const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Get lessons that are in progress (started but not completed)
  const continueWatchingLessons = useMemo(() => {
    return lessons.filter(lesson => {
      const progress = lessonProgress[lesson.id];
      return progress && progress.progress_percentage && progress.progress_percentage > 0 && !progress.completed;
    }).slice(0, 10);
  }, [lessons, lessonProgress]);

  // Get next unwatched lesson
  const nextLesson = useMemo(() => {
    // First check for in-progress lessons
    if (continueWatchingLessons.length > 0) {
      return continueWatchingLessons[0];
    }
    // Otherwise find first uncompleted lesson
    return lessons.find(lesson => {
      const progress = lessonProgress[lesson.id];
      return !progress?.completed;
    });
  }, [lessons, lessonProgress, continueWatchingLessons]);

  // Group lessons by module
  const lessonsByModule = useMemo(() => {
    const grouped: Record<string, Lesson[]> = {};
    modules.forEach(module => {
      grouped[module.id] = lessons.filter(l => l.module_id === module.id);
    });
    return grouped;
  }, [modules, lessons]);

  // Get newly added lessons (last 10 published)
  const newLessons = useMemo(() => {
    return [...lessons]
      .filter(l => l.status === 'published')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [lessons]);

  // Get completed lessons for "Revisitar"
  const completedLessonsList = useMemo(() => {
    return lessons.filter(lesson => lessonProgress[lesson.id]?.completed).slice(0, 10);
  }, [lessons, lessonProgress]);

  // Format modules with lesson data for sidebar
  const formattedModules = useMemo(() => {
    return modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description,
      cover_image_url: module.cover_image_url,
      isLocked: module.coming_soon || module.is_paid,
      lessons: (lessonsByModule[module.id] || []).map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        duration: lesson.duration,
        isCompleted: lessonProgress[lesson.id]?.completed,
        progress: lessonProgress[lesson.id]?.progress_percentage,
        isLocked: lesson.is_scheduled && lesson.scheduled_at && new Date(lesson.scheduled_at) > new Date(),
      })),
    }));
  }, [modules, lessonsByModule, lessonProgress]);

  const handlePlay = () => {
    if (nextLesson) {
      onLessonSelect(nextLesson);
    }
  };

  const getModuleTitle = (moduleId?: string | null) => {
    if (!moduleId) return undefined;
    return modules.find(m => m.id === moduleId)?.title;
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: 'hsl(var(--netflix-bg))',
        color: 'hsl(var(--netflix-text))'
      }}
    >
      {/* Header */}
      <NetflixHeader
        logoUrl={memberArea.logo_url}
        userName={user?.name}
        userEmail={user?.email}
        userAvatar={user?.avatar_url}
        onSearch={setSearchQuery}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main className="pt-0">
        {/* Hero Banner */}
        <NetflixHeroBanner
          memberArea={memberArea}
          featuredLesson={nextLesson}
          totalLessons={totalLessons}
          completedLessons={completedLessons}
          lastWatchedProgress={nextLesson ? lessonProgress[nextLesson.id]?.progress_percentage : 0}
          onPlay={handlePlay}
          onViewCurriculum={() => setIsSidebarOpen(true)}
        />

        {/* Carousels */}
        <div className="relative z-10 pt-8 md:pt-12 pb-20 space-y-4">
          {/* Continue Watching */}
          {continueWatchingLessons.length > 0 && (
            <NetflixCarousel title="Continuar a Assistir" subtitle={`${continueWatchingLessons.length} em progresso`}>
              {continueWatchingLessons.map(lesson => (
                <NetflixCourseCard
                  key={lesson.id}
                  id={lesson.id}
                  title={lesson.title}
                  thumbnail={lesson.video_data?.thumbnail as string}
                  duration={lesson.duration}
                  progress={lessonProgress[lesson.id]?.progress_percentage}
                  moduleTitle={getModuleTitle(lesson.module_id)}
                  onClick={() => onLessonSelect(lesson)}
                />
              ))}
            </NetflixCarousel>
          )}

          {/* You might also like - First Module */}
          {modules.length > 0 && (lessonsByModule[modules[0].id] || []).length > 0 && (
            <NetflixCarousel 
              title="You might also like"
              showSeeAll
            >
              {(lessonsByModule[modules[0].id] || []).map(lesson => (
                <NetflixCourseCard
                  key={lesson.id}
                  id={lesson.id}
                  title={lesson.title}
                  thumbnail={lesson.video_data?.thumbnail as string}
                  duration={lesson.duration}
                  isCompleted={lessonProgress[lesson.id]?.completed}
                  progress={lessonProgress[lesson.id]?.progress_percentage}
                  tags={[getModuleTitle(lesson.module_id) || 'Curso']}
                  isLocked={lesson.is_scheduled && lesson.scheduled_at && new Date(lesson.scheduled_at) > new Date()}
                  onClick={() => onLessonSelect(lesson)}
                />
              ))}
            </NetflixCarousel>
          )}

          {/* Other Modules as Carousels */}
          {modules.slice(1).filter(m => (lessonsByModule[m.id] || []).length > 0).map(module => (
            <NetflixCarousel 
              key={module.id} 
              title={module.title}
              subtitle={`${lessonsByModule[module.id]?.length || 0} aulas`}
              showSeeAll
            >
              {(lessonsByModule[module.id] || []).map(lesson => (
                <NetflixCourseCard
                  key={lesson.id}
                  id={lesson.id}
                  title={lesson.title}
                  thumbnail={lesson.video_data?.thumbnail as string}
                  duration={lesson.duration}
                  isCompleted={lessonProgress[lesson.id]?.completed}
                  progress={lessonProgress[lesson.id]?.progress_percentage}
                  tags={[module.title]}
                  isLocked={lesson.is_scheduled && lesson.scheduled_at && new Date(lesson.scheduled_at) > new Date()}
                  onClick={() => onLessonSelect(lesson)}
                />
              ))}
            </NetflixCarousel>
          ))}

          {/* New Lessons */}
          {newLessons.length > 0 && (
            <NetflixCarousel title="Adicionados Recentemente" showSeeAll>
              {newLessons.map(lesson => (
                <NetflixCourseCard
                  key={lesson.id}
                  id={lesson.id}
                  title={lesson.title}
                  thumbnail={lesson.video_data?.thumbnail as string}
                  duration={lesson.duration}
                  isCompleted={lessonProgress[lesson.id]?.completed}
                  moduleTitle={getModuleTitle(lesson.module_id)}
                  tags={['Novo']}
                  onClick={() => onLessonSelect(lesson)}
                />
              ))}
            </NetflixCarousel>
          )}

          {/* Completed - Review */}
          {completedLessonsList.length > 0 && (
            <NetflixCarousel title="Revisitar" subtitle="Aulas que você já concluiu">
              {completedLessonsList.map(lesson => (
                <NetflixCourseCard
                  key={lesson.id}
                  id={lesson.id}
                  title={lesson.title}
                  thumbnail={lesson.video_data?.thumbnail as string}
                  duration={lesson.duration}
                  isCompleted
                  moduleTitle={getModuleTitle(lesson.module_id)}
                  onClick={() => onLessonSelect(lesson)}
                />
              ))}
            </NetflixCarousel>
          )}
        </div>
      </main>

      {/* Curriculum Sidebar */}
      <NetflixModuleSidebar
        modules={formattedModules}
        courseProgress={courseProgress}
        onLessonSelect={(lessonId) => {
          const lesson = lessons.find(l => l.id === lessonId);
          if (lesson) {
            onLessonSelect(lesson);
            setIsSidebarOpen(false);
          }
        }}
        onClose={() => setIsSidebarOpen(false)}
        isOpen={isSidebarOpen}
      />

      {/* Backdrop for Sidebar */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
        />
      )}
    </div>
  );
}
