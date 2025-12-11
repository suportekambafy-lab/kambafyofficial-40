import { useState, useMemo, useEffect } from 'react';
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

  // Force dark background on body when this component is mounted
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'hsl(30, 20%, 12%)';
    document.documentElement.style.backgroundColor = 'hsl(30, 20%, 12%)';
    
    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  // Calculate course stats
  const completedLessons = useMemo(() => {
    return Object.values(lessonProgress).filter(p => p.completed).length;
  }, [lessonProgress]);

  const totalLessons = lessons.length;
  const totalModules = modules.length;
  const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Calculate completed modules (all lessons in module completed)
  const completedModules = useMemo(() => {
    return modules.filter(module => {
      const moduleLessons = lessons.filter(l => l.module_id === module.id);
      if (moduleLessons.length === 0) return false;
      return moduleLessons.every(lesson => lessonProgress[lesson.id]?.completed);
    }).length;
  }, [modules, lessons, lessonProgress]);

  // Calculate total watch time in minutes
  const totalWatchTime = useMemo(() => {
    let totalSeconds = 0;
    lessons.forEach(lesson => {
      const progress = lessonProgress[lesson.id];
      if (progress?.video_current_time) {
        totalSeconds += progress.video_current_time;
      } else if (progress?.completed && lesson.duration) {
        totalSeconds += lesson.duration;
      }
    });
    return Math.round(totalSeconds / 60);
  }, [lessons, lessonProgress]);

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

  // Generate thumbnail URL from Bunny CDN hls_url
  const getLessonThumbnail = (lesson: Lesson) => {
    // First try video_data thumbnail
    if (lesson.video_data?.thumbnail) {
      return lesson.video_data.thumbnail as string;
    }
    // Generate from hls_url (Bunny CDN pattern)
    if (lesson.hls_url) {
      // Extract base URL and video ID from hls_url
      // Pattern: https://vz-xxx.b-cdn.net/VIDEO_ID/playlist.m3u8
      const match = lesson.hls_url.match(/^(https:\/\/[^/]+\/[^/]+)/);
      if (match) {
        return `${match[1]}/thumbnail.jpg`;
      }
    }
    return undefined;
  };

  return (
    <div 
      className="min-h-screen relative netflix-member-area"
      data-netflix-member-area="true"
      style={{ 
        background: 'hsl(30 20% 12%)',
        color: 'hsl(40 20% 95%)'
      }}
    >
      {/* Warm ambient background effect */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, hsl(30 30% 25% / 0.4) 0%, transparent 60%)'
        }}
      />
      {/* Header */}
      <NetflixHeader
        logoUrl={memberArea.logo_url}
        userName={user?.name}
        userEmail={user?.email}
        userAvatar={user?.avatar_url}
        memberAreaId={memberArea.id}
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
          totalModules={totalModules}
          completedModules={completedModules}
          totalWatchTime={totalWatchTime}
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
                  thumbnail={getLessonThumbnail(lesson)}
                  duration={lesson.duration}
                  progress={lessonProgress[lesson.id]?.progress_percentage}
                  moduleTitle={getModuleTitle(lesson.module_id)}
                  onClick={() => onLessonSelect(lesson)}
                />
              ))}
            </NetflixCarousel>
          )}

          {/* Todos os Módulos */}
          {modules.length > 0 && (
            <NetflixCarousel 
              title="Todos os Módulos"
              subtitle={`${modules.length} módulos`}
              showSeeAll
            >
              {modules.filter(m => m.cover_image_url).map(module => (
                <NetflixCourseCard
                  key={module.id}
                  id={module.id}
                  title={module.title}
                  thumbnail={module.cover_image_url}
                  tags={[`${(lessonsByModule[module.id] || []).length} aulas`]}
                  isLocked={module.coming_soon || module.is_paid}
                  onClick={() => {
                    const firstLesson = lessonsByModule[module.id]?.[0];
                    if (firstLesson) onLessonSelect(firstLesson);
                  }}
                />
              ))}
            </NetflixCarousel>
          )}

          {/* New Lessons */}
          {newLessons.length > 0 && (
            <NetflixCarousel title="Adicionados Recentemente" showSeeAll>
              {newLessons.map(lesson => (
                <NetflixCourseCard
                  key={lesson.id}
                  id={lesson.id}
                  title={lesson.title}
                  thumbnail={getLessonThumbnail(lesson)}
                  duration={lesson.duration}
                  isCompleted={lessonProgress[lesson.id]?.completed}
                  moduleTitle={getModuleTitle(lesson.module_id)}
                  tags={['Novo']}
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
