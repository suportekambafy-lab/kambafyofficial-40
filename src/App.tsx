
import CustomToaster from "@/components/ui/toast";
import { setGlobalToasterRef } from "@/hooks/useCustomToast";
import { useRef, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider } from "./hooks/useTheme";
import { SubdomainGuard } from "./components/SubdomainGuard";
import { OptimizedRoutes } from "./components/OptimizedRoutes";
import { EnhancedErrorBoundary } from "./components/ui/enhanced-error-boundary";
import { Suspense, lazy } from "react";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminPermissionRoute from "./components/AdminPermissionRoute";
import { useVersionCheck } from "./hooks/useVersionCheck";
import { useOneSignal } from "./hooks/useOneSignal";
import { useRealtimeSellerNotifications } from "./hooks/useRealtimeSellerNotifications";
import { supabase } from "@/integrations/supabase/client";

const TestFacebookIntegration = lazy(() => import("./pages/TestFacebookIntegration"));

// Test Components for debugging member area navigation
const TestAreaComponent = () => {
  useEffect(() => {
    console.log('🧪 TESTE: Elemento /area/teste sendo renderizado!');
    console.log('🧪 TESTE: Pathname atual:', window.location.pathname);
    console.log('🧪 TESTE: URL completa:', window.location.href);
  }, []);
  
  return (
    <div className="p-8 border border-green-500 bg-green-50">
      <h1 className="text-2xl font-bold text-green-800">🧪 TESTE: Rota /area/teste Funcionando!</h1>
      <p className="text-green-600">Navegação interna do React Router funcionando sem reload</p>
      <p className="text-sm text-green-600">Pathname: {window.location.pathname}</p>
      <p className="text-sm text-green-600">Host: {window.location.hostname}</p>
    </div>
  );
};

const TestLoginComponent = () => {
  useEffect(() => {
    console.log('🧪 TESTE: Elemento /login/teste sendo renderizado!');
    console.log('🧪 TESTE: Pathname atual:', window.location.pathname);
    console.log('🧪 TESTE: URL completa:', window.location.href);
  }, []);
  
  return (
    <div className="p-8 border border-blue-500 bg-blue-50">
      <h1 className="text-2xl font-bold text-blue-800">🧪 TESTE: Rota /login/teste Funcionando!</h1>
      <p className="text-blue-600">Navegação interna do React Router funcionando sem reload</p>
      <p className="text-sm text-blue-600">Pathname: {window.location.pathname}</p>
      <p className="text-sm text-blue-600">Host: {window.location.hostname}</p>
    </div>
  );
};

// Component to initialize OneSignal after auth  
function OneSignalInitializer() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | undefined>();
  
  // Monitorar user_id para notificações em tempo real
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);
  
  const { isInitialized, playerId, savePlayerIdToProfile } = useOneSignal({
    onNotificationReceived: (notification) => {
      console.log('📩 Notification received in app:', notification);
    },
    onNotificationOpened: (notification) => {
      console.log('🔔 Notification opened:', notification);
      
      // Navegar para a página de vendas quando abrir notificação
      if (notification.data?.type === 'sale') {
        window.location.href = '/vendedor#vendas';
      }
    }
  });

  // Hook para notificações em tempo real do vendedor
  useRealtimeSellerNotifications(userId);

  useEffect(() => {
    if (isInitialized && playerId) {
      console.log('✅ OneSignal initialized with Player ID:', playerId);
    }
  }, [isInitialized, playerId]);

  // Salvar Player ID quando usuário estiver autenticado e Player ID disponível
  useEffect(() => {
    console.log('🔍 OneSignalInitializer check:', { 
      hasUser: !!user, 
      hasPlayerId: !!playerId, 
      hasSaveFunction: !!savePlayerIdToProfile,
      playerId 
    });
    
    if (user && playerId && savePlayerIdToProfile) {
      console.log('🔄 User authenticated + Player ID available, saving to Supabase...');
      savePlayerIdToProfile(playerId).then(success => {
        console.log('💾 Save result:', success ? 'SUCCESS' : 'FAILED');
      });
    }
  }, [user, playerId, savePlayerIdToProfile]);

  return null; // Este componente não renderiza nada
}


// QueryClient otimizado para WebSockets (sem refetch desnecessário)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - dados ficam frescos
      gcTime: 10 * 60 * 1000, // 10 minutos - mantém em memória
      refetchOnWindowFocus: false, // ❌ Desabilitado: WebSockets atualizam automaticamente
      refetchOnReconnect: true, // ✅ Atualiza ao reconectar internet
      refetchOnMount: false, // ❌ Desabilitado: WebSockets mantêm dados atualizados
      refetchInterval: false, // ❌ Desabilitado: WebSockets substituem polling
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      networkMode: 'online',
      structuralSharing: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
      // Invalidação automática após mutações
      onSuccess: () => {
        // Força refetch de todas as queries relacionadas
        queryClient.invalidateQueries();
      },
    }
  },
});


const App = () => {
  const toasterRef = useRef<any>(null);
  const [toasterInitialized, setToasterInitialized] = useState(false);
  const [impersonationData, setImpersonationData] = useState<any>(null);

  // Sistema de detecção automática de novas versões
  useVersionCheck();

  useEffect(() => {
    // Garantir que o toaster seja inicializado apenas uma vez
    if (toasterRef.current && !toasterInitialized) {
      setGlobalToasterRef(toasterRef.current);
      setToasterInitialized(true);
      console.log('🍞 Toast system inicializado apenas uma vez');
    }
  }, [toasterInitialized]);

  // Verificar se há impersonation ativa
  useEffect(() => {
    const checkImpersonation = () => {
      const data = localStorage.getItem('impersonation_data');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setImpersonationData(parsed);
        } catch (error) {
          console.error('Erro ao parsear impersonation_data:', error);
          localStorage.removeItem('impersonation_data');
        }
      } else {
        setImpersonationData(null);
      }
    };

    checkImpersonation();
    
    // Verificar periodicamente se impersonation ainda está ativa
    const interval = setInterval(checkImpersonation, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <EnhancedErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light" storageKey="kambafy-ui-theme" forceLightMode={true}>
            <AuthProvider>
              <AdminAuthProvider>
                <NotificationProvider>
              <TooltipProvider>
              <CustomToaster ref={toasterRef} />
               <BrowserRouter>
                 <OneSignalInitializer />
                 {impersonationData && (
                   <ImpersonationBanner
                     targetUserName={impersonationData.targetUser?.full_name || impersonationData.targetUser?.email || 'Usuário'}
                     targetUserEmail={impersonationData.targetUser?.email || ''}
                   />
                 )}
                 <SubdomainGuard>
                   <Suspense fallback={<div className="min-h-screen bg-background" />}>
                     <Routes>
                       {(() => {
                         console.log('🚦 App.tsx: Routes renderizando, URL atual:', {
                           pathname: window.location.pathname,
                           hostname: window.location.hostname,
                           fullUrl: window.location.href,
                           timestamp: new Date().toISOString()
                         });
                         return null;
                       })()}
                       <Route path="/" element={<OptimizedRoutes.Index />} />
                      <Route path="/auth" element={<OptimizedRoutes.Auth />} />
                      <Route path="/reset-password" element={<OptimizedRoutes.ResetPassword />} />
                       <Route path="/produto/:productId" element={<OptimizedRoutes.ProductSalesPage />} />
                       <Route path="/checkout/:productId" element={<OptimizedRoutes.Checkout />} />
                       <Route path="/checkout/:productId/success" element={<OptimizedRoutes.CheckoutSuccess />} />
                       <Route path="/obrigado" element={<OptimizedRoutes.ThankYou />} />
                       <Route path="/renovar/:token" element={<OptimizedRoutes.RenewalPage />} />
                       <Route path="/como-funciona" element={<OptimizedRoutes.HowItWorks />} />
                      <Route path="/precos" element={<OptimizedRoutes.Pricing />} />
                      <Route path="/recursos" element={<OptimizedRoutes.Features />} />
                       <Route path="/ajuda" element={<OptimizedRoutes.HelpCenter />} />
                        <Route path="/comunidade" element={<OptimizedRoutes.SellerCommunity />} />
                        <Route path="/contato" element={<OptimizedRoutes.Contact />} />
                       <Route path="/denuncie" element={<OptimizedRoutes.Report />} />
                       <Route path="/status" element={<OptimizedRoutes.Status />} />
                         <Route path="/marketplace" element={<OptimizedRoutes.MarketplacePage />} />
                         <Route path="/ranking" element={<OptimizedRoutes.RankingPage />} />
                        <Route path="/privacidade" element={<OptimizedRoutes.Privacy />} />
                       <Route path="/termos" element={<OptimizedRoutes.Terms />} />
                       <Route path="/cookies" element={<OptimizedRoutes.Cookies />} />
                       <Route path="/apps/*" element={<OptimizedRoutes.Apps />} />
                         <Route path="/vendedor/*" element={<OptimizedRoutes.SellerDashboard />} />
                          <Route path="/meus-afiliados" element={<OptimizedRoutes.MeusAfiliados />} />
                          <Route path="/minhas-compras" element={<OptimizedRoutes.MyPurchases />} />
                          <Route path="/meus-acessos" element={<OptimizedRoutes.MeusAcessos />} />
                          <Route path="/identidade" element={<OptimizedRoutes.UserIdentity />} />
                          <Route path="/vimeo-settings" element={<OptimizedRoutes.VimeoSettings />} />
                          
                          {/* Refund Routes */}
                         
                         {/* Member Area Routes - ÁREAS ESPECÍFICAS DE CADA VENDEDOR */}
                            
                            {/* 🎓 ÁREAS ESPECÍFICAS - Sistema individual (verificação direta no banco) */}
                            <Route path="/members/login/:id" element={<OptimizedRoutes.ModernMembersLogin />} />
                            <Route path="/members/area/:id" element={<OptimizedRoutes.ModernMembersArea />} />
                            
                            {/* Rotas para subdomínio membros.kambafy.com (sem prefixo /members) */}
                            <Route path="/login/:id" element={<OptimizedRoutes.ModernMembersLogin />} />
                            <Route path="/area/:id" element={<OptimizedRoutes.ModernMembersArea />} />
                        <Route path="/mobile" element={<OptimizedRoutes.Mobile />} />
                        <Route path="/app" element={<OptimizedRoutes.AppMobile />} />
                         
                         
                        
                        {/* Admin Routes */}
                       <Route path="/admin/login" element={<OptimizedRoutes.AdminLogin />} />
                       <Route path="/admin" element={<AdminProtectedRoute><OptimizedRoutes.AdminDashboard /></AdminProtectedRoute>} />
                       <Route path="/admin/sales" element={<AdminPermissionRoute requiredPermission="view_analytics"><OptimizedRoutes.AdminSales /></AdminPermissionRoute>} />
                       <Route path="/admin/withdrawals" element={<AdminPermissionRoute requiredPermission="manage_withdrawals"><OptimizedRoutes.AdminWithdrawals /></AdminPermissionRoute>} />
                       <Route path="/admin/products" element={<AdminPermissionRoute requiredPermission="manage_products"><OptimizedRoutes.AdminProducts /></AdminPermissionRoute>} />
                       <Route path="/admin/marketplace" element={<AdminPermissionRoute requiredPermission="manage_products"><OptimizedRoutes.AdminProductApproval /></AdminPermissionRoute>} />
                       <Route path="/admin/users" element={<AdminPermissionRoute requiredPermission="manage_users"><OptimizedRoutes.AdminUsers /></AdminPermissionRoute>} />
                       <Route path="/admin/logs" element={<AdminPermissionRoute requiredPermission="view_analytics"><OptimizedRoutes.AdminLogs /></AdminPermissionRoute>} />
                        <Route path="/admin/sellers" element={<AdminPermissionRoute requiredPermission="manage_users"><OptimizedRoutes.AdminSellers /></AdminPermissionRoute>} />
                         <Route path="/admin/identity" element={<AdminPermissionRoute requiredPermission="manage_verifications"><OptimizedRoutes.AdminIdentityVerification /></AdminPermissionRoute>} />
                          <Route path="/admin/management" element={<AdminPermissionRoute requireSuperAdmin={true}><OptimizedRoutes.AdminManagement /></AdminPermissionRoute>} />
                          <Route path="/admin/partners" element={<AdminPermissionRoute requiredPermission="manage_products"><OptimizedRoutes.AdminPartners /></AdminPermissionRoute>} />
                         <Route path="/admin/seller-reports" element={<AdminPermissionRoute requiredPermission="view_analytics"><OptimizedRoutes.AdminSellerReports /></AdminPermissionRoute>} />
                         <Route path="/admin/retention" element={<AdminPermissionRoute requiredPermission="manage_withdrawals"><OptimizedRoutes.AdminRetentionManagement /></AdminPermissionRoute>} />
                         <Route path="/admin/payment-approvals" element={<AdminPermissionRoute requiredPermission="manage_transfers"><OptimizedRoutes.AdminPaymentApprovals /></AdminPermissionRoute>} />
                      
                       {/* Partner Routes */}
                       <Route path="/partners/apply" element={<OptimizedRoutes.PartnersApply />} />
                       <Route path="/partners/portal" element={<OptimizedRoutes.PartnersPortal />} />
                       
                        {/* Developer Routes */}
                       <Route path="/dev-routes" element={<OptimizedRoutes.DevRoutes />} />
                       
                          {/* Test Routes - Cleaned up */}
                       <Route path="/area/teste" element={<TestAreaComponent />} />
                       <Route path="/login/teste" element={<TestLoginComponent />} />
                       <Route path="/bunny-storage-test" element={<OptimizedRoutes.BunnyStorageTest />} />
                       <Route path="/cloudflare-storage-test" element={<OptimizedRoutes.CloudflareStorageTest />} />
                       <Route path="/test-facebook" element={<TestFacebookIntegration />} />
                       
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<OptimizedRoutes.NotFound />} />
                    </Routes>
                  </Suspense>
                </SubdomainGuard>
                </BrowserRouter>
              </TooltipProvider>
            </NotificationProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
  </EnhancedErrorBoundary>
  );
};

export default App;
