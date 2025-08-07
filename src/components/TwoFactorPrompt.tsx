
import React from 'react';
import { use2FAPrompt } from '@/hooks/use2FAPrompt';
import TwoFactorSetupModal from './TwoFactorSetupModal';

const TwoFactorPrompt: React.FC = () => {
  const { showPrompt, isFirstTime, dismissPrompt } = use2FAPrompt();

  return (
    <TwoFactorSetupModal
      open={showPrompt}
      onClose={dismissPrompt}
      onComplete={dismissPrompt}
      isFirstTime={isFirstTime}
    />
  );
};

export default TwoFactorPrompt;
