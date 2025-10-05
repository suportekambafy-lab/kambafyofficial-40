import { useState, useEffect } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    if (!native) {
      // Fallback para web usando navigator.onLine
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      setIsOnline(navigator.onLine);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Listener nativo
    const getCurrentStatus = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);
    };

    getCurrentStatus();

    let cleanup: (() => void) | undefined;

    Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      console.log('Network status changed', status);
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);
    }).then(listener => {
      cleanup = () => listener.remove();
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return {
    isOnline,
    connectionType,
    isNative
  };
}
