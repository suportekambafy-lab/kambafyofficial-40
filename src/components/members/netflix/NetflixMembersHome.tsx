import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NetflixHeader } from './NetflixHeader';
import { NetflixHeroBanner } from './NetflixHeroBanner';
import { NetflixCarousel } from './NetflixCarousel';
import { NetflixCourseCard } from './NetflixCourseCard';
import { NetflixModuleSidebar } from './NetflixModuleSidebar';
import { NetflixProgressPanel } from './NetflixProgressPanel';
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
  studentCohortId?: string | null;
  modulesWithAccess?: Set<string>;
  onLessonSelect: (lesson: Lesson) => void;
  onLogout: () => void;
}

export function NetflixMembersHome({
  memberArea,
  modules,
  lessons,
  lessonProgress,
  user,
  studentCohortId,
  modulesWithAccess,
  onLessonSelect,
  onLogout,
}: NetflixMembersHomeProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProgressPanelOpen, setIsProgressPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Force dark background on body when this component is mounted
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';
    
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

  // Filter lessons based on search query
  const filteredLessons = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return lessons.filter(lesson => 
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [lessons, searchQuery]);

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

  // Check if module is locked based on cohort configuration
  const isModuleLocked = (module: Module): boolean => {
    // 1. If student has individual access, module is never locked
    if (modulesWithAccess?.has(module.id)) {
      return false;
    }

    // 2. Check if module is PAID for this specific cohort
    if (module.is_paid) {
      const paidCohortIds = (module as any).paid_cohort_ids as string[] | null;
      
      // If paid_cohort_ids is null or empty = FREE for everyone (not paid)
      if (!paidCohortIds || paidCohortIds.length === 0) {
        // Not paid for anyone, continue to check coming_soon
      } else if (!studentCohortId) {
        // Student has no cohort = FREE (not in any paid cohort)
      } else if (paidCohortIds.includes(studentCohortId)) {
        // Student's cohort IS in paid_cohort_ids → LOCKED (needs to pay)
        return true;
      }
      // Student's cohort is NOT in paidCohortIds → FREE, continue
    }

    // 3. Check coming_soon with cohort logic
    if (!module.coming_soon) {
      return false;
    }

    const comingSoonCohortIds = (module as any).coming_soon_cohort_ids as string[] | null;

    // null = all cohorts (locked for everyone)
    if (comingSoonCohortIds === null) {
      return true;
    }

    // empty array = no cohorts (not locked for anyone)
    if (Array.isArray(comingSoonCohortIds) && comingSoonCohortIds.length === 0) {
      return false;
    }

    // If student has no cohort, not locked
    if (!studentCohortId) {
      return false;
    }

    // Locked only if student's cohort is in the list
    return comingSoonCohortIds.includes(studentCohortId);
  };

  // Format modules with lesson data for sidebar
  const formattedModules = useMemo(() => {
    return modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description,
      cover_image_url: module.cover_image_url,
      isLocked: isModuleLocked(module),
      lessons: (lessonsByModule[module.id] || []).map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        duration: lesson.duration,
        isCompleted: lessonProgress[lesson.id]?.completed,
        progress: lessonProgress[lesson.id]?.progress_percentage,
        isLocked: lesson.is_scheduled && lesson.scheduled_at && new Date(lesson.scheduled_at) > new Date(),
      })),
    }));
  }, [modules, lessonsByModule, lessonProgress, studentCohortId, modulesWithAccess]);

  const handlePlay = () => {
    if (nextLesson) {
      onLessonSelect(nextLesson);
    }
  };

  const getModuleTitle = (moduleId?: string | null) => {
    if (!moduleId) return undefined;
    return modules.find(m => m.id === moduleId)?.title;
  };

  // Generate thumbnail URL - prioritize lesson cover, then video thumbnail
  const getLessonThumbnail = (lesson: Lesson) => {
    // First priority: lesson cover image
    if ((lesson as any).cover_image_url) {
      return (lesson as any).cover_image_url as string;
    }
    // Second: video_data thumbnail
    if (lesson.video_data?.thumbnail) {
      return lesson.video_data.thumbnail as string;
    }
    // Third: Generate from hls_url (Bunny CDN pattern)
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
        background: '#000000',
        color: 'hsl(0 0% 95%)'
      }}
    >
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
          lastWatchedProgress={nextLesson ? lessonProgress[nextLesson.id]?.progress_percentage : 0}
          onPlay={handlePlay}
          onViewCurriculum={() => setIsProgressPanelOpen(true)}
        />

        {/* Carousels */}
        <div className="relative z-10 pt-8 md:pt-12 pb-20 space-y-4">
          {/* Search Results */}
          {filteredLessons && (
            <NetflixCarousel 
              title={`Resultados para "${searchQuery}"`} 
              subtitle={`${filteredLessons.length} aula${filteredLessons.length !== 1 ? 's' : ''} encontrada${filteredLessons.length !== 1 ? 's' : ''}`}
            >
              {filteredLessons.length > 0 ? (
                filteredLessons.map(lesson => (
                  <NetflixCourseCard
                    key={lesson.id}
                    id={lesson.id}
                    title={lesson.title}
                    thumbnail={getLessonThumbnail(lesson)}
                    duration={lesson.duration}
                    isCompleted={lessonProgress[lesson.id]?.completed}
                    progress={lessonProgress[lesson.id]?.progress_percentage}
                    moduleTitle={getModuleTitle(lesson.module_id)}
                    onClick={() => onLessonSelect(lesson)}
                  />
                ))
              ) : (
                <div className="text-stone-400 px-4 py-8">Nenhuma aula encontrada</div>
              )}
            </NetflixCarousel>
          )}

          {/* Continue Watching */}
          {!filteredLessons && continueWatchingLessons.length > 0 && (
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
          {!filteredLessons && (
          <div id="modules-section">
          {modules.length > 0 && (
            <NetflixCarousel 
              title="Todos os Módulos"
              subtitle={`${modules.length} módulos`}
              showSeeAll
            >
              {modules.map(module => (
                <NetflixCourseCard
                  key={module.id}
                  id={module.id}
                  title={module.title}
                  thumbnail={module.cover_image_url}
                  tags={[`${(lessonsByModule[module.id] || []).length} aulas`]}
                  isLocked={isModuleLocked(module)}
                  onClick={() => {
                    const firstLesson = lessonsByModule[module.id]?.[0];
                    if (firstLesson) onLessonSelect(firstLesson);
                  }}
                />
              ))}
            </NetflixCarousel>
          )}
          </div>
          )}

          {/* New Lessons */}
          {!filteredLessons && (
          <div id="community-section">
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

      {/* Progress Panel */}
      <NetflixProgressPanel
        isOpen={isProgressPanelOpen}
        onClose={() => setIsProgressPanelOpen(false)}
        modules={modules}
        lessons={lessons}
        lessonProgress={lessonProgress}
        onLessonSelect={onLessonSelect}
        userName={user?.name}
      />
    </div>
  );
}
