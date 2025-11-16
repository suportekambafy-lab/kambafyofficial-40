import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingOverlay } from './OnboardingOverlay';
import { OnboardingTooltip } from './OnboardingTooltip';

interface OnboardingTourProps {
  tourId?: string;
}

export function OnboardingTour({ tourId = 'dashboard-tour' }: OnboardingTourProps) {
  const {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    nextStep,
    previousStep,
    skipTour,
  } = useOnboarding(tourId);

  if (!isActive || !currentStepData) return null;

  return (
    <>
      <OnboardingOverlay
        targetSelector={currentStepData.target}
        isActive={isActive}
      />
      <OnboardingTooltip
        step={currentStepData}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrevious={previousStep}
        onSkip={skipTour}
        isActive={isActive}
      />
    </>
  );
}
