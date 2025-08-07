import React, { memo, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
  loadingClassName?: string;
  errorClassName?: string;
}

// Componente de imagem otimizada com lazy loading
export const LazyImage = memo(({ 
  src, 
  alt, 
  fallback = '/placeholder.svg',
  className,
  loadingClassName,
  errorClassName,
  ...props 
}: LazyImageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
      {loading && (
        <div className={cn(
          'absolute inset-0 bg-muted animate-pulse',
          loadingClassName
        )} />
      )}
      
      {inView && (
        <img
          src={error ? fallback : src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loading ? 'opacity-0' : 'opacity-100',
            error && errorClassName
          )}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
});

// HOC para otimizar componentes pesados
export function withPerformanceOptimization<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  customComparison?: (prevProps: T, nextProps: T) => boolean
) {
  return memo(Component, customComparison);
}

// Hook para debounce otimizado
export function useOptimizedDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para throttle otimizado  
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRunRef = useRef<number>(0);

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRunRef.current >= delay) {
      callback(...args);
      lastRunRef.current = now;
    } else {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
      
      throttleTimerRef.current = setTimeout(() => {
        callback(...args);
        lastRunRef.current = Date.now();
      }, delay - (now - lastRunRef.current));
    }
  }) as T;
}

// Preload de rotas críticas
export const preloadRoute = (routeImport: () => Promise<any>) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      routeImport();
    });
  } else {
    setTimeout(() => {
      routeImport();
    }, 2000);
  }
};

LazyImage.displayName = 'LazyImage';