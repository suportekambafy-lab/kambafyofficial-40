import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: string;
  route?: string;
}

const DEFAULT_TASKS: OnboardingTask[] = [
  {
    id: 'view-dashboard',
    title: 'Explore o Dashboard',
    description: 'Veja suas métricas e vendas em tempo real',
    completed: false,
    icon: '📊',
    route: '/painel',
  },
  {
    id: 'create-product',
    title: 'Crie seu Primeiro Produto',
    description: 'Adicione um produto para começar a vender',
    completed: false,
    icon: '📦',
    route: '/painel/produtos',
  },
  {
    id: 'customize-dashboard',
    title: 'Personalize o Dashboard',
    description: 'Organize os widgets do seu jeito',
    completed: false,
    icon: '🎨',
  },
  {
    id: 'check-sales',
    title: 'Acompanhe suas Vendas',
    description: 'Veja o histórico de todas as vendas',
    completed: false,
    icon: '💰',
    route: '/painel/vendas',
  },
  {
    id: 'setup-financial',
    title: 'Configure Financeiro',
    description: 'Configure sua conta bancária para saques',
    completed: false,
    icon: '🏦',
    route: '/painel/financeiro',
  },
];

export function useOnboardingProgress() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<OnboardingTask[]>(DEFAULT_TASKS);
  const [completedCount, setCompletedCount] = useState(0);
  const [showChecklist, setShowChecklist] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgress();
    }
  }, [user]);

  useEffect(() => {
    const completed = tasks.filter(t => t.completed).length;
    setCompletedCount(completed);
  }, [tasks]);

  const loadProgress = () => {
    try {
      const stored = localStorage.getItem(`onboarding_progress_${user?.id}`);
      if (stored) {
        const progress = JSON.parse(stored);
        const updatedTasks = DEFAULT_TASKS.map(task => ({
          ...task,
          completed: progress[task.id] || false,
        }));
        setTasks(updatedTasks);
        
        // Hide checklist if all tasks completed
        const allCompleted = updatedTasks.every(t => t.completed);
        if (allCompleted) {
          const dismissed = localStorage.getItem(`onboarding_checklist_dismissed_${user?.id}`);
          setShowChecklist(!dismissed);
        }
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
    }
  };

  const completeTask = (taskId: string) => {
    try {
      const stored = localStorage.getItem(`onboarding_progress_${user?.id}`);
      const progress = stored ? JSON.parse(stored) : {};
      
      progress[taskId] = true;
      localStorage.setItem(`onboarding_progress_${user?.id}`, JSON.stringify(progress));
      
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, completed: true } : task
      ));
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const dismissChecklist = () => {
    try {
      localStorage.setItem(`onboarding_checklist_dismissed_${user?.id}`, 'true');
      setShowChecklist(false);
    } catch (error) {
      console.error('Error dismissing checklist:', error);
    }
  };

  const resetProgress = () => {
    try {
      localStorage.removeItem(`onboarding_progress_${user?.id}`);
      localStorage.removeItem(`onboarding_checklist_dismissed_${user?.id}`);
      setTasks(DEFAULT_TASKS);
      setShowChecklist(true);
    } catch (error) {
      console.error('Error resetting progress:', error);
    }
  };

  const progressPercentage = Math.round((completedCount / tasks.length) * 100);

  return {
    tasks,
    completedCount,
    totalTasks: tasks.length,
    progressPercentage,
    showChecklist,
    completeTask,
    dismissChecklist,
    resetProgress,
  };
}
