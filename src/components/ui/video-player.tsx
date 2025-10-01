
"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Volume1, VolumeX, SkipForward, SkipBack, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Hls from 'hls.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const CustomSlider = ({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) => {
  return (
    <motion.div
      className={cn(
        "relative w-full h-1 bg-white/20 rounded-full cursor-pointer",
        className
      )}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        onChange(Math.min(Math.max(percentage, 0), 100));
      }}
    >
      <motion.div
        className="absolute top-0 left-0 h-full bg-white rounded-full"
        style={{ width: `${value}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </motion.div>
  );
};

interface VideoPlayerProps {
  src?: string;
  hlsUrl?: string; // HLS URL for native playback (preferred)
  embedUrl?: string; // For Bunny.net embeds (fallback)
  startTime?: number; // Tempo inicial para continuar de onde parou
  onProgress?: (progress: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onLoadedMetadata?: () => void;
  crossOrigin?: "" | "anonymous" | "use-credentials";
}

// Melhorar detecção de URLs de embed do Bunny.net
const isBunnyEmbedUrl = (url?: string): boolean => {
  if (!url) return false;
  const bunnyPatterns = [
    'videos.kambafy.com',
    'iframe.mediadelivery.net',
    'mediadelivery.net/embed',
    'bunnycdn.com/embed'
  ];
  return bunnyPatterns.some(pattern => url.includes(pattern));
};

const VideoPlayer = ({ 
  src,
  hlsUrl,
  embedUrl,
  startTime = 0,
  onProgress,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onError, 
  onLoadedMetadata,
  crossOrigin = "anonymous"
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [hlsError, setHlsError] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<Array<{label: string, height: number}>>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Carregar HLS com suporte a hls.js para navegadores que não suportam nativamente
  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return;

    const video = videoRef.current;
    let mounted = true;
    
    // Cleanup função anterior
    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    // Safari e iOS suportam HLS nativamente
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('🎬 Usando HLS nativo (Safari/iOS):', hlsUrl);
      video.src = hlsUrl;
      
      const handleMetadata = () => {
        if (mounted && startTime && startTime > 0) {
          video.currentTime = startTime;
        }
      };
      
      video.addEventListener('loadedmetadata', handleMetadata, { once: true });
      
      return () => {
        mounted = false;
        video.removeEventListener('loadedmetadata', handleMetadata);
      };
    } 
    // Outros navegadores usam hls.js
    else if (Hls.isSupported()) {
      console.log('🎬 Usando hls.js (Chrome/Firefox/Edge):', hlsUrl);
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
      });
      
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (mounted) {
          console.log('✅ HLS manifest carregado');
          
          // Extrair qualidades disponíveis
          const levels = hls.levels.map((level, index) => ({
            label: level.height >= 2160 ? '4K' : 
                   level.height >= 1080 ? '1080p' : 
                   level.height >= 720 ? '720p' : 
                   level.height >= 480 ? '480p' : 
                   level.height >= 360 ? '360p' : 
                   `${level.height}p`,
            height: level.height,
            index
          }));
          
          // Remover duplicatas e ordenar por qualidade
          const uniqueQualities = Array.from(
            new Map(levels.map(item => [item.height, item])).values()
          ).sort((a, b) => b.height - a.height);
          
          setAvailableQualities(uniqueQualities);
          console.log('📺 Qualidades disponíveis:', uniqueQualities);
          
          if (startTime && startTime > 0) {
            video.currentTime = startTime;
          }
        }
      });
      
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && mounted) {
          console.error('❌ Erro fatal HLS, usando iframe fallback');
          setHlsError(true);
          cleanup();
        }
      });
      
      return () => {
        mounted = false;
        cleanup();
      };
    } else {
      console.warn('⚠️ HLS não suportado, usando iframe fallback');
      setHlsError(true);
    }
  }, [hlsUrl]);

  // Auto-play quando o vídeo carregar metadados
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl || hlsError) return;
    
    const attemptAutoplay = async () => {
      try {
        await video.play();
        setIsPlaying(true);
        onPlay?.();
        console.log('✅ Autoplay iniciado');
      } catch (error) {
        console.log('⚠️ Autoplay bloqueado pelo navegador');
      }
    };
    
    video.addEventListener('loadedmetadata', attemptAutoplay, { once: true });
    return () => video.removeEventListener('loadedmetadata', attemptAutoplay);
  }, [hlsUrl, hlsError]);

  // Log detalhado para debugging
  useEffect(() => {
    console.log('🎬 VideoPlayer montado:', {
      hlsUrl,
      embedUrl,
      src,
      hlsError,
      priority: (hlsUrl && !hlsError) ? 'HLS' : embedUrl ? 'iframe' : 'direct',
      timestamp: new Date().toISOString()
    });
  }, [hlsUrl, embedUrl, src, hlsError]);

  const togglePlay = async () => {
    if (!videoRef.current) return;
    
    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Erro ao reproduzir vídeo:', error);
      setIsPlaying(false);
      onError?.();
    }
  };

  // Função para verificar se a URL é válida
  const isValidVideoUrl = (url: string): boolean => {
    if (!url || url.trim() === '' || url.includes('example.com')) {
      return false;
    }
    
    const validExtensions = ['.mp4', '.webm', '.ogg', '.m4v', '.mov'];
    const validDomains = ['mediadelivery.net', 'bunnycdn.com', 'vimeo.com', 'youtube.com', 'cloudflare'];
    
    return validExtensions.some(ext => url.toLowerCase().includes(ext)) ||
           validDomains.some(domain => url.toLowerCase().includes(domain));
  };

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      const newVolume = value / 100;
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress =
        (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(isFinite(progress) ? progress : 0);
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration);
      
      onProgress?.(isFinite(progress) ? progress : 0);
      onTimeUpdate?.(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleSeek = (value: number) => {
    if (videoRef.current && videoRef.current.duration) {
      const time = (value / 100) * videoRef.current.duration;
      if (isFinite(time)) {
        videoRef.current.currentTime = time;
        setProgress(value);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (!isMuted) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const setSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
    }
  };

  const changeQuality = (quality: string) => {
    if (!hlsRef.current) return;
    
    setCurrentQuality(quality);
    
    if (quality === 'auto') {
      hlsRef.current.currentLevel = -1; // Ativa ABR automático
      console.log('📺 Qualidade: Automática (ABR)');
    } else {
      // Encontrar o nível correspondente à qualidade selecionada
      const qualityHeight = parseInt(quality);
      const levelIndex = hlsRef.current.levels.findIndex(level => level.height === qualityHeight);
      
      if (levelIndex !== -1) {
        hlsRef.current.currentLevel = levelIndex;
        console.log(`📺 Qualidade alterada para: ${quality}p`);
      }
    }
    
    setShowQualityMenu(false);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      
      // Definir tempo inicial se fornecido (continuar de onde parou)
      if (startTime > 0 && startTime < videoRef.current.duration) {
        videoRef.current.currentTime = startTime;
        const initialProgress = (startTime / videoRef.current.duration) * 100;
        setProgress(initialProgress);
        setCurrentTime(startTime);
        console.log('🎬 Continuando vídeo do tempo:', Math.round(startTime), 'segundos');
      }
      
      if (onLoadedMetadata) {
        onLoadedMetadata();
      }
    }
  };

  const handleError = () => {
    if (onError) {
      onError();
    }
  };

  // Prioridade: HLS URL (se não tiver erro fatal) > Embed URL (iframe) > Direct src
  // Se houver HLS URL e não houver erro, usar player HTML5 com hls.js
  if (hlsUrl && !hlsError) {
    
    return (
      <motion.div
        className="relative w-full max-w-4xl mx-auto overflow-hidden bg-[#11111198] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          className="w-full aspect-video object-contain bg-black"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
          }}
          onError={handleError}
          onClick={togglePlay}
          crossOrigin={crossOrigin}
          preload="metadata"
          controls={false}
          autoPlay
          playsInline
        >
          <source src={hlsUrl} type="application/x-mpegURL" />
          <source src={hlsUrl} type="application/vnd.apple.mpegurl" />
          Seu navegador não suporta HLS.
        </video>

        <AnimatePresence>
          {showControls && (
            <motion.div
              className="absolute bottom-0 mx-auto max-w-xl left-0 right-0 p-2 sm:p-4 m-1 sm:m-2 bg-[#11111198] backdrop-blur-md rounded-lg"
              initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: 20, opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: "circInOut", type: "spring" }}
            >
              <div className="flex items-center gap-1 sm:gap-2 mb-2">
                <span className="text-white text-xs sm:text-sm">
                  {formatTime(currentTime)}
                </span>
                <CustomSlider
                  value={progress}
                  onChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-white text-xs sm:text-sm">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 sm:gap-4">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      onClick={() => skipTime(-10)}
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-[#111111d1] hover:text-white h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      onClick={togglePlay}
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-[#111111d1] hover:text-white h-8 w-8 sm:h-10 sm:w-10"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      onClick={() => skipTime(10)}
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-[#111111d1] hover:text-white h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </motion.div>
                  
                  <div className="flex items-center gap-x-1">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        onClick={toggleMute}
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-[#111111d1] hover:text-white h-8 w-8 sm:h-10 sm:w-10"
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : volume > 0.5 ? (
                          <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Volume1 className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>
                    </motion.div>

                    <div className="w-16 sm:w-24 hidden sm:block">
                      <CustomSlider
                        value={volume * 100}
                        onChange={handleVolumeChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Seletor de Qualidade */}
                  <Popover open={showQualityMenu} onOpenChange={setShowQualityMenu}>
                    <PopoverTrigger asChild>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-[#111111d1] hover:text-white h-8 w-8 sm:h-10 sm:w-10"
                        >
                          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </motion.div>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-48 p-2 bg-[#111111f0] backdrop-blur-md border-white/10"
                      side="top"
                      align="end"
                    >
                      <div className="space-y-1">
                        <p className="text-xs text-white/70 px-2 py-1">Qualidade</p>
                        <button
                          onClick={() => changeQuality('auto')}
                          className={cn(
                            "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/10 transition-colors",
                            currentQuality === 'auto' ? "text-white bg-white/10" : "text-white/70"
                          )}
                        >
                          Automática
                        </button>
                        {availableQualities.map((quality) => (
                          <button
                            key={quality.height}
                            onClick={() => changeQuality(quality.height.toString())}
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/10 transition-colors",
                              currentQuality === quality.height.toString() 
                                ? "text-white bg-white/10" 
                                : "text-white/70"
                            )}
                          >
                            {quality.label}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Velocidade - oculto em mobile */}
                  <div className="hidden md:flex items-center gap-1">
                    {[0.5, 1, 1.5, 2].map((speed) => (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        key={speed}
                      >
                        <Button
                          onClick={() => setSpeed(speed)}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-white hover:bg-[#111111d1] hover:text-white h-8 px-2 text-xs",
                            playbackSpeed === speed && "bg-[#111111d1]"
                          )}
                        >
                          {speed}x
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
  
  // Se houver embedUrl, usar iframe como fallback
  if (embedUrl) {
    console.log('🎬 Usando iframe (fallback) para embed URL:', embedUrl);
    
    return (
      <motion.div 
        className="relative w-full overflow-hidden bg-black"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
              <p className="text-sm text-gray-400">Carregando vídeo...</p>
            </div>
          </div>
        )}
        
        {iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-center text-white p-8 max-w-md">
              <Play className="h-16 w-16 mx-auto mb-4 text-red-400" />
              <h3 className="text-xl font-semibold mb-2">Problema ao carregar vídeo</h3>
              <p className="text-gray-400 mb-4">
                O vídeo não pôde ser carregado. Isto pode ser devido a problemas de DNS ou bloqueios de rede.
              </p>
              <a 
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Abrir vídeo em nova aba
              </a>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full aspect-video border-0"
          frameBorder="0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          referrerPolicy="no-referrer-when-downgrade"
          title="Player de vídeo"
          loading="lazy"
          onLoad={() => {
            console.log('✅ Iframe carregado com sucesso');
            setIframeLoaded(true);
            setIframeError(false);
          }}
          onError={() => {
            console.error('❌ Erro ao carregar iframe');
            setIframeError(true);
            onError?.();
          }}
        />
      </motion.div>
    );
  }

  // Se não há URL de vídeo válida, mostrar placeholder
  if (!src || !isValidVideoUrl(src)) {
    return (
      <motion.div 
        className="relative w-full max-w-4xl mx-auto overflow-hidden bg-gray-900 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="text-center text-white p-8">
            <Play className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">Vídeo não disponível</h3>
            <p className="text-gray-400">O vídeo desta aula ainda não foi carregado.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative w-full max-w-4xl mx-auto overflow-hidden bg-[#11111198] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full aspect-video object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onError={handleError}
        src={src}
        onClick={togglePlay}
        crossOrigin={crossOrigin}
        preload="metadata"
        autoPlay
        playsInline
      >
        <source src={src} type="video/mp4" />
        <source src={src} type="video/webm" />
        <source src={src} type="video/ogg" />
        Seu navegador não suporta o elemento de vídeo.
      </video>

      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute bottom-0 mx-auto max-w-xl left-0 right-0 p-4 m-2 bg-[#11111198] backdrop-blur-md"
            initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 20, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "circInOut", type: "spring" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white text-sm">
                {formatTime(currentTime)}
              </span>
              <CustomSlider
                value={progress}
                onChange={handleSeek}
                className="flex-1"
              />
              <span className="text-white text-sm">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  onClick={() => skipTime(-10)}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#111111d1] hover:text-white"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  onClick={togglePlay}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#111111d1] hover:text-white"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  onClick={() => skipTime(10)}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#111111d1] hover:text-white"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </motion.div>
              
              <div className="flex items-center gap-x-1">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    onClick={toggleMute}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-[#111111d1] hover:text-white"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : volume > 0.5 ? (
                      <Volume2 className="h-5 w-5" />
                    ) : (
                      <Volume1 className="h-5 w-5" />
                    )}
                  </Button>
                </motion.div>

                <div className="w-24">
                  <CustomSlider
                    value={volume * 100}
                    onChange={handleVolumeChange}
                  />
                </div>
              </div>
            </div>

              <div className="flex items-center gap-2">
                {/* Seletor de Qualidade - só para HLS */}
                {hlsRef.current && availableQualities.length > 0 && (
                  <Popover open={showQualityMenu} onOpenChange={setShowQualityMenu}>
                    <PopoverTrigger asChild>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-[#111111d1] hover:text-white"
                        >
                          <Settings className="h-5 w-5" />
                        </Button>
                      </motion.div>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-48 p-2 bg-[#111111f0] backdrop-blur-md border-white/10"
                      side="top"
                      align="end"
                    >
                      <div className="space-y-1">
                        <p className="text-xs text-white/70 px-2 py-1">Qualidade</p>
                        <button
                          onClick={() => changeQuality('auto')}
                          className={cn(
                            "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/10 transition-colors",
                            currentQuality === 'auto' ? "text-white bg-white/10" : "text-white/70"
                          )}
                        >
                          Automática
                        </button>
                        {availableQualities.map((quality) => (
                          <button
                            key={quality.height}
                            onClick={() => changeQuality(quality.height.toString())}
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/10 transition-colors",
                              currentQuality === quality.height.toString() 
                                ? "text-white bg-white/10" 
                                : "text-white/70"
                            )}
                          >
                            {quality.label}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                
                {[0.5, 1, 1.5, 2].map((speed) => (
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    key={speed}
                  >
                    <Button
                      onClick={() => setSpeed(speed)}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-white hover:bg-[#111111d1] hover:text-white",
                        playbackSpeed === speed && "bg-[#111111d1]"
                      )}
                    >
                      {speed}x
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoPlayer;
