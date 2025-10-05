import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function useHaptics() {
  const isNative = Capacitor.isNativePlatform();

  const triggerHaptic = async (type: HapticType = 'medium') => {
    if (!isNative) {
      // Fallback para web usando Vibration API
      if ('vibrate' in navigator) {
        const patterns = {
          light: 10,
          medium: 20,
          heavy: 50,
          success: [10, 50, 10],
          warning: [30, 50],
          error: [50, 100, 50]
        };
        navigator.vibrate(patterns[type]);
      }
      return;
    }

    try {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'success':
          await Haptics.notification({ type: 'success' as any });
          break;
        case 'warning':
          await Haptics.notification({ type: 'warning' as any });
          break;
        case 'error':
          await Haptics.notification({ type: 'error' as any });
          break;
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  };

  const triggerSelection = async () => {
    if (!isNative) return;
    
    try {
      await Haptics.selectionStart();
      setTimeout(() => Haptics.selectionEnd(), 100);
    } catch (error) {
      console.warn('Selection haptic not available:', error);
    }
  };

  return {
    triggerHaptic,
    triggerSelection,
    isNative
  };
}
