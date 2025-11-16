import { useEffect, useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContextualTooltipProps {
  message: string;
  targetSelector: string;
  onDismiss: () => void;
  show: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ContextualTooltip({
  message,
  targetSelector,
  onDismiss,
  show,
  action,
}: ContextualTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!show) return;

    const updatePosition = () => {
      const target = document.querySelector(`[data-tooltip="${targetSelector}"]`);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const tooltipWidth = 280;
      
      let top = rect.bottom + 12;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // Ajustar para manter na tela
      left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
      
      if (top + 120 > window.innerHeight) {
        top = rect.top - 120 - 12;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [targetSelector, show]);

  if (!show) return null;

  return (
    <div
      className="fixed z-[9999] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '280px',
      }}
    >
      <div className="bg-primary text-primary-foreground rounded-lg shadow-xl p-4 relative">
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 hover:opacity-70 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>

        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed mb-3">{message}</p>
            
            {action && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  action.onClick();
                  onDismiss();
                }}
                className="w-full"
              >
                {action.label}
              </Button>
            )}
            
            {!action && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onDismiss}
                className="w-full"
              >
                Entendi!
              </Button>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-primary" />
      </div>
    </div>
  );
}
