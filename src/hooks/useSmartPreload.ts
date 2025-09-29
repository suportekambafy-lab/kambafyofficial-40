import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSmartPreload = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Pré-carregar dados essenciais em background
    const preloadData = async () => {
      try {
        // Definir prioridades de carregamento
        const criticalQueries = [
          // 1. Dados do perfil (sempre necessário)
          supabase
            .from('profiles')
            .select('full_name, avatar_url, iban, is_creator')
            .eq('user_id', user.id)
            .single(),
          
          // 2. Estatísticas básicas (para dashboard)
          supabase
            .rpc('get_seller_stats', { seller_id: user.id })
        ];

        const secondaryQueries = [
          // 3. Produtos recentes (limitado)
          supabase
            .from('products')
            .select('id, name, sales, price, status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          
          // 4. Pedidos recentes (limitado) - EXCLUIR member_access
          supabase
            .from('orders')
            .select(`
              id, amount, created_at, status, customer_name,
              products!inner(user_id)
            `)
            .eq('products.user_id', user.id)
            .neq('payment_method', 'member_access')
            .order('created_at', { ascending: false })
            .limit(5)
        ];

        // Executar queries críticas primeiro
        const criticalResults = await Promise.allSettled(criticalQueries);
        
        // Cachear resultados críticos
        criticalResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.data) {
            const keys = ['profile-data', 'seller-stats'];
            sessionStorage.setItem(`preload_${keys[index]}_${user.id}`, JSON.stringify({
              data: result.value.data,
              timestamp: Date.now()
            }));
          }
        });

        // Executar queries secundárias com delay
        setTimeout(async () => {
          const secondaryResults = await Promise.allSettled(secondaryQueries);
          
          secondaryResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.data) {
              const keys = ['recent-products', 'recent-orders'];
              sessionStorage.setItem(`preload_${keys[index]}_${user.id}`, JSON.stringify({
                data: result.value.data,
                timestamp: Date.now()
              }));
            }
          });
        }, 500);

      } catch (error) {
        console.warn('Preload failed:', error);
      }
    };

    // Executar preload apenas se não há dados recentes no cache
    const hasRecentCache = sessionStorage.getItem(`preload_profile-data_${user.id}`);
    if (!hasRecentCache) {
      preloadData();
    }

    // Configurar preload inteligente baseado em navegação (otimizado)
    let lastPreloadTime = 0;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Throttle: só preload se passou mais de 60 segundos
        if (now - lastPreloadTime < 60000) return;
        
        // Quando tab fica visível, atualizar dados stale apenas se necessário
        const staleTime = 10 * 60 * 1000; // Aumentado para 10 minutos
        const keys = ['profile-data', 'seller-stats', 'recent-products', 'recent-orders'];
        
        let needsPreload = false;
        keys.forEach(key => {
          const cached = sessionStorage.getItem(`preload_${key}_${user.id}`);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > staleTime) {
              needsPreload = true;
            }
          }
        });
        
        if (needsPreload) {
          lastPreloadTime = now;
          // Delay para evitar conflito com outros fetches
          setTimeout(() => preloadData(), 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Função utilitária para pegar dados precarregados
  const getPreloadedData = (key: string) => {
    if (!user) return null;
    
    try {
      const cached = sessionStorage.getItem(`preload_${key}_${user.id}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const staleTime = 5 * 60 * 1000; // 5 minutos

      if (Date.now() - timestamp > staleTime) {
        return null; // Dados muito antigos
      }

      return data;
    } catch {
      return null;
    }
  };

  return { getPreloadedData };
};