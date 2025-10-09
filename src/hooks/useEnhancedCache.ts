import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/productionLogger';

// Cache em memória para acesso ultra-rápido
const memoryCache = new Map<string, { data: any; timestamp: number }>();

interface EnhancedCacheOptions {
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  enableMemoryCache?: boolean;
  prefetchRelated?: string[];
}

/**
 * Hook de cache ultra-agressivo com:
 * - Cache em memória para acesso instantâneo
 * - Prefetching automático de queries relacionadas
 * - Background refetch inteligente
 * - Invalidação automática em cadeia
 */
export function useEnhancedCache<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options: EnhancedCacheOptions = {}
) {
  const {
    staleTime = 30 * 1000, // 30 segundos
    cacheTime = 10 * 60 * 1000, // 10 minutos
    refetchInterval = 60 * 1000, // 60 segundos
    enableMemoryCache = true,
    prefetchRelated = [],
  } = options;

  const queryClient = useQueryClient();
  const cacheKey = JSON.stringify(queryKey);
  const lastFetchRef = useRef<number>(0);

  // Tentar buscar do cache em memória primeiro
  const getFromMemoryCache = useCallback(() => {
    if (!enableMemoryCache) return null;
    
    const cached = memoryCache.get(cacheKey);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > staleTime) {
      memoryCache.delete(cacheKey);
      return null;
    }

    logger.debug(`Cache hit (memory): ${cacheKey}, age: ${age}ms`);
    return cached.data;
  }, [cacheKey, staleTime, enableMemoryCache]);

  // Salvar no cache em memória
  const saveToMemoryCache = useCallback((data: T) => {
    if (!enableMemoryCache) return;
    
    memoryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // Limpar caches antigos (mais de 10 minutos)
    const maxAge = 10 * 60 * 1000;
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (now - value.timestamp > maxAge) {
        memoryCache.delete(key);
      }
    }
  }, [cacheKey, enableMemoryCache]);

  // Função de query otimizada
  const enhancedQueryFn = useCallback(async () => {
    // Verificar throttling para evitar requests duplicados
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      const memData = getFromMemoryCache();
      if (memData) return memData;
    }
    lastFetchRef.current = now;

    logger.debug(`Fetching fresh data: ${cacheKey}`);
    const data = await queryFn();
    saveToMemoryCache(data);
    return data;
  }, [queryFn, cacheKey, getFromMemoryCache, saveToMemoryCache]);

  // Query principal
  const query = useQuery({
    queryKey,
    queryFn: enhancedQueryFn,
    staleTime,
    gcTime: cacheTime,
    refetchInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    // Usar dados em memória como placeholder
    placeholderData: () => getFromMemoryCache(),
  });

  // Prefetch de queries relacionadas
  useEffect(() => {
    if (prefetchRelated.length === 0 || !query.data) return;

    const prefetchTimeout = setTimeout(() => {
      prefetchRelated.forEach(relatedKey => {
        queryClient.prefetchQuery({
          queryKey: [relatedKey],
          staleTime: staleTime,
        });
      });
      logger.debug(`Prefetched related queries: ${prefetchRelated.join(', ')}`);
    }, 100);

    return () => clearTimeout(prefetchTimeout);
  }, [query.data, prefetchRelated, queryClient, staleTime]);

  // Invalidação inteligente ao desmontar se dados estiverem stale
  useEffect(() => {
    return () => {
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp > staleTime) {
        queryClient.invalidateQueries({ queryKey });
        logger.debug(`Invalidated stale query on unmount: ${cacheKey}`);
      }
    };
  }, [cacheKey, queryKey, queryClient, staleTime]);

  return {
    ...query,
    // Força refetch imediato
    refetchNow: useCallback(() => {
      memoryCache.delete(cacheKey);
      return queryClient.refetchQueries({ queryKey });
    }, [cacheKey, queryKey, queryClient]),
    // Invalidar e limpar cache
    invalidate: useCallback(() => {
      memoryCache.delete(cacheKey);
      return queryClient.invalidateQueries({ queryKey });
    }, [cacheKey, queryKey, queryClient]),
    // Verificar se está no cache em memória
    isInMemoryCache: !!getFromMemoryCache(),
  };
}

// Limpar todo o cache em memória
export const clearAllMemoryCache = () => {
  memoryCache.clear();
  logger.info('Memory cache cleared');
};

// Limpar cache de uma query específica
export const clearMemoryCache = (queryKey: QueryKey) => {
  const cacheKey = JSON.stringify(queryKey);
  memoryCache.delete(cacheKey);
  logger.debug(`Memory cache cleared for query: ${cacheKey}`);
};

// Preaquecer cache com dados
export const warmupCache = <T>(queryKey: QueryKey, data: T) => {
  const cacheKey = JSON.stringify(queryKey);
  memoryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
  logger.debug(`Cache warmed up: ${cacheKey}`);
};
