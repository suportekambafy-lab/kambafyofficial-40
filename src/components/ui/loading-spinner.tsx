
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
        "w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
      )}>
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
