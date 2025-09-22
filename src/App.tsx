
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
import AdminProtectedRoute from "./components/AdminProtectedRoute";


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
            <TooltipProvider>
              <CustomToaster ref={toasterRef} />
              <BrowserRouter>
                <SubdomainGuard>
                  <Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <Routes>
                      <Route path="/" element={<OptimizedRoutes.Index />} />
                      <Route path="/auth" element={<OptimizedRoutes.Auth />} />
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
                        <Route path="/minhas-compras" element={<OptimizedRoutes.MinhasCompras />} />
                        <Route path="/identidade" element={<OptimizedRoutes.UserIdentity />} />
                        
                         {/* Member Area Routes - Modern Authentication System */}
                         <Route path="/area/:id" element={<OptimizedRoutes.MemberArea />} />
                         <Route path="/area/:id/content" element={<OptimizedRoutes.MemberAreaContent />} />
                         <Route path="/area/:id/support-materials" element={<OptimizedRoutes.MemberAreaSupportMaterials />} />
                         <Route path="/area/:id/about" element={<OptimizedRoutes.MemberAreaAbout />} />
                         <Route path="/area/:id/my-courses" element={<OptimizedRoutes.MemberAreaMyCourses />} />
                         <Route path="/area/:id/support" element={<OptimizedRoutes.MemberAreaSupport />} />
                         <Route path="/area/:id/help" element={<OptimizedRoutes.MemberAreaHelp />} />
                         <Route path="/login/:id" element={<OptimizedRoutes.MemberAreaLoginWrapper />} />
                         <Route path="/area/:id/module/:moduleId" element={<OptimizedRoutes.ModuleDetail />} />
                         <Route path="/area/:id/lesson/:lessonId" element={<OptimizedRoutes.LessonDetail />} />
                       <Route path="/mobile" element={<OptimizedRoutes.Mobile />} />
                        <Route path="/kambapay" element={<OptimizedRoutes.KambaPay />} />
                        <Route path="/recuperacao-vendas" element={<OptimizedRoutes.SalesRecovery />} />
                       
                      {/* Admin Routes */}
                      <Route path="/admin/login" element={<OptimizedRoutes.AdminLogin />} />
                      <Route path="/admin" element={<AdminProtectedRoute><OptimizedRoutes.AdminDashboard /></AdminProtectedRoute>} />
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
                      
                       {/* Test Routes */}
                      
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
