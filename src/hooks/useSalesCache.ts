import { usePersistentCache } from './usePersistentCache';

interface SalesCacheData {
  orders: any[];
  timestamp: number;
  salesStatusFilter: string;
}

/**
 * Hook especializado para cache de histórico de vendas
 * Cache válido por 5 minutos (300000ms)
 */
export function useSalesCache(userId: string, salesStatusFilter: string) {
  const cacheKey = `sales_history_${userId}_${salesStatusFilter}`;
  
  const { data, saveData, clearData, getData } = usePersistentCache<SalesCacheData>({
    key: cacheKey,
    expiryTime: 5 * 60 * 1000 // 5 minutos
  });

  const getCachedSales = () => {
    const cached = getData();
    if (cached && cached.salesStatusFilter === salesStatusFilter) {
      return cached.orders;
    }
    return null;
  };

  const saveSalesToCache = (orders: any[]) => {
    saveData({
      orders,
      timestamp: Date.now(),
      salesStatusFilter
    });
  };

  const clearSalesCache = () => {
    clearData();
  };

  const hasCachedData = () => {
    const cached = getData();
    return cached !== null && cached.salesStatusFilter === salesStatusFilter;
  };

  return {
    cachedSales: getCachedSales(),
    saveSalesToCache,
    clearSalesCache,
    hasCachedData: hasCachedData()
  };
}
