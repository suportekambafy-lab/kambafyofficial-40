import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import professionalManImage from '@/assets/professional-man.jpg';

interface OptimizedProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const OptimizedProductImage = memo(({ src, alt, className }: OptimizedProductImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const getOptimizedImageUrl = (url: string): string => {
    if (!url || hasError) return professionalManImage;
    if (url.startsWith('data:')) return url;
    if (url.includes('supabase') || url.startsWith('http')) return url;
    return `https://images.unsplash.com/${url}`;
  };

  const imageUrl = getOptimizedImageUrl(src);

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {/* Placeholder com blur enquanto carrega */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/80 to-muted" />
      )}
      
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        // Adicionar srcset para imagens responsivas se for Unsplash
        {...(imageUrl.includes('unsplash') && {
          srcSet: `
            ${imageUrl}?w=400&q=80 400w,
            ${imageUrl}?w=800&q=80 800w,
            ${imageUrl}?w=1200&q=80 1200w
          `,
          sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
        })}
      />
    </div>
  );
});

OptimizedProductImage.displayName = 'OptimizedProductImage';
