import { memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedContainerProps {
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
}

// Container otimizado com estados de loading, error e empty
export const OptimizedContainer = memo(({ 
  children, 
  className, 
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "Nenhum item encontrado"
}: OptimizedContainerProps) => {
  if (error) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <div className="text-destructive text-sm font-medium mb-2">
          Erro ao carregar dados
        </div>
        <p className="text-muted-foreground text-xs">{error}</p>
      </div>
    );
  }

  if (empty && !loading) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
});

// Wrapper para animações de entrada
export const AnimatedWrapper = memo(({ 
  children, 
  delay = 0,
  className 
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
}) => (
  <div 
    className={cn(
      'animate-in fade-in slide-in-from-bottom-2 duration-300',
      className
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
));

OptimizedContainer.displayName = 'OptimizedContainer';
AnimatedWrapper.displayName = 'AnimatedWrapper';