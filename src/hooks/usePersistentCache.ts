import { useState, useEffect, useCallback } from 'react';

interface PersistentCacheOptions {
  key: string;
  expiryTime?: number; // Tempo em ms até expirar (padrão: 7 dias)
}

/**
 * Hook para cache persistente usando localStorage
 * Ideal para configurações e dados que devem persistir entre sessões
 */
export function usePersistentCache<T>(options: PersistentCacheOptions) {
  const { key, expiryTime = 7 * 24 * 60 * 60 * 1000 } = options; // 7 dias default
  const storageKey = `persistent_${key}`;
  
  const [data, setData] = useState<T | null>(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const now = Date.now();
      
      // Verificar se expirou
      if (parsed.expiresAt && now > parsed.expiresAt) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return parsed.data;
    } catch {
      return null;
    }
  });

  const saveData = useCallback((newData: T) => {
    try {
      const now = Date.now();
      const cacheEntry = {
        data: newData,
        timestamp: now,
        expiresAt: now + expiryTime
      };
      localStorage.setItem(storageKey, JSON.stringify(cacheEntry));
      setData(newData);
    } catch (error) {
      console.warn(`Failed to save to persistent cache (${key}):`, error);
    }
  }, [storageKey, expiryTime, key]);

  const clearData = useCallback(() => {
    localStorage.removeItem(storageKey);
    setData(null);
  }, [storageKey]);

  const getData = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const now = Date.now();
      
      // Verificar se expirou
      if (parsed.expiresAt && now > parsed.expiresAt) {
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return parsed.data;
    } catch {
      return null;
    }
  }, [storageKey]);

  return {
    data,
    saveData,
    clearData,
    getData
  };
}

// Hook utilitário para preferências do usuário
export function useUserPreferences() {
  return usePersistentCache<{
    salesStatusFilter?: string;
    dashboardView?: string;
    [key: string]: any;
  }>({ 
    key: 'user_preferences',
    expiryTime: 30 * 24 * 60 * 60 * 1000 // 30 dias
  });
}
