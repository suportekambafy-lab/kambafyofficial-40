import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TooltipConfig {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useContextualTooltip(featureId: string) {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (user) {
      checkTooltipStatus();
    }
  }, [user, featureId]);

  const checkTooltipStatus = () => {
    try {
      const key = `tooltip_${featureId}_${user?.id}`;
      const shown = localStorage.getItem(key);
      if (!shown) {
        setShouldShow(true);
      }
    } catch (error) {
      console.error('Error checking tooltip status:', error);
    }
  };

  const dismissTooltip = () => {
    try {
      const key = `tooltip_${featureId}_${user?.id}`;
      localStorage.setItem(key, new Date().toISOString());
      setShouldShow(false);
    } catch (error) {
      console.error('Error dismissing tooltip:', error);
    }
  };

  return {
    shouldShow,
    dismissTooltip,
  };
}
