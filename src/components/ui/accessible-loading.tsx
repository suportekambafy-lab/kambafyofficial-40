import React from 'react';
import { cn } from "@/lib/utils";

interface AccessibleLoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
  loadingId?: string;
  ariaLabel?: string;
}

export const AccessibleLoadingSpinner = ({ 
  size = "md", 
  className,
  text = "Carregando...",
  loadingId,
  ariaLabel
}: AccessibleLoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16", 
    lg: "w-24 h-24"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const iconSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl"
  };

  const id = loadingId || `loading-spinner-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div 
      className={cn("flex flex-col items-center justify-center gap-4", className)}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel || text}
      aria-describedby={text ? `${id}-text` : undefined}
    >
      <div 
        className={cn(
          "rounded-lg flex items-center justify-center bg-primary",
          "animate-pulse",
          "[animation-duration:1.5s]",
          sizeClasses[size]
        )}
        aria-hidden="true"
      >
        <span className={cn(
          "font-bold text-primary-foreground",
          "animate-bounce",
          "[animation-duration:1s]",
          iconSizeClasses[size]
        )}>
          K
        </span>
      </div>
      {text && (
        <p 
          id={`${id}-text`}
          className={cn(
            "text-muted-foreground animate-fade-in",
            textSizeClasses[size]
          )}
          aria-hidden="true"
        >
          {text}
        </p>
      )}
      <span className="sr-only">{text}</span>
    </div>
  );
};

// Componente de Loading State com contexto
interface LoadingStateProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
  ariaLabel?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  children,
  fallback,
  minHeight = "min-h-48",
  ariaLabel = "Carregando conteúdo"
}) => {
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center", minHeight)}>
        {fallback || <AccessibleLoadingSpinner ariaLabel={ariaLabel} />}
      </div>
    );
  }

  return <>{children}</>;
};