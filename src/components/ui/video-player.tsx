"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Volume1, VolumeX, SkipForward, SkipBack, Settings, Maximize, Minimize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Hls from 'hls.js';
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
    <div className={cn("relative w-full group/progress", className)}>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
          [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200
          group-hover/progress:[&::-webkit-slider-thumb]:scale-125
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
        style={{
          background: `linear-gradient(to right, #ffffff 0%, #ffffff ${value}%, rgba(255,255,255,0.3) ${value}%, rgba(255,255,255,0.3) 100%)`,
        }}
      />
    </div>
  );
};

interface VideoPlayerProps {
  src?: string;
  hlsUrl?: string;
  embedUrl?: string;
  startTime?: number;
  onProgress?: (progress: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onLoadedMetadata?: () => void;
  crossOrigin?: "" | "anonymous" | "use-credentials";
}

type VideoSource = 'hls' | 'iframe' | 'direct';

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
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [availableQualities, setAvailableQualities] = useState<Array<{label: string, height: number}>>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideControlsTimeout, setHideControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Detect if video is from Vimeo
  const isVimeoVideo = embedUrl?.includes('player.vimeo.com') || embedUrl?.includes('vimeo.com') || hlsUrl?.includes('vimeo.com');
  
  // Detect if video is from Cloudflare Stream
  const isCloudflareStream = embedUrl?.includes('cloudflarestream.com') || hlsUrl?.includes('cloudflarestream.com');
  
  // Fallback system state
  const [currentSource, setCurrentSource] = useState<VideoSource | null>(null);
  const [failedSources, setFailedSources] = useState<Set<VideoSource>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showDnsHelp, setShowDnsHelp] = useState(false);
  const [isNativeHls, setIsNativeHls] = useState(false);

  // Determine initial source priority
  useEffect(() => {
    if (!currentSource && !failedSources.size) {
      // If Vimeo, always use iframe
      if (isVimeoVideo && embedUrl) {
        console.log('🎬 Detectado vídeo do Vimeo - usando iframe');
        setCurrentSource('iframe');
        return;
      }
      // If Cloudflare Stream, ALWAYS use HLS (nunca iframe)
      if (isCloudflareStream) {
        if (hlsUrl) {
          console.log('🎬 Detectado Cloudflare Stream - usando HLS');
          setCurrentSource('hls');
        } else {
          console.error('❌ Cloudflare Stream sem HLS URL');
          setErrorMessage('Vídeo não disponível');
          setIsLoading(false);
        }
        return;
      }
      // HLS genérico
      if (hlsUrl) {
        console.log('🎬 Tentando HLS como fonte principal');
        setCurrentSource('hls');
        return;
      } 
      // Iframe como fallback (não-Cloudflare)
      if (embedUrl) {
        console.log('🎬 Tentando iframe como fonte principal');
        setCurrentSource('iframe');
        return;
      } 
      // Vídeo direto
      if (src) {
        console.log('🎬 Tentando vídeo direto como fonte principal');
        setCurrentSource('direct');
        return;
      }
    }
  }, [hlsUrl, embedUrl, src, currentSource, failedSources.size, isVimeoVideo, isCloudflareStream]);

  // Handle source failure and automatic fallback
  const handleSourceFailure = (source: VideoSource, error?: string) => {
    console.error(`❌ Fonte ${source} falhou:`, error);
    
    setFailedSources(prev => new Set([...prev, source]));
    setIsLoading(false);
    
    // ⛔ Cloudflare Stream NUNCA deve tentar iframe
    if (isCloudflareStream) {
      console.error('❌ Cloudflare Stream falhou - sem fallback disponível');
      setErrorMessage('Não foi possível carregar o vídeo do Cloudflare Stream.');
      onError?.();
      return;
    }
    
    // Try next available source
    if (source === 'hls' && embedUrl && !failedSources.has('iframe') && !isCloudflareStream) {
      console.log('🔄 Fallback: HLS → iframe');
      setCurrentSource('iframe');
      setErrorMessage(null);
      setIsLoading(true);
      setRetryCount(0);
    } else if (source === 'hls' && src && !failedSources.has('direct')) {
      console.log('🔄 Fallback: HLS → direto');
      setCurrentSource('direct');
      setErrorMessage(null);
      setIsLoading(true);
      setRetryCount(0);
    } else if (source === 'iframe' && hlsUrl && !failedSources.has('hls')) {
      console.log('🔄 Fallback: iframe → HLS');
      setCurrentSource('hls');
      setErrorMessage(null);
      setIsLoading(true);
      setRetryCount(0);
    } else if (source === 'iframe' && src && !failedSources.has('direct')) {
      console.log('🔄 Fallback: iframe → direto');
      setCurrentSource('direct');
      setErrorMessage(null);
      setIsLoading(true);
      setRetryCount(0);
    } else if (source === 'direct' && embedUrl && !failedSources.has('iframe')) {
      console.log('🔄 Fallback: direto → iframe');
      setCurrentSource('iframe');
      setErrorMessage(null);
      setIsLoading(true);
      setRetryCount(0);
    } else {
      // All sources failed
      console.error('❌ Todas as fontes de vídeo falharam');
      setErrorMessage('Não foi possível carregar o vídeo. Verifique sua conexão de internet.');
      onError?.();
    }
  };

  // Retry logic with exponential backoff
  const scheduleRetry = (source: VideoSource, attempt: number) => {
    if (attempt > 3) {
      handleSourceFailure(source, 'Máximo de tentativas excedido');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
    console.log(`🔄 Tentando novamente ${source} em ${delay}ms (tentativa ${attempt + 1}/3)`);
    
    retryTimeoutRef.current = setTimeout(() => {
      setRetryCount(attempt + 1);
      // Force re-render to trigger useEffect
      setCurrentSource(null);
      setTimeout(() => setCurrentSource(source), 100);
    }, delay);
  };

  // HLS loading with error handling
  useEffect(() => {
    if (currentSource !== 'hls' || !hlsUrl || !videoRef.current) return;

    const video = videoRef.current;
    let mounted = true;
    
    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    // Native HLS support (Safari/iOS)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('🎬 Usando HLS nativo (Safari/iOS)');
      setIsNativeHls(true);
      video.src = hlsUrl;
      
      const handleSuccess = () => {
        if (mounted) {
          console.log('✅ HLS nativo carregado');
          setIsLoading(false);
          setErrorMessage(null);
          if (startTime > 0) video.currentTime = startTime;
        }
      };
      
      const handleError = (e: Event) => {
        if (mounted) {
          const videoError = (e.target as HTMLVideoElement)?.error;
          console.error('❌ Erro no HLS nativo:', videoError?.code, videoError?.message);
          
          // Safari-specific: Try iframe fallback immediately if CORS error
          if (videoError?.code === 2) { // MEDIA_ERR_NETWORK
            console.log('🔄 Detectado erro de rede no Safari, tentando iframe...');
          }
          
          handleSourceFailure('hls', 'Erro ao carregar HLS nativo');
        }
      };
      
      video.addEventListener('loadedmetadata', handleSuccess, { once: true });
      video.addEventListener('error', handleError, { once: true });
      
      return () => {
        mounted = false;
        video.removeEventListener('loadedmetadata', handleSuccess);
        video.removeEventListener('error', handleError);
      };
    }
    // hls.js for other browsers
    else if (Hls.isSupported()) {
      console.log('🎬 Usando hls.js');
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 3,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 4,
        // 🎯 Configurações para começar em qualidade alta
        startLevel: -1, // Auto, mas otimizado com abrEwmaDefaultEstimate
        abrEwmaDefaultEstimate: 5000000, // Assumir 5Mbps (boa conexão) no início
        abrBandWidthFactor: 0.95, // Usar 95% da banda estimada
        abrBandWidthUpFactor: 0.7, // Subir qualidade mais rapidamente
        abrMaxWithRealBitrate: true, // Usar bitrate real dos fragmentos
      });
      
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!mounted) return;
        
        console.log('✅ HLS manifest carregado');
        console.log('📊 Níveis disponíveis:', hls.levels.map(l => ({
          height: l.height,
          width: l.width,
          bitrate: l.bitrate,
          name: l.name
        })));
        
        setIsLoading(false);
        setErrorMessage(null);
        
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
        
        const uniqueQualities = Array.from(
          new Map(levels.map(item => [item.height, item])).values()
        ).sort((a, b) => b.height - a.height);
        
        console.log('🎯 Qualidades únicas detectadas:', uniqueQualities);
        setAvailableQualities(uniqueQualities);
        
        // 🚀 Forçar qualidade inicial em 720p ou superior se disponível
        if (uniqueQualities.length > 0) {
          const preferred720p = hls.levels.findIndex(l => l.height >= 720);
          if (preferred720p !== -1) {
            hls.nextLevel = preferred720p;
            console.log(`🎯 Qualidade inicial definida: ${hls.levels[preferred720p].height}p`);
          } else if (hls.levels.length > 0) {
            // Se não tem 720p, começar na melhor disponível
            const bestLevel = hls.levels.reduce((best, current, idx) => 
              current.height > hls.levels[best].height ? idx : best, 0
            );
            hls.nextLevel = bestLevel;
            console.log(`🎯 Qualidade inicial (melhor disponível): ${hls.levels[bestLevel].height}p`);
          }
        } else {
          console.warn('⚠️ Nenhuma qualidade detectada no manifest');
          console.warn('⚠️ Cloudflare Stream pode não expor níveis via HLS');
          // 📋 Adicionar qualidades padrão do Cloudflare como fallback
          const cloudflareDefaults = [
            { label: '1080p', height: 1080, index: 0 },
            { label: '720p', height: 720, index: 1 },
            { label: '480p', height: 480, index: 2 },
            { label: '360p', height: 360, index: 3 }
          ];
          setAvailableQualities(cloudflareDefaults);
          console.log('📋 Usando qualidades padrão do Cloudflare:', cloudflareDefaults);
        }
        
        if (startTime > 0) video.currentTime = startTime;
      });
      
      // 🔍 Evento adicional: detecção quando níveis carregam
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        if (!mounted || availableQualities.length > 0) return;
        
        console.log('🎬 LEVEL_LOADED - Tentando detectar qualidades novamente...');
        console.log('🎬 Total de níveis agora:', hls.levels?.length || 0);
        
        if (hls.levels && hls.levels.length > 0) {
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
          
          const uniqueQualities = Array.from(
            new Map(levels.map(item => [item.height, item])).values()
          ).sort((a, b) => b.height - a.height);
          
          if (uniqueQualities.length > 0) {
            console.log('✅ Qualidades detectadas via LEVEL_LOADED:', uniqueQualities);
            setAvailableQualities(uniqueQualities);
          }
        }
      });
      
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!mounted) return;
        
        console.error('❌ Erro HLS:', data.type, data.details);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🔄 Erro de rede, tentando recuperar...');
              if (retryCount < 3) {
                hls.startLoad();
                scheduleRetry('hls', retryCount);
              } else {
                handleSourceFailure('hls', 'Erro de rede persistente');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Erro de mídia, tentando recuperar...');
              hls.recoverMediaError();
              setTimeout(() => {
                if (video.error && mounted) {
                  handleSourceFailure('hls', 'Erro de mídia não recuperável');
                }
              }, 3000);
              break;
            default:
              handleSourceFailure('hls', `Erro fatal: ${data.details}`);
              break;
          }
        }
      });
      
      return () => {
        mounted = false;
        cleanup();
      };
    } else {
      console.warn('⚠️ HLS não suportado');
      handleSourceFailure('hls', 'HLS não suportado neste navegador');
    }
  }, [hlsUrl, currentSource, retryCount]);

  // Vimeo postMessage API para rastrear progresso - DEVE vir antes de qualquer return
  useEffect(() => {
    if (currentSource !== 'iframe' || !embedUrl || !isVimeoVideo || !iframeRef.current) return;

    const iframe = iframeRef.current;
    let mounted = true;

    const handleMessage = (event: MessageEvent) => {
      // Verificar origem do Vimeo
      if (!event.origin.includes('vimeo.com')) return;

      try {
        const data = JSON.parse(event.data);
        
        if (!mounted) return;

        switch (data.event) {
          case 'ready':
            console.log('🎬 Vimeo player pronto via postMessage');
            setIsLoading(false);
            setErrorMessage(null);
            
            // Solicitar duração
            iframe.contentWindow?.postMessage(JSON.stringify({
              method: 'getDuration'
            }), '*');
            
            // Definir tempo inicial se fornecido
            if (startTime > 0) {
              console.log('⏱️ Definindo tempo inicial:', startTime);
              iframe.contentWindow?.postMessage(JSON.stringify({
                method: 'setCurrentTime',
                value: startTime
              }), '*');
            }
            
            // Habilitar eventos de progresso
            iframe.contentWindow?.postMessage(JSON.stringify({
              method: 'addEventListener',
              value: 'timeupdate'
            }), '*');
            
            iframe.contentWindow?.postMessage(JSON.stringify({
              method: 'addEventListener',
              value: 'play'
            }), '*');
            
            iframe.contentWindow?.postMessage(JSON.stringify({
              method: 'addEventListener',
              value: 'pause'
            }), '*');
            
            iframe.contentWindow?.postMessage(JSON.stringify({
              method: 'addEventListener',
              value: 'ended'
            }), '*');
            break;

          case 'timeupdate':
            if (data.data) {
              const currentTime = data.data.seconds;
              const videoDuration = data.data.duration;
              const progress = (currentTime / videoDuration) * 100;
              
              setCurrentTime(currentTime);
              setDuration(videoDuration);
              setProgress(progress);
              
              onProgress?.(progress);
              onTimeUpdate?.(currentTime, videoDuration);
            }
            break;

          case 'play':
            setIsPlaying(true);
            onPlay?.();
            break;

          case 'pause':
            setIsPlaying(false);
            onPause?.();
            break;

          case 'ended':
            setIsPlaying(false);
            onEnded?.();
            break;
        }

        // Resposta para getDuration
        if (data.method === 'getDuration' && data.value) {
          setDuration(data.value);
        }
      } catch (error) {
        // Ignorar erros de parse de mensagens que não são JSON
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      mounted = false;
      window.removeEventListener('message', handleMessage);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentSource, embedUrl, isVimeoVideo, startTime, onProgress, onTimeUpdate, onPlay, onPause, onEnded]);

  const togglePlay = async () => {
    if (!videoRef.current || currentSource === 'iframe') return;
    
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
    }
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
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
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
      hlsRef.current.currentLevel = -1;
      console.log('📺 Qualidade: Automática');
    } else {
      const qualityHeight = parseInt(quality);
      const levelIndex = hlsRef.current.levels.findIndex(level => level.height === qualityHeight);
      
      if (levelIndex !== -1) {
        hlsRef.current.currentLevel = levelIndex;
        console.log(`📺 Qualidade: ${quality}p`);
      }
    }
    
    setShowQualityMenu(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const resetHideControlsTimeout = () => {
    if (hideControlsTimeout) {
      clearTimeout(hideControlsTimeout);
    }

    if (isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setHideControlsTimeout(timeout);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    resetHideControlsTimeout();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (hideControlsTimeout) {
        clearTimeout(hideControlsTimeout);
      }
    };
  }, [hideControlsTimeout]);

  useEffect(() => {
    if (isPlaying) {
      resetHideControlsTimeout();
    } else {
      setShowControls(true);
      if (hideControlsTimeout) {
        clearTimeout(hideControlsTimeout);
      }
    }
  }, [isPlaying]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      
      if (startTime > 0 && startTime < videoRef.current.duration) {
        videoRef.current.currentTime = startTime;
        const initialProgress = (startTime / videoRef.current.duration) * 100;
        setProgress(initialProgress);
        setCurrentTime(startTime);
      }
      
      setIsLoading(false);
      setErrorMessage(null);
      onLoadedMetadata?.();
    }
  };

  const handleVideoError = () => {
    const error = videoRef.current?.error;
    console.error('❌ Erro no elemento de vídeo:', error?.code, error?.message);
    
    if (currentSource === 'hls' || currentSource === 'direct') {
      handleSourceFailure(currentSource as VideoSource, error?.message);
    }
  };

  // Determinar qual conteúdo renderizar (sem early returns que violam regras de hooks)
  const shouldShowError = errorMessage && failedSources.size >= 2;
  const shouldShowHLS = !shouldShowError && currentSource === 'hls' && hlsUrl;

  // Error display with ISP/DNS help
  if (shouldShowError) {
    return (
      <div className="relative w-full max-w-4xl mx-auto bg-black rounded-lg overflow-hidden">
        <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="text-center text-white p-8 max-w-lg">
            <Play className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold mb-2">Problema ao carregar vídeo</h3>
            <p className="text-gray-400 mb-4">{errorMessage}</p>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-yellow-200 mb-2">
                ⚠️ <strong>Bloqueio de operadora detectado</strong>
              </p>
              <p className="text-xs text-gray-300">
                Algumas operadoras (como Africel) podem bloquear o acesso aos vídeos. 
                Usuários com Unitel normalmente não têm este problema.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowDnsHelp(!showDnsHelp)}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
              >
                {showDnsHelp ? '🔼 Esconder' : '🔧'} Como resolver (Mudar DNS)
              </button>

              {showDnsHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white/5 rounded-lg p-4 text-left space-y-3"
                >
                  <p className="text-sm font-semibold text-blue-300">📱 No seu celular:</p>
                  <ol className="text-xs text-gray-300 space-y-2 list-decimal list-inside">
                    <li>Abra <strong>Configurações</strong> → <strong>Wi-Fi</strong></li>
                    <li>Toque no ⓘ ao lado da sua rede conectada</li>
                    <li>Em <strong>Configurar DNS</strong>, escolha <strong>Manual</strong></li>
                    <li>Adicione: <code className="bg-black/50 px-2 py-1 rounded">8.8.8.8</code> ou <code className="bg-black/50 px-2 py-1 rounded">1.1.1.1</code></li>
                    <li>Salve e reconecte ao Wi-Fi</li>
                    <li>Volte aqui e atualize a página</li>
                  </ol>

                  <p className="text-sm font-semibold text-blue-300 pt-2">💻 No computador:</p>
                  <ol className="text-xs text-gray-300 space-y-2 list-decimal list-inside">
                    <li>Painel de Controle → Rede e Internet → Central de Rede</li>
                    <li>Clique na sua conexão → Propriedades</li>
                    <li>Selecione <strong>Protocolo TCP/IPv4</strong> → Propriedades</li>
                    <li>Marque "Usar os seguintes endereços de servidor DNS"</li>
                    <li>DNS preferencial: <code className="bg-black/50 px-2 py-1 rounded">8.8.8.8</code></li>
                    <li>DNS alternativo: <code className="bg-black/50 px-2 py-1 rounded">1.1.1.1</code></li>
                    <li>Clique OK e atualize a página</li>
                  </ol>
                </motion.div>
              )}

              {embedUrl && (
                <a 
                  href={embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  🔗 Abrir em nova aba
                </a>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Se o problema persistir, entre em contacto com o suporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // HLS Player
  if (shouldShowHLS) {
    return (
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl mx-auto bg-black rounded-card overflow-hidden group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        tabIndex={0}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
              <p className="text-sm">Carregando vídeo{retryCount > 0 ? ` (tentativa ${retryCount + 1}/3)` : ''}...</p>
            </div>
          </div>
        )}

        {/* Botão de Qualidade Sempre Visível (canto superior direito) */}
        <div className="absolute top-4 right-4 z-50">
          <Popover open={showQualityMenu} onOpenChange={setShowQualityMenu}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white border border-white/20 gap-2 h-9 px-3 transition-all hover:scale-105"
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {currentQuality === 'auto' ? 'Auto' : `${currentQuality}p`}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 bg-black/95 backdrop-blur-md border-white/20 z-[200]" side="bottom" align="end">
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Settings className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-white">Qualidade do Vídeo</p>
                </div>
                
                <button
                  onClick={() => changeQuality('auto')}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md transition-all flex items-center justify-between",
                    currentQuality === 'auto' 
                      ? "bg-primary/20 text-primary border border-primary/50" 
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Automática
                  </span>
                  {currentQuality === 'auto' && <span className="text-primary">✓</span>}
                </button>

                {availableQualities.length > 0 ? (
                  <>
                    <div className="pt-1 pb-1">
                      <p className="text-xs text-white/50 px-1">Qualidade Manual</p>
                    </div>
                    {availableQualities.map((quality) => (
                      <button
                        key={quality.height}
                        onClick={() => changeQuality(quality.height.toString())}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded-md transition-all flex items-center justify-between",
                          currentQuality === quality.height.toString()
                            ? "bg-primary/20 text-primary border border-primary/50" 
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span>{quality.label}</span>
                        {currentQuality === quality.height.toString() && <span className="text-primary">✓</span>}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-2 text-xs text-white/40 text-center border border-white/5 rounded-md bg-white/5">
                    🔍 Detectando qualidades disponíveis...
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
          }}
          onError={handleVideoError}
          onClick={togglePlay}
          {...(!isNativeHls && { crossOrigin })}
          preload="metadata"
          controls={false}
          playsInline
        />

        {/* Play/Pause Overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300",
            !isPlaying || showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 pointer-events-auto"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 ml-0.5" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>
        </div>

        {/* Controls Bar */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent",
            "transition-opacity duration-300 pointer-events-none",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="p-4 space-y-3 pointer-events-auto">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 text-white text-sm">
              <span className="min-w-0 text-xs font-mono">
                {formatTime(currentTime)}
              </span>
              <CustomSlider value={progress} onChange={handleSeek} className="flex-1" />
              <span className="min-w-0 text-xs font-mono">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    skipTime(-10);
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    skipTime(10);
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 group/volume">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <div className="w-0 group-hover/volume:w-20 transition-all duration-200 overflow-hidden">
                    <CustomSlider value={volume * 100} onChange={handleVolumeChange} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1">
                  {[0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpeed(speed);
                      }}
                      className={cn(
                        "px-2 py-1 text-xs text-white hover:bg-white/20 rounded-md transition-colors",
                        playbackSpeed === speed && "bg-white/20"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Iframe Player
  if (currentSource === 'iframe' && embedUrl) {
    // Processar URL para remover branding do Vimeo e adicionar parâmetros ao Cloudflare
    const processedEmbedUrl = (() => {
      if (isVimeoVideo) {
        try {
          const url = new URL(embedUrl);
          // Adicionar parâmetros para remover branding
          url.searchParams.set('title', '0');
          url.searchParams.set('byline', '0');
          url.searchParams.set('portrait', '0');
          url.searchParams.set('badge', '0');
          url.searchParams.set('controls', '1');
          url.searchParams.set('transparent', '0');
          // Habilitar API do player via postMessage
          url.searchParams.set('api', '1');
          return url.toString();
        } catch (e) {
          console.warn('Erro ao processar URL do Vimeo:', e);
          return embedUrl;
        }
      }
      
      if (isCloudflareStream) {
        // Cloudflare Stream NUNCA deve usar iframe - sempre HLS
        console.error('⚠️ Tentando usar iframe para Cloudflare Stream - isso não vai funcionar');
        // Forçar fallback para HLS
        if (hlsUrl && !failedSources.has('hls')) {
          console.log('🔄 Fallback automático: iframe → HLS para Cloudflare');
          setCurrentSource('hls');
          setIsLoading(true);
          setErrorMessage(null);
        }
        return embedUrl;
      }
      
      return embedUrl;
    })();
    
    return (
      <motion.div 
        className="relative w-full overflow-hidden bg-black"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
              <p className="text-sm">Carregando vídeo...</p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={processedEmbedUrl}
          className="w-full aspect-video border-0"
          frameBorder="0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          title="Player de vídeo"
          onLoad={() => {
            console.log('✅ Iframe carregado');
            setIsLoading(false);
            setErrorMessage(null);
          }}
          onError={() => {
            console.error('❌ Erro ao carregar iframe');
            handleSourceFailure('iframe', 'Erro ao carregar iframe');
          }}
        />
      </motion.div>
    );
  }

  // Direct Video Player
  if (currentSource === 'direct' && src) {
    return (
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl mx-auto bg-black rounded-card overflow-hidden group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        tabIndex={0}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
              <p className="text-sm">Carregando vídeo...</p>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
          }}
          onError={handleVideoError}
          src={src}
          onClick={togglePlay}
          crossOrigin={crossOrigin}
          preload="metadata"
          autoPlay
          playsInline
        />

        {/* Play/Pause Overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300",
            !isPlaying || showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 pointer-events-auto"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 ml-0.5" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>
        </div>

        {/* Controls Bar */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent",
            "transition-opacity duration-300 pointer-events-none",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="p-4 space-y-3 pointer-events-auto">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 text-white text-sm">
              <span className="min-w-0 text-xs font-mono">
                {formatTime(currentTime)}
              </span>
              <CustomSlider value={progress} onChange={handleSeek} className="flex-1" />
              <span className="min-w-0 text-xs font-mono">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    skipTime(-10);
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    skipTime(10);
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 group/volume">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <div className="w-0 group-hover/volume:w-20 transition-all duration-200 overflow-hidden">
                    <CustomSlider value={volume * 100} onChange={handleVolumeChange} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1">
                  {[0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpeed(speed);
                      }}
                      className={cn(
                        "px-2 py-1 text-xs text-white hover:bg-white/20 rounded-md transition-colors",
                        playbackSpeed === speed && "bg-white/20"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No valid source
  return (
    <div className="relative w-full max-w-4xl mx-auto bg-black rounded-lg overflow-hidden">
      <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center text-white p-8">
          <Play className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Vídeo não disponível</h3>
          <p className="text-gray-400">O vídeo desta aula ainda não foi carregado.</p>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
