import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Plus, Volume2, VolumeX, Clock, Users, Star, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface NetflixHeroBannerProps {
  memberArea: {
    id: string;
    name: string;
    description?: string;
    hero_image_url?: string;
    hero_video_url?: string;
    hero_title?: string;
    hero_description?: string;
    logo_url?: string;
    primary_color?: string;
  };
  featuredLesson?: {
    id: string;
    title: string;
    description?: string;
    video_url?: string;
    duration?: number;
    module_title?: string;
  };
  totalLessons: number;
  completedLessons: number;
  lastWatchedProgress?: number;
  onPlay: () => void;
  onViewCurriculum: () => void;
}

export function NetflixHeroBanner({
  memberArea,
  featuredLesson,
  totalLessons,
  completedLessons,
  lastWatchedProgress = 0,
  onPlay,
  onViewCurriculum,
}: NetflixHeroBannerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const hasProgress = lastWatchedProgress > 0 || completedLessons > 0;

  // Auto-play video preview after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (memberArea.hero_video_url || featuredLesson?.video_url) {
        setShowVideo(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [memberArea.hero_video_url, featuredLesson?.video_url]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  return (
    <div className="relative w-full h-[70vh] md:h-[80vh] min-h-[500px] overflow-hidden">
      {/* Background Video/Image */}
      <div className="absolute inset-0">
        <AnimatePresence>
          {showVideo && (memberArea.hero_video_url || featuredLesson?.video_url) ? (
            <motion.video
              ref={videoRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: isVideoLoaded ? 1 : 0 }}
              exit={{ opacity: 0 }}
              className="w-full h-full object-cover"
              src={memberArea.hero_video_url || featuredLesson?.video_url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
            />
          ) : (
            <motion.div
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, ease: 'easeOut' }}
              className="w-full h-full"
            >
              {memberArea.hero_image_url ? (
                <img
                  src={memberArea.hero_image_url}
                  alt={memberArea.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--netflix-gradient-start)) 0%, hsl(var(--netflix-surface)) 50%, hsl(var(--netflix-gradient-end)) 100%)`
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gradient Overlays */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(15, 15, 20, 0.3) 40%, rgba(15, 15, 20, 0.85) 85%, hsl(var(--netflix-bg)) 100%)'
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, rgba(15, 15, 20, 0.8) 0%, transparent 50%, transparent 100%)'
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end pb-16 md:pb-24 px-6 md:px-12 lg:px-16">
        <div className="max-w-3xl space-y-4 md:space-y-6">
          {/* Course Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            {memberArea.logo_url && (
              <img 
                src={memberArea.logo_url} 
                alt="" 
                className="h-8 md:h-10 w-auto object-contain"
              />
            )}
            <Badge 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white/90 backdrop-blur-sm px-3 py-1"
            >
              <BookOpen className="w-3 h-3 mr-1.5" />
              CURSO
            </Badge>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-none"
            style={{ 
              textShadow: '2px 4px 20px rgba(0, 0, 0, 0.5)',
              fontFamily: 'Inter, SF Pro, sans-serif'
            }}
          >
            {memberArea.hero_title || memberArea.name}
          </motion.h1>

          {/* Meta Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base text-white/80"
          >
            {progressPercentage > 0 && (
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <Star className="w-4 h-4 fill-primary" />
                {progressPercentage}% Completo
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              {totalLessons} Aulas
            </span>
            {featuredLesson?.duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatDuration(featuredLesson.duration)}
              </span>
            )}
          </motion.div>

          {/* Description */}
          {(memberArea.hero_description || memberArea.description) && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-base md:text-lg text-white/70 max-w-2xl line-clamp-3"
            >
              {memberArea.hero_description || memberArea.description}
            </motion.p>
          )}

          {/* Progress Bar (if in progress) */}
          {hasProgress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="w-full max-w-md"
            >
              <Progress 
                value={progressPercentage} 
                className="h-1.5 bg-white/20"
              />
              <p className="text-xs text-white/50 mt-1.5">
                {completedLessons} de {totalLessons} aulas concluídas
              </p>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center gap-3 pt-2"
          >
            <Button
              onClick={onPlay}
              size="lg"
              className="bg-white hover:bg-white/90 text-black font-semibold px-6 md:px-8 h-11 md:h-12 rounded-md gap-2 transition-all hover:scale-105"
            >
              <Play className="w-5 h-5 md:w-6 md:h-6 fill-black" />
              {hasProgress ? 'Continuar' : 'Começar'}
            </Button>

            <Button
              onClick={onViewCurriculum}
              size="lg"
              variant="outline"
              className="bg-white/20 hover:bg-white/30 text-white border-transparent font-semibold px-6 md:px-8 h-11 md:h-12 rounded-md gap-2 backdrop-blur-sm transition-all"
            >
              <Info className="w-5 h-5 md:w-6 md:h-6" />
              Ver Currículo
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-11 h-11 md:w-12 md:h-12 rounded-full border border-white/40 text-white hover:bg-white/10"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </motion.div>
        </div>

        {/* Mute Button (if video) */}
        {showVideo && isVideoLoaded && (memberArea.hero_video_url || featuredLesson?.video_url) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-16 md:bottom-24 right-6 md:right-12"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-full border border-white/40 text-white hover:bg-white/10"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
