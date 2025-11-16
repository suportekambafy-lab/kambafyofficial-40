import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTourSteps } from './useTourSteps';

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
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  useEffect(() => {
    const tourSteps = getTourSteps(tourId);
    setSteps(tourSteps);
  }, [tourId]);

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
