import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { cn } from '@/lib/utils';

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const {
    tasks,
    completedCount,
    totalTasks,
    progressPercentage,
    showChecklist,
    completeTask,
    dismissChecklist,
  } = useOnboardingProgress();
  
  const [isExpanded, setIsExpanded] = useState(true);

  if (!showChecklist || progressPercentage === 100) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-card border-2 border-primary rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Comece Aqui 🚀</h3>
              <p className="text-sm opacity-90">
                {completedCount} de {totalTasks} concluídos
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:opacity-70 transition-opacity"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={dismissChecklist}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <Progress value={progressPercentage} className="h-2 bg-primary-foreground/20" />
        </div>

        {/* Tasks List */}
        {isExpanded && (
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  if (!task.completed && task.route) {
                    navigate(task.route);
                    completeTask(task.id);
                  }
                }}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-all duration-200',
                  task.completed
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/50 border-border hover:border-primary hover:bg-muted'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {task.completed ? (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-border" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{task.icon}</span>
                      <h4 className={cn(
                        'font-medium text-sm',
                        task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                      )}>
                        {task.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
