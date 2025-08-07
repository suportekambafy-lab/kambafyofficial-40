
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export const LoadingSpinner = ({ 
  size = "md", 
  className,
  text = "Carregando..."
}: LoadingSpinnerProps) => {
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

  return (
    <div 
      className={cn("flex flex-col items-center justify-center gap-4", className)}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className={cn(
        "rounded-lg flex items-center justify-center bg-primary",
        "animate-pulse",
        "[animation-duration:1.5s]",
        sizeClasses[size]
      )}>
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
        <>
          <p className={cn(
            "text-muted-foreground animate-fade-in",
            textSizeClasses[size]
          )} aria-hidden="true">
            {text}
          </p>
          <span className="sr-only">{text}</span>
        </>
      )}
    </div>
  );
};
