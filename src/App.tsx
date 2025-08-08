
import CustomToaster from "@/components/ui/toast";
import { setGlobalToasterRef } from "@/hooks/useCustomToast";
import { useRef, useEffect } from "react";
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
import AuthContextWrapper from "./components/AuthContextWrapper";
import PWALoginGuard from "./components/PWALoginGuard";


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

  useEffect(() => {
    if (toasterRef.current) {
      setGlobalToasterRef(toasterRef.current);
    }
  }, []);

  return (
    <EnhancedErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="kambafy-ui-theme">
          <AuthProvider>
            <AdminAuthProvider>
              <NotificationProvider>
            <AuthContextWrapper>
                <TooltipProvider>
                  <CustomToaster ref={toasterRef} />
                  <BrowserRouter>
                <SubdomainGuard>
                  <PWALoginGuard>
                  <Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <Routes>
                      <Route path="/" element={<OptimizedRoutes.Index />} />
                      <Route path="/auth" element={<OptimizedRoutes.Auth />} />
                      <Route path="/checkout/:productId" element={<OptimizedRoutes.Checkout />} />
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
                        <Route path="/minhas-compras" element={<OptimizedRoutes.MinhasCompras />} />
                        <Route path="/identidade" element={<OptimizedRoutes.UserIdentity />} />
                      <Route path="/curso/:areaId" element={<OptimizedRoutes.MemberAreaPreview />} />
                      
                      {/* Admin Routes */}
                      <Route path="/admin/login" element={<OptimizedRoutes.AdminLogin />} />
                      <Route path="/admin" element={<OptimizedRoutes.AdminDashboard />} />
                      <Route path="/admin/withdrawals" element={<OptimizedRoutes.AdminWithdrawals />} />
                      <Route path="/admin/products" element={<OptimizedRoutes.AdminProducts />} />
                      <Route path="/admin/users" element={<OptimizedRoutes.AdminUsers />} />
                       <Route path="/admin/logs" element={<OptimizedRoutes.AdminLogs />} />
                       <Route path="/admin/sellers" element={<OptimizedRoutes.AdminSellers />} />
                       <Route path="/admin/identity" element={<OptimizedRoutes.AdminIdentityVerification />} />
                      <Route path="/admin/seller-reports" element={<OptimizedRoutes.AdminSellerReports />} />
                      
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<OptimizedRoutes.NotFound />} />
                    </Routes>
                    </Suspense>
                  </PWALoginGuard>
                </SubdomainGuard>
                </BrowserRouter>
              </TooltipProvider>
            </AuthContextWrapper>
            </NotificationProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </EnhancedErrorBoundary>
  );
};

export default App;
