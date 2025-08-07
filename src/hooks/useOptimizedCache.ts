import { useState, useEffect, useCallback } from 'react';

interface CacheOptions {
  cacheTime?: number; // tempo em ms para manter no cache
  staleTime?: number; // tempo em ms considerado fresh
  key: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number;
}

export function useOptimizedCache<T>(
  queryFn: () => Promise<T>,
  options: CacheOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { 
    cacheTime = 5 * 60 * 1000, // 5 minutos default
    staleTime = 2 * 60 * 1000,  // 2 minutos default
    key 
  } = options;

  const getCachedData = useCallback((): T | null => {
    try {
      const cached = sessionStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Verificar se ainda está no tempo de cache
      if (now - entry.timestamp > cacheTime) {
        sessionStorage.removeItem(`cache_${key}`);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }, [key, cacheTime]);

  const isStale = useCallback((): boolean => {
    try {
      const cached = sessionStorage.getItem(`cache_${key}`);
      if (!cached) return true;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      return now - entry.timestamp > entry.staleTime;
    } catch {
      return true;
    }
  }, [key]);

  const setCachedData = useCallback((newData: T) => {
    const entry: CacheEntry<T> = {
      data: newData,
      timestamp: Date.now(),
      staleTime
    };

    try {
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Falha ao salvar no cache:', error);
    }
  }, [key, staleTime]);

  const fetchData = useCallback(async (force = false) => {
    try {
      // Se não forçar, tentar usar cache first
      if (!force) {
        const cachedData = getCachedData();
        if (cachedData && !isStale()) {
          setData(cachedData);
          setLoading(false);
          setError(null);
          return cachedData;
        }
      }

      setLoading(true);
      setError(null);

      const result = await queryFn();
      
      setData(result);
      setCachedData(result);
      setLoading(false);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      setError(error);
      setLoading(false);
      throw error;
    }
  }, [queryFn, getCachedData, isStale, setCachedData]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    sessionStorage.removeItem(`cache_${key}`);
    setData(null);
  }, [key]);

  // Carregar dados na inicialização
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Background refresh se dados estão stale
  useEffect(() => {
    if (data && isStale()) {
      // Refresh em background sem mostrar loading
      queryFn().then(newData => {
        setData(newData);
        setCachedData(newData);
      }).catch(() => {
        // Manter dados atuais em caso de erro
      });
    }
  }, [data, isStale, queryFn, setCachedData]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isStale: isStale()
  };
}