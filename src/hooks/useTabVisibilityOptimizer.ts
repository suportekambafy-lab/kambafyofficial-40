import { useEffect, useRef } from 'react';

/**
 * Hook para otimizar comportamento quando tab fica visível/invisível
 * Evita re-renders e re-fetches excessivos
 */
export const useTabVisibilityOptimizer = () => {
  const isInitialMount = useRef(true);
  const lastVisibilityChange = useRef(0);
  const wasVisible = useRef(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const isVisible = !document.hidden;
      
      // Skip no primeiro mount
      if (isInitialMount.current) {
        isInitialMount.current = false;
        wasVisible.current = isVisible;
        return;
      }
      
      // Throttle para evitar spam
      if (now - lastVisibilityChange.current < 1000) {
        return;
      }
      
      lastVisibilityChange.current = now;
      
      // Log apenas mudanças significativas
      if (wasVisible.current !== isVisible) {
        console.log('📱 Tab visibility changed:', isVisible ? 'visible' : 'hidden');
        wasVisible.current = isVisible;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isVisible: !document.hidden,
    shouldSkipUpdate: (lastUpdate: number, minInterval = 30000) => {
      return Date.now() - lastUpdate < minInterval;
    }
  };
};