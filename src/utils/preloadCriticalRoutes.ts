// Preload inteligente de rotas do vendedor
if (typeof window !== 'undefined') {
  let preloadExecuted = false;

  const preloadSellerRoutes = async () => {
    if (preloadExecuted) return;
    preloadExecuted = true;

    try {
      await Promise.all([
        import('@/pages/SellerDashboard'),
        import('@/components/ProductFormTabs'),
        import('@/components/SalesChart'),
        import('@/components/modern/ModernDashboardHome'),
      ]);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Componentes do vendedor pré-carregados');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('⚠️ Erro no preload:', error);
      }
    }
  };

  // Usar requestIdleCallback se disponível, senão usar IntersectionObserver para trigger em scroll
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadSellerRoutes, { timeout: 3000 });
  } else {
    setTimeout(preloadSellerRoutes, 2000);
  }
}

export {};