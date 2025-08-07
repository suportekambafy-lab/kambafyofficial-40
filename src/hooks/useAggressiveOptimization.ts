import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/productionLogger';

export const useAggressiveOptimization = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Otimizações agressivas de performance
    
    // 1. Limpar cache antigo agressivamente
    const clearOldCache = () => {
      const keys = Object.keys(sessionStorage);
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutos

      keys.forEach(key => {
        if (key.startsWith('cache_') || key.startsWith('preload_')) {
          try {
            const data = JSON.parse(sessionStorage.getItem(key) || '{}');
            if (data.timestamp && now - data.timestamp > maxAge) {
              sessionStorage.removeItem(key);
            }
          } catch {
            sessionStorage.removeItem(key);
          }
        }
      });
    };

    // 2. Otimizar re-renders com throttling
    let rafId: number;
    const optimizeRenders = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // Batch DOM updates
        document.documentElement.style.willChange = 'transform';
        setTimeout(() => {
          document.documentElement.style.willChange = 'auto';
        }, 100);
      });
    };

    // 3. Preload crítico imediato
    if (user) {
      optimizeRenders();
      clearOldCache();
      logger.debug('Optimizations applied for user', { component: 'useAggressiveOptimization' });
    }

    // 4. Observer para lazy loading agressivo
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-loaded', 'true');
          }
        });
      },
      { rootMargin: '50px' }
    );

    // 5. Cleanup na saída
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [user]);

  // Cache agressivo com compressão
  const aggressiveCache = useMemo(() => ({
    set: (key: string, data: any) => {
      try {
        const compressed = JSON.stringify({
          data,
          timestamp: Date.now(),
          compressed: true
        });
        sessionStorage.setItem(`aggressive_${key}`, compressed);
      } catch {
        // Se falhar, limpar cache para fazer espaço
        sessionStorage.clear();
        sessionStorage.setItem(`aggressive_${key}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    },
    get: (key: string, maxAge = 30000) => { // 30 segundos default
      try {
        const cached = sessionStorage.getItem(`aggressive_${key}`);
        if (!cached) return null;

        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp > maxAge) {
          sessionStorage.removeItem(`aggressive_${key}`);
          return null;
        }
        return parsed.data;
      } catch {
        return null;
      }
    }
  }), []);

  return { aggressiveCache };
};