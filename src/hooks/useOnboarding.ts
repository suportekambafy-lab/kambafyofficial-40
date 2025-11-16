import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DASHBOARD_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'dashboard-header',
    title: 'Bem-vindo ao seu Dashboard! 👋',
    description: 'Aqui você acompanha todas as suas vendas, receitas e métricas em tempo real. Vamos fazer um tour rápido?',
    placement: 'bottom',
  },
  {
    id: 'quick-filters',
    target: 'quick-filters',
    title: 'Filtros Rápidos ⚡',
    description: 'Use estes botões para filtrar suas vendas por período: Hoje, 7 dias, 30 dias ou ver tudo. É instantâneo!',
    placement: 'bottom',
  },
  {
    id: 'customize',
    target: 'widget-customizer',
    title: 'Personalize seu Dashboard 🎨',
    description: 'Clique aqui para escolher quais widgets aparecem no seu dashboard. Você também pode reorganizá-los arrastando!',
    placement: 'bottom',
  },
  {
    id: 'metrics',
    target: 'revenue-card',
    title: 'Suas Métricas 📊',
    description: 'Acompanhe sua receita e número de vendas. Clique no ícone de olho para ocultar/mostrar os valores.',
    placement: 'right',
  },
  {
    id: 'drag-drop',
    target: 'draggable-widget',
    title: 'Reorganize como Quiser 🔄',
    description: 'Passe o mouse sobre qualquer widget e arraste pela alça que aparece no topo para reorganizar!',
    placement: 'left',
  },
  {
    id: 'complete',
    target: 'dashboard-header',
    title: 'Tudo Pronto! 🎉',
    description: 'Você pode revisitar este tour a qualquer momento clicando no ícone de ajuda. Boa sorte com suas vendas!',
    placement: 'bottom',
  },
];

interface OnboardingState {
  completed: boolean;
  currentStep: number;
  skipped: boolean;
  lastShown: string | null;
}

export function useOnboarding(tourId: string = 'dashboard-tour') {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>(DASHBOARD_STEPS);

  useEffect(() => {
    if (user) {
      loadOnboardingState();
    }
  }, [user, tourId]);

  const loadOnboardingState = () => {
    try {
      const stored = localStorage.getItem(`onboarding_${tourId}_${user?.id}`);
      if (stored) {
        const state: OnboardingState = JSON.parse(stored);
        
        // Mostrar tour novamente após 7 dias se foi pulado
        if (state.skipped && state.lastShown) {
          const lastShownDate = new Date(state.lastShown);
          const daysSince = Math.floor((Date.now() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince >= 7) {
            setIsActive(true);
          }
        } else if (!state.completed) {
          setIsActive(true);
        }
      } else {
        // Primeira vez, mostrar tour
        setIsActive(true);
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
      setIsActive(true);
    }
  };

  const saveOnboardingState = (state: Partial<OnboardingState>) => {
    try {
      const currentState = getOnboardingState();
      const newState: OnboardingState = {
        ...currentState,
        ...state,
        lastShown: new Date().toISOString(),
      };
      localStorage.setItem(`onboarding_${tourId}_${user?.id}`, JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  };

  const getOnboardingState = (): OnboardingState => {
    try {
      const stored = localStorage.getItem(`onboarding_${tourId}_${user?.id}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error getting onboarding state:', error);
    }
    return {
      completed: false,
      currentStep: 0,
      skipped: false,
      lastShown: null,
    };
  };

  const startTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    saveOnboardingState({ 
      skipped: true, 
      completed: false,
      currentStep: 0,
    });
    setIsActive(false);
  };

  const completeTour = () => {
    saveOnboardingState({ 
      completed: true,
      skipped: false,
      currentStep: steps.length,
    });
    setIsActive(false);
  };

  const resetTour = () => {
    localStorage.removeItem(`onboarding_${tourId}_${user?.id}`);
    startTour();
  };

  return {
    isActive,
    currentStep,
    steps,
    totalSteps: steps.length,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    resetTour,
    currentStepData: steps[currentStep],
  };
}
