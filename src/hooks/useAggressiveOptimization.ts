import { useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/productionLogger';

export const useAggressiveOptimization = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Limpar cache antigo apenas uma vez na montagem
    const clearOldCache = () => {
      const keys = Object.keys(sessionStorage);
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutos

      keys.forEach(key => {
        if (key.startsWith('cache_') || key.startsWith('preload_') || key.startsWith('aggressive_')) {
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

    clearOldCache();
    logger.debug('Cache cleanup completed', { component: 'useAggressiveOptimization' });
  }, [user]);

  // Cache otimizado com throttling de writes
  const aggressiveCache = useMemo(() => {
    const writeQueue = new Map<string, NodeJS.Timeout>();

    return {
      set: (key: string, data: any) => {
        // Throttle writes para evitar sobrecarga
        if (writeQueue.has(key)) {
          clearTimeout(writeQueue.get(key)!);
        }

        writeQueue.set(key, setTimeout(() => {
          try {
            sessionStorage.setItem(`aggressive_${key}`, JSON.stringify({
              data,
              timestamp: Date.now()
            }));
            writeQueue.delete(key);
          } catch {
            // Apenas limpar o item mais antigo ao invés de tudo
            const keys = Object.keys(sessionStorage);
            if (keys.length > 0) {
              sessionStorage.removeItem(keys[0]);
            }
          }
        }, 100));
      },
      get: (key: string, maxAge = 60000) => { // 60 segundos default (aumentado)
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
    };
  }, []);

  return { aggressiveCache };
};