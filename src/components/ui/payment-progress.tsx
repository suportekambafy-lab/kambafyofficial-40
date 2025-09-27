import React from 'react';
import { CheckCircle, Clock, CreditCard, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PaymentProgressProps {
  stage: 'validating' | 'processing' | 'redirecting' | 'complete';
  progress: number;
  className?: string;
}

const stages = [
  { id: 'validating', label: 'Validando informações', icon: Clock },
  { id: 'processing', label: 'Processando pagamento', icon: CreditCard },
  { id: 'redirecting', label: 'Redirecionando', icon: ArrowRight },
  { id: 'complete', label: 'Concluído', icon: CheckCircle }
];

export const PaymentProgress: React.FC<PaymentProgressProps> = ({
  stage,
  progress,
  className
}) => {
  const currentStageIndex = stages.findIndex(s => s.id === stage);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Processando pagamento...</span>
        <span>{Math.round(progress)}%</span>
      </div>
      
      <Progress 
        value={progress} 
        className="h-2"
      />
      
      <div className="space-y-2">
        {stages.map((stageItem, index) => {
          const Icon = stageItem.icon;
          const isActive = index === currentStageIndex;
          const isComplete = index < currentStageIndex;
          
          return (
            <div key={stageItem.id} className={cn(
              "flex items-center gap-3 text-sm transition-all duration-300",
              isActive && "text-primary font-medium",
              isComplete && "text-green-500",
              !isActive && !isComplete && "text-muted-foreground opacity-50"
            )}>
              <Icon className={cn(
                "h-4 w-4 transition-all duration-300",
                isActive && "animate-pulse",
                isComplete && "text-green-500"
              )} />
              <span>{stageItem.label}</span>
              {isActive && (
                <div className="flex space-x-1 ml-auto">
                  <div className="h-1 w-1 bg-primary rounded-full animate-pulse"></div>
                  <div className="h-1 w-1 bg-primary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="h-1 w-1 bg-primary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
              )}
              {isComplete && (
                <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};