import { useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  placeholder?: boolean;
  lazy?: boolean;
}

const OptimizedImage = memo(({
  src,
  alt,
  className,
  width,
  height,
  quality = 75,
  placeholder = true,
  lazy = true
}: OptimizedImageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Otimizar URLs do Unsplash com parâmetros de qualidade e tamanho
  const getOptimizedUrl = (originalSrc: string) => {
    if (originalSrc.includes('images.unsplash.com')) {
      const params = new URLSearchParams();
      if (width) params.append('w', width.toString());
      if (height) params.append('h', height.toString());
      params.append('q', quality.toString());
      params.append('fm', 'webp'); // Usar WebP quando possível
      params.append('fit', 'crop');
      
      return `${originalSrc}?${params.toString()}`;
    }
    return originalSrc;
  };

  const optimizedSrc = getOptimizedUrl(src);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {loading && placeholder && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 bg-gray-300 rounded"></div>
        </div>
      )}
      
      <img
        src={optimizedSrc}
        alt={alt}
        className={cn(
          "transition-all duration-300",
          loading ? "opacity-0" : "opacity-100",
          error ? "hidden" : "block",
          className
        )}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
      
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-xs">Erro ao carregar</div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage };