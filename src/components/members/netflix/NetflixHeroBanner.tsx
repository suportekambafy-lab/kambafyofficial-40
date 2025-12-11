import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Volume2, VolumeX, Clock, Star, BookOpen, Users2 } from 'lucide-react';
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
  
  // Only show video if there's actually a video URL
  const hasVideoUrl = Boolean(memberArea.hero_video_url || featuredLesson?.video_url);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const hasProgress = lastWatchedProgress > 0 || completedLessons > 0;

  useEffect(() => {
    // Only start video timer if there's actually a video URL
    if (!hasVideoUrl) return;
    
    const timer = setTimeout(() => {
      setShowVideo(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [hasVideoUrl]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  return (
    <div className="relative w-full">
      {/* Main Hero Container with rounded corners */}
      <div className="relative mx-4 md:mx-12 lg:mx-16 mt-20 md:mt-28 rounded-3xl overflow-hidden aspect-square md:aspect-video lg:aspect-video" style={{ maxHeight: '75vh' }}>
        {/* Background Image - Always visible */}
        <div className="absolute inset-0">
          <motion.div
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 8, ease: 'easeOut' }}
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
                className="w-full h-full bg-gradient-to-br from-amber-900/50 via-stone-800 to-stone-900"
              />
            )}
          </motion.div>
        </div>

        {/* Video Overlay - Only if video exists and is ready */}
        {hasVideoUrl && showVideo && (
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              className="w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: isVideoLoaded ? 1 : 0 }}
              src={memberArea.hero_video_url || featuredLesson?.video_url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
            />
          </div>
        )}

        {/* Gradient Overlays - More cinematic */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.4) 60%, rgba(0, 0, 0, 0.85) 100%)'
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, transparent 40%, transparent 100%)'
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 lg:p-12">
          <div className="max-w-2xl space-y-4">
            {/* Course Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {memberArea.logo_url ? (
                <img src={memberArea.logo_url} alt={memberArea.name} className="h-16 max-w-[280px] object-contain" />
              ) : (
                <span className="text-white/80 text-sm font-medium tracking-[0.2em] uppercase">{memberArea.name}</span>
              )}
            </motion.div>

            {/* Title - Large stylized */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[0.9] uppercase"
              style={{ 
                textShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
                fontFamily: 'Inter, SF Pro, sans-serif',
                letterSpacing: '-0.02em'
              }}
            >
              {memberArea.hero_title || memberArea.name}
            </motion.h1>

            {/* Meta Info - Year, Rating, Modules, Duration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-3 text-sm text-white/90"
            >
              <span className="font-medium">2024</span>
              <Badge 
                variant="outline" 
                className="border-white/40 text-white/90 text-xs px-2 py-0.5 rounded"
              >
                PREMIUM
              </Badge>
              <span>{totalLessons} Módulos</span>
              {featuredLesson?.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
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
                className="text-sm md:text-base text-white/70 max-w-lg line-clamp-3 leading-relaxed"
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
                className="w-full max-w-sm"
              >
                <Progress 
                  value={progressPercentage} 
                  className="h-1 bg-white/20"
                />
                <p className="text-xs text-white/50 mt-1.5">
                  {progressPercentage}% concluído
                </p>
              </motion.div>
            )}

            {/* Action Buttons - Netflix Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              {/* Play Button - White filled */}
              <Button
                onClick={onPlay}
                size="lg"
                className="bg-white hover:bg-white/90 text-black font-bold px-6 md:px-8 h-12 rounded-lg gap-2 transition-all hover:scale-105 shadow-xl"
              >
                <Play className="w-5 h-5 fill-black" />
                Play
              </Button>

              {/* Watch Together / Curriculum Button - Accent colored */}
              <Button
                onClick={onViewCurriculum}
                size="lg"
                className="bg-netflix-red hover:bg-netflix-red/90 text-white font-bold px-6 md:px-8 h-12 rounded-lg gap-2 transition-all"
              >
                <Users2 className="w-5 h-5" />
                Ver Currículo
              </Button>
            </motion.div>
          </div>

          {/* Mute Button (if video) */}
          {hasVideoUrl && showVideo && isVideoLoaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-6 md:bottom-10 right-6 md:right-10"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
