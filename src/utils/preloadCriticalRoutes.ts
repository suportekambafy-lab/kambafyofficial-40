// Preload crítico otimizado de rotas do vendedor

// Precarregar componentes do vendedor quando em idle
if (typeof window !== 'undefined') {
  // Preload das rotas críticas do vendedor
  setTimeout(() => {
    const preloadSellerRoutes = async () => {
      try {
        // Preload dos componentes mais usados
        await Promise.all([
          import('@/pages/SellerDashboard'),
          import('@/components/ProductFormTabs'),
          import('@/components/SalesChart'),
          import('@/components/modern/ModernDashboardHome'),
        ]);
        // Removido console.log para produção
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Componentes do vendedor pré-carregados');
        }
      } catch (error) {
        // Somente logs de erro são mantidos
        if (process.env.NODE_ENV === 'development') {
          console.error('⚠️ Erro no preload:', error);
        }
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadSellerRoutes);
    } else {
      setTimeout(preloadSellerRoutes, 2000);
    }
  }, 1000);
}

export {};