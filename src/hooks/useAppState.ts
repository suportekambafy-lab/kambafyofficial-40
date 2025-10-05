import { useState, useEffect } from 'react';
import { App, AppState } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useAppState() {
  const [isActive, setIsActive] = useState(true);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    if (!native) {
      // Fallback para web usando Page Visibility API
      const handleVisibilityChange = () => {
        setIsActive(!document.hidden);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    // Listener nativo
    let cleanup: (() => void) | undefined;

    App.addListener('appStateChange', (state: AppState) => {
      console.log('App state changed. Is active?', state.isActive);
      setIsActive(state.isActive);
    }).then(listener => {
      cleanup = () => listener.remove();
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return {
    isActive,
    isNative
  };
}
