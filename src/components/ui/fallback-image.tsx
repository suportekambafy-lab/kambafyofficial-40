import { useState } from 'react';
import { User, Package, Image as ImageIcon, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FallbackImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackType?: 'user' | 'product' | 'company' | 'general';
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function FallbackImage({
  src,
  alt = '',
  className = '',
  fallbackType = 'general',
  fallbackText,
  size = 'md'
}: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const getFallbackIcon = () => {
    const iconSize = iconSizes[size];
    
    switch (fallbackType) {
      case 'user':
        return <User className={cn(iconSize, 'text-muted-foreground')} />;
      case 'product':
        return <Package className={cn(iconSize, 'text-muted-foreground')} />;
      case 'company':
        return <Building2 className={cn(iconSize, 'text-muted-foreground')} />;
      default:
        return <ImageIcon className={cn(iconSize, 'text-muted-foreground')} />;
    }
  };

  const getFallbackText = () => {
    if (fallbackText) return fallbackText;
    
    if (alt) {
      const words = alt.split(' ');
      if (words.length >= 2) {
        return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
      }
      return alt.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Se não há src ou houve erro, mostrar fallback
  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-muted border-2 border-dashed border-muted-foreground/20',
          sizeClasses[size],
          className
        )}
        title={alt}
      >
        {fallbackText || alt ? (
          <span className={cn(
            'font-medium text-muted-foreground select-none',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base',
            size === 'xl' && 'text-lg'
          )}>
            {getFallbackText()}
          </span>
        ) : (
          getFallbackIcon()
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg', sizeClasses[size], className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <div className={cn('bg-muted-foreground/20 rounded', iconSizes[size])} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-200',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
}

// Componente específico para avatares de usuário
export function UserAvatar({
  src,
  name,
  className,
  size = 'md'
}: {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <FallbackImage
      src={src}
      alt={name || 'Avatar do usuário'}
      className={cn('rounded-full', className)}
      fallbackType="user"
      fallbackText={name}
      size={size}
    />
  );
}

// Componente específico para imagens de produtos
export function ProductImage({
  src,
  name,
  className,
  size = 'md'
}: {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <FallbackImage
      src={src}
      alt={name || 'Imagem do produto'}
      className={className}
      fallbackType="product"
      fallbackText={name}
      size={size}
    />
  );
}