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
    default: 'w-[260px] aspect-video',
    featured: 'w-[320px] aspect-video',
    compact: 'w-[180px] aspect-video',
  };

  return (
    <motion.div
      className={cn(
        'relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer group',
        cardSizes[variant],
        isLocked && 'opacity-60'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={!isLocked ? onClick : undefined}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Thumbnail */}
      <div className="absolute inset-0 bg-[hsl(var(--netflix-card))]">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--netflix-card))] to-[hsl(var(--netflix-surface))]">
            <BookOpen className="w-12 h-12 text-white/30" />
          </div>
        )}
      </div>

      {/* Gradient Overlay */}
      <div 
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          isHovered ? 'opacity-100' : 'opacity-70'
        )}
        style={{
          background: 'linear-gradient(180deg, transparent 30%, rgba(0, 0, 0, 0.9) 100%)'
        }}
      />

      {/* Lock Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
          <Lock className="w-8 h-8 text-white/70" />
        </div>
      )}

      {/* Duration Badge */}
      {duration && !isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <Badge 
            variant="secondary" 
            className="bg-black/70 text-white/90 text-xs font-medium backdrop-blur-sm border-0"
          >
            {formatDuration(duration)}
          </Badge>
        </div>
      )}

      {/* Completed Badge */}
      {isCompleted && !isLocked && (
        <div className="absolute top-2 left-2 z-10">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {tags.slice(0, 2).map((tag, i) => (
              <Badge 
                key={i}
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 bg-white/10 border-white/20 text-white/80"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Module Title */}
        {moduleTitle && (
          <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">
            {moduleTitle}
          </p>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
          {title}
        </h3>

        {/* Progress Bar */}
        {progress > 0 && !isCompleted && (
          <div className="mt-2">
            <Progress 
              value={progress} 
              className="h-1 bg-white/20"
            />
          </div>
        )}

        {/* Lessons Count */}
        {totalLessons !== undefined && (
          <p className="text-[10px] text-white/50 mt-1.5">
            {completedLessons || 0} de {totalLessons} aulas
          </p>
        )}
      </div>

      {/* Play Button on Hover */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered && !isLocked ? 1 : 0 }}
      >
        <motion.button
          className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Play className="w-6 h-6 text-black fill-black ml-0.5" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
