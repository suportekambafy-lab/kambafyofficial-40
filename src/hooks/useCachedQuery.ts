import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
  etag?: string;
}

interface CachedQueryOptions {
  staleTime?: number; // Tempo em ms até os dados ficarem "stale"
  cacheTime?: number; // Tempo em ms para manter os dados no cache
  enabled?: boolean;
  version?: string; // Versão para cache busting
}

const cache = new Map<string, CacheEntry<any>>();

// Versão da aplicação para cache busting (estática)
const APP_VERSION = '1.1.0'; // Mantém cache estável entre reloads

// Detectar mudanças de versão e limpar cache
const CACHE_VERSION_KEY = 'kambafy_cache_version';
const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
if (storedVersion !== APP_VERSION) {
  cache.clear();
  localStorage.setItem(CACHE_VERSION_KEY, APP_VERSION);
}

export function useCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: CachedQueryOptions = {}
) {
  const {
    staleTime = 30 * 60 * 1000, // 30 minutos - cache mais duradouro
    cacheTime = 60 * 60 * 1000, // 60 minutos - mantém dados por 1 hora
    enabled = true,
    version = APP_VERSION
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const getCachedData = useCallback(() => {
    const cached = cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    
    // Se expirou, remover do cache
    if (now > cached.expiresAt) {
      cache.delete(key);
      return null;
    }

    // Se versão mudou, invalidar cache
    if (cached.version !== version) {
      cache.delete(key);
      return null;
    }

    return cached;
  }, [key, version]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    const now = Date.now();
    const cached = getCachedData();

    // Se tem dados em cache e não está forçando refresh
    if (cached && !forceRefresh) {
      const isDataStale = now > cached.timestamp + staleTime;
      
      setData(cached.data);
      setIsStale(isDataStale);
      
      // Se dados não estão stale, não fazer nova requisição
      if (!isDataStale) {
        return cached.data;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fazer a requisição
      const result = await queryFn();
      
      // Atualizar cache
      const etag = `${key}-${now}-${JSON.stringify(result).length}`;
      cache.set(key, {
        data: result,
        timestamp: now,
        expiresAt: now + cacheTime,
        version,
        etag
      });

      setData(result);
      setIsStale(false);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error(`Error in cached query ${key}:`, error);
      
      // Se tinha dados em cache, manter eles mesmo com erro
      if (cached) {
        setData(cached.data);
        setIsStale(true);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [key, queryFn, enabled, staleTime, cacheTime, getCachedData]);

  // Função para invalidar cache específico
  const invalidateQuery = useCallback(() => {
    cache.delete(key);
    setIsStale(true);
  }, [key]);

  // Função para refetch forçado
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Função para atualizar dados manualmente
  const setQueryData = useCallback((newData: T) => {
    const now = Date.now();
    const etag = `${key}-${now}-${JSON.stringify(newData).length}`;
    cache.set(key, {
      data: newData,
      timestamp: now,
      expiresAt: now + cacheTime,
      version,
      etag
    });
    setData(newData);
    setIsStale(false);
  }, [key, cacheTime, version]);

  // Carregar dados iniciais
  useEffect(() => {
    const cached = getCachedData();
    if (cached) {
      setData(cached.data);
      const now = Date.now();
      setIsStale(now > cached.timestamp + staleTime);
    }

    fetchData();
  }, [fetchData, getCachedData, staleTime]);

  // ✅ DESABILITADO: Com WebSockets, não precisamos revalidar ao voltar para a aba
  // Os dados são atualizados automaticamente em tempo real via realtime subscriptions

  // Cleanup: remover dados expirados do cache periodicamente
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [cacheKey, entry] of cache.entries()) {
        if (now > entry.expiresAt) {
          cache.delete(cacheKey);
        }
      }
    }, 60000); // Limpar a cada minuto

    return () => clearInterval(cleanup);
  }, []);

  return {
    data,
    isLoading,
    error,
    isStale,
    refetch,
    invalidateQuery,
    setQueryData,
    isCached: !!getCachedData()
  };
}

// Função utilitária para invalidar múltiplas queries
export function invalidateQueries(pattern: string) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

// Função para limpar todo o cache
export function clearCache() {
  cache.clear();
}