
import CustomToaster from "@/components/ui/toast";
import { setGlobalToasterRef } from "@/hooks/useCustomToast";
import { useRef, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider } from "./hooks/useTheme";
import { SubdomainGuard } from "./components/SubdomainGuard";
import { OptimizedRoutes } from "./components/OptimizedRoutes";
import { EnhancedErrorBoundary } from "./components/ui/enhanced-error-boundary";
import { Suspense } from "react";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

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


// QueryClient otimizado para performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos  
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    }
  },
});


const App = () => {
  const toasterRef = useRef<any>(null);
  const [toasterInitialized, setToasterInitialized] = useState(false);

  useEffect(() => {
    // Garantir que o toaster seja inicializado apenas uma vez
    if (toasterRef.current && !toasterInitialized) {
      setGlobalToasterRef(toasterRef.current);
      setToasterInitialized(true);
      console.log('🍞 Toast system inicializado apenas uma vez');
    }
  }, [toasterInitialized]);

  return (
    <EnhancedErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="kambafy-ui-theme">
          <AuthProvider>
            <AdminAuthProvider>
              <NotificationProvider>
            <TooltipProvider>
              <CustomToaster ref={toasterRef} />
               <BrowserRouter>
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
                      <Route path="/checkout/:productId" element={<OptimizedRoutes.Checkout />} />
                      <Route path="/checkout/:productId/success" element={<OptimizedRoutes.CheckoutSuccess />} />
                      <Route path="/obrigado" element={<OptimizedRoutes.ThankYou />} />
                      <Route path="/como-funciona" element={<OptimizedRoutes.HowItWorks />} />
                      <Route path="/precos" element={<OptimizedRoutes.Pricing />} />
                      <Route path="/recursos" element={<OptimizedRoutes.Features />} />
                      <Route path="/ajuda" element={<OptimizedRoutes.HelpCenter />} />
                      <Route path="/contato" element={<OptimizedRoutes.Contact />} />
                      <Route path="/status" element={<OptimizedRoutes.Status />} />
                      <Route path="/privacidade" element={<OptimizedRoutes.Privacy />} />
                      <Route path="/termos" element={<OptimizedRoutes.Terms />} />
                      <Route path="/cookies" element={<OptimizedRoutes.Cookies />} />
                      <Route path="/apps" element={<OptimizedRoutes.Apps />} />
                       <Route path="/vendedor/*" element={<OptimizedRoutes.SellerDashboard />} />
                        <Route path="/meus-afiliados" element={<OptimizedRoutes.MeusAfiliados />} />
                        <Route path="/minhas-compras" element={<OptimizedRoutes.MeusAcessos />} />
                        <Route path="/identidade" element={<OptimizedRoutes.UserIdentity />} />
                        
                        {/* Member Area Routes - Modern Authentication System */}
                            {/* Nova estrutura moderna de área de membros */}
                            <Route path="/members/login/:id" element={<OptimizedRoutes.ModernMembersLogin />} />
                            <Route path="/members/area/:id" element={<OptimizedRoutes.ModernMembersArea />} />
                            
                            {/* Rotas para subdomínio membros (sem prefixo /members) */}
                            <Route path="/login/:id" element={<OptimizedRoutes.ModernMembersLogin />} />
                            <Route path="/area/:id" element={<OptimizedRoutes.ModernMembersArea />} />
                       <Route path="/mobile" element={<OptimizedRoutes.Mobile />} />
                        <Route path="/kambapay" element={<OptimizedRoutes.KambaPay />} />
                        
                       
                       {/* Admin Routes */}
                       <Route path="/admin/login" element={<OptimizedRoutes.AdminLogin />} />
                       <Route path="/admin" element={<AdminProtectedRoute><OptimizedRoutes.AdminDashboard /></AdminProtectedRoute>} />
                       <Route path="/admin/sales" element={<AdminProtectedRoute><OptimizedRoutes.AdminSales /></AdminProtectedRoute>} />
                       <Route path="/admin/withdrawals" element={<AdminProtectedRoute><OptimizedRoutes.AdminWithdrawals /></AdminProtectedRoute>} />
                       <Route path="/admin/products" element={<AdminProtectedRoute><OptimizedRoutes.AdminProducts /></AdminProtectedRoute>} />
                       <Route path="/admin/users" element={<AdminProtectedRoute><OptimizedRoutes.AdminUsers /></AdminProtectedRoute>} />
                        <Route path="/admin/logs" element={<AdminProtectedRoute><OptimizedRoutes.AdminLogs /></AdminProtectedRoute>} />
                        <Route path="/admin/sellers" element={<AdminProtectedRoute><OptimizedRoutes.AdminSellers /></AdminProtectedRoute>} />
                        <Route path="/admin/identity" element={<AdminProtectedRoute><OptimizedRoutes.AdminIdentityVerification /></AdminProtectedRoute>} />
                        <Route path="/admin/partners" element={<AdminProtectedRoute><OptimizedRoutes.AdminPartners /></AdminProtectedRoute>} />
                        <Route path="/admin/seller-reports" element={<AdminProtectedRoute><OptimizedRoutes.AdminSellerReports /></AdminProtectedRoute>} />
                        <Route path="/admin/payment-approvals" element={<AdminProtectedRoute><OptimizedRoutes.AdminPaymentApprovals /></AdminProtectedRoute>} />
                      
                       {/* Partner Routes */}
                       <Route path="/partners/apply" element={<OptimizedRoutes.PartnersApply />} />
                       <Route path="/partners/portal" element={<OptimizedRoutes.PartnersPortal />} />
                       
                        {/* Developer Routes */}
                       <Route path="/dev-routes" element={<OptimizedRoutes.DevRoutes />} />
                       
                          {/* Test Routes - Cleaned up */}
                       <Route path="/area/teste" element={<TestAreaComponent />} />
                       <Route path="/login/teste" element={<TestLoginComponent />} />
                       
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
  </EnhancedErrorBoundary>
  );
};

export default App;
