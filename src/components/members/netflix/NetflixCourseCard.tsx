import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, CheckCircle2, Lock, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface NetflixCourseCardProps {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  totalLessons?: number;
  completedLessons?: number;
  progress?: number;
  isCompleted?: boolean;
  isLocked?: boolean;
  tags?: string[];
  moduleTitle?: string;
  onClick?: () => void;
  variant?: 'default' | 'featured' | 'compact';
}

export function NetflixCourseCard({
  id,
  title,
  thumbnail,
  duration,
  totalLessons,
  completedLessons,
  progress = 0,
  isCompleted = false,
  isLocked = false,
  tags = [],
  moduleTitle,
  onClick,
  variant = 'default',
}: NetflixCourseCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  const cardSizes = {
    default: 'w-[240px] md:w-[280px]',
    featured: 'w-[300px] md:w-[360px]',
    compact: 'w-[180px] md:w-[220px]',
  };

  return (
    <motion.div
      className={cn(
        'relative flex-shrink-0 rounded-3xl overflow-hidden cursor-pointer group',
        cardSizes[variant],
        isLocked && 'opacity-60'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={!isLocked ? onClick : undefined}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Card Container with aspect ratio */}
      <div className="relative aspect-[5/4]">
        {/* Thumbnail */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-800/30 to-stone-800">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/40 to-stone-800">
              <BookOpen className="w-12 h-12 text-white/20" />
            </div>
          )}
        </div>

        {/* Frosted glass overlay at bottom */}
        <div 
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.7) 100%)'
          }}
        />

        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-sm">
            <Lock className="w-8 h-8 text-white/70" />
          </div>
        )}

        {/* Completed Badge */}
        {isCompleted && !isLocked && (
          <div className="absolute top-3 right-3 z-10">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Content - Bottom aligned */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          {/* Tags Row */}
          {tags.length > 0 && (
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {tags.slice(0, 2).map((tag, i) => (
                <Badge 
                  key={i}
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 bg-white/20 backdrop-blur-sm border-0 text-white/90 rounded-md font-medium"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Title Row with Play button */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-base font-bold text-white line-clamp-2 leading-tight">
                {title}
              </h3>
            </div>
            
            {/* Play Button - Green circle like Netflix reference */}
            {!isLocked && (
              <motion.button
                className="flex-shrink-0 w-10 h-10 rounded-full bg-netflix-green flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-4 h-4 text-black fill-black ml-0.5" />
              </motion.button>
            )}
          </div>

          {/* Progress Bar */}
          {progress > 0 && !isCompleted && (
            <div className="mt-2">
              <Progress 
                value={progress} 
                className="h-1 bg-white/20"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
