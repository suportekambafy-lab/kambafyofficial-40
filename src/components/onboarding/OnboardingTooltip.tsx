import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingStep } from '@/hooks/useOnboarding';

interface OnboardingTooltipProps {
  step: OnboardingStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isActive: boolean;
}

export function OnboardingTooltip({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  isActive,
}: OnboardingTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState(step.placement || 'bottom');

  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const target = document.querySelector(`[data-onboarding="${step.target}"]`);
      if (!target) return;

      const targetRect = target.getBoundingClientRect();
      const tooltipWidth = 360;
      const tooltipHeight = 200;
      const offset = 20;

      let top = 0;
      let left = 0;
      let finalPlacement = step.placement || 'bottom';

      // Calcular posição baseada no placement
      switch (step.placement) {
        case 'top':
          top = targetRect.top - tooltipHeight - offset;
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
          if (top < 10) {
            finalPlacement = 'bottom';
            top = targetRect.bottom + offset;
          }
          break;
        case 'bottom':
          top = targetRect.bottom + offset;
          left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
          if (top + tooltipHeight > window.innerHeight - 10) {
            finalPlacement = 'top';
            top = targetRect.top - tooltipHeight - offset;
          }
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
          left = targetRect.left - tooltipWidth - offset;
          if (left < 10) {
            finalPlacement = 'right';
            left = targetRect.right + offset;
          }
          break;
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
          left = targetRect.right + offset;
          if (left + tooltipWidth > window.innerWidth - 10) {
            finalPlacement = 'left';
            left = targetRect.left - tooltipWidth - offset;
          }
          break;
      }

      // Ajustar para manter dentro da tela
      left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
      top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));

      setPosition({ top, left });
      setPlacement(finalPlacement);
    };

    updatePosition();

    // Scroll suave até o elemento
    const target = document.querySelector(`[data-onboarding="${step.target}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [step, isActive]);

  if (!isActive) return null;

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div
      className="fixed z-[10000] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '360px',
      }}
    >
      <div className="bg-card border-2 border-primary rounded-lg shadow-2xl p-5 relative">
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress indicator */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-300',
                i <= currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              Pular Tour
            </Button>
            <Button
              size="sm"
              onClick={step.action?.onClick || onNext}
            >
              {step.action?.label || (isLastStep ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ))}
            </Button>
          </div>
        </div>

        {/* Step counter */}
        <div className="text-xs text-muted-foreground text-center mt-3">
          Passo {currentStep + 1} de {totalSteps}
        </div>

        {/* Arrow indicator */}
        <div
          className={cn(
            'absolute w-0 h-0 border-8',
            placement === 'top' && 'border-t-primary border-l-transparent border-r-transparent border-b-0 -bottom-2 left-1/2 -translate-x-1/2',
            placement === 'bottom' && 'border-b-primary border-l-transparent border-r-transparent border-t-0 -top-2 left-1/2 -translate-x-1/2',
            placement === 'left' && 'border-l-primary border-t-transparent border-b-transparent border-r-0 -right-2 top-1/2 -translate-y-1/2',
            placement === 'right' && 'border-r-primary border-t-transparent border-b-transparent border-l-0 -left-2 top-1/2 -translate-y-1/2'
          )}
        />
      </div>
    </div>
  );
}
