import { memo, useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedPaymentLogoProps {
  src: string;
  alt: string;
  className?: string;
}

export const OptimizedPaymentLogo = memo(({ src, alt, className }: OptimizedPaymentLogoProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('relative', className)}>
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted rounded" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          'w-full h-full object-contain transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
});

OptimizedPaymentLogo.displayName = 'OptimizedPaymentLogo';
