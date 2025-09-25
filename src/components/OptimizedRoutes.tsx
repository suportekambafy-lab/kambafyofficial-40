import React, { Suspense, lazy } from 'react';
import { PageSkeleton } from '@/components/ui/page-skeleton';

// Lazy loading de páginas para reduzir bundle inicial com retry
const createLazyWithRetry = (importFn: () => Promise<any>, name: string) => {
  return lazy(() => 
    importFn().catch(() => {
      console.error(`❌ Falha ao carregar módulo ${name}, tentando novamente...`);
      // Força limpeza do cache e tenta novamente
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(importFn().catch(() => {
            console.error(`❌ Falha crítica ao carregar módulo ${name}`);
            // Retorna um componente de erro como fallback
            return {
              default: () => (
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">Erro de Carregamento</h2>
                    <p className="text-muted-foreground">Falha ao carregar página {name}</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      Recarregar
                    </button>
                  </div>
                </div>
              )
            };
          }));
        }, 1000);
      });
    })
  );
};

const Index = createLazyWithRetry(() => import('@/pages/Index'), "Index");
const Auth = createLazyWithRetry(() => import('@/pages/Auth'), "Auth");
const CheckoutDirect = () => import('@/pages/Checkout'); // Direto sem lazy para ser instantâneo
const CheckoutSuccess = createLazyWithRetry(() => import('@/pages/CheckoutSuccess'), "CheckoutSuccess");
const ThankYou = createLazyWithRetry(() => import('@/pages/ThankYou'), "ThankYou");
const NotFound = createLazyWithRetry(() => import('@/pages/NotFound'), "NotFound");
const HowItWorks = createLazyWithRetry(() => import('@/pages/HowItWorks'), "HowItWorks");
const Pricing = createLazyWithRetry(() => import('@/pages/Pricing'), "Pricing");
const Features = createLazyWithRetry(() => import('@/pages/Features'), "Features");
const HelpCenter = createLazyWithRetry(() => import('@/pages/HelpCenter'), "HelpCenter");
const Contact = createLazyWithRetry(() => import('@/pages/Contact'), "Contact");
const Status = createLazyWithRetry(() => import('@/pages/Status'), "Status");
const Privacy = createLazyWithRetry(() => import('@/pages/Privacy'), "Privacy");
const Terms = createLazyWithRetry(() => import('@/pages/Terms'), "Terms");
const Cookies = createLazyWithRetry(() => import('@/pages/Cookies'), "Cookies");
const Apps = createLazyWithRetry(() => import('@/pages/Apps'), "Apps");
const ResetPassword = createLazyWithRetry(() => import('@/pages/ResetPassword'), "ResetPassword");
const MinhasCompras = createLazyWithRetry(() => import('@/pages/MinhasCompras'), "MinhasCompras");
const MeusAfiliados = createLazyWithRetry(() => import('@/pages/MeusAfiliados'), "MeusAfiliados");
const UserIdentity = createLazyWithRetry(() => import('@/pages/UserIdentity'), "UserIdentity");
const Mobile = createLazyWithRetry(() => import('@/pages/Mobile'), "Mobile");
const KambaPay = createLazyWithRetry(() => import('@/pages/KambaPay'), "KambaPay");
const SalesRecovery = createLazyWithRetry(() => import('@/pages/SalesRecovery'), "SalesRecovery");

// Member Area routes
const MemberArea = createLazyWithRetry(() => import('@/pages/MemberArea'), "MemberArea");
const MemberAreaContent = createLazyWithRetry(() => import('@/pages/MemberAreaContent'), "MemberAreaContent");
const MemberAreaSupportMaterials = createLazyWithRetry(() => import('@/pages/MemberAreaSupportMaterials'), "MemberAreaSupportMaterials");
const MemberAreaAbout = createLazyWithRetry(() => import('@/pages/MemberAreaAbout'), "MemberAreaAbout");
const MemberAreaMyCourses = createLazyWithRetry(() => import('@/pages/MemberAreaMyCourses'), "MemberAreaMyCourses");
const MemberAreaSupport = createLazyWithRetry(() => import('@/pages/MemberAreaSupport'), "MemberAreaSupport");
const MemberAreaHelp = createLazyWithRetry(() => import('@/pages/MemberAreaHelp'), "MemberAreaHelp");
const MemberAreaLogin = createLazyWithRetry(() => import('@/pages/MemberAreaLogin'), "MemberAreaLogin");
const MemberAreaLoginWrapper = createLazyWithRetry(() => import('@/pages/MemberAreaLoginWrapper'), "MemberAreaLoginWrapper");
const ProtectedMemberAreaRoute = createLazyWithRetry(() => import('@/components/ProtectedMemberAreaRoute'), "ProtectedMemberAreaRoute");
const ModuleDetail = createLazyWithRetry(() => import('@/pages/ModuleDetail'), "ModuleDetail");
const LessonDetail = createLazyWithRetry(() => import('@/pages/LessonDetail'), "LessonDetail");


// Páginas do painel vendedor - lazy load com preload e retry
const SellerDashboard = createLazyWithRetry(() => 
  import('@/pages/SellerDashboard').then(module => {
    // Preload dados críticos do vendedor
    return module;
  }), "SellerDashboard"
);

// Admin pages - lazy load com retry
const AdminLogin = createLazyWithRetry(() => import('@/pages/AdminLogin'), "AdminLogin");
const AdminDashboard = createLazyWithRetry(() => import('@/pages/AdminDashboard'), "AdminDashboard");
const AdminWithdrawals = createLazyWithRetry(() => import('@/pages/AdminWithdrawals'), "AdminWithdrawals");
const AdminProducts = createLazyWithRetry(() => import('@/pages/AdminProducts'), "AdminProducts");
const AdminUsers = createLazyWithRetry(() => import('@/pages/AdminUsers'), "AdminUsers");
const AdminLogs = createLazyWithRetry(() => import('@/pages/AdminLogs'), "AdminLogs");
const AdminSellers = createLazyWithRetry(() => import('@/pages/AdminSellers'), "AdminSellers");
const AdminSellerReports = createLazyWithRetry(() => import('@/pages/AdminSellerReports'), "AdminSellerReports");
const AdminIdentityVerification = createLazyWithRetry(() => import('@/pages/AdminIdentityVerification'), "AdminIdentityVerification");
const AdminPaymentApprovals = createLazyWithRetry(() => import('@/pages/AdminPaymentApprovals'), "AdminPaymentApprovals");

// Partner pages - lazy load with retry
const PartnersApply = createLazyWithRetry(() => import('@/pages/PartnersApply'), "PartnersApply");
const PartnersPortal = createLazyWithRetry(() => import('@/pages/PartnersPortal'), "PartnersPortal");
const AdminPartners = createLazyWithRetry(() => import('@/pages/AdminPartners'), "AdminPartners");

// Developer Routes
const DevRoutes = createLazyWithRetry(() => import('@/pages/DevRoutes'), "DevRoutes");

// Fallback component otimizado
const PageFallback = ({ variant = 'dashboard' }: { variant?: 'dashboard' | 'settings' | 'financial' | 'sales' }) => (
  <div className="min-h-screen bg-background">
    <PageSkeleton variant={variant} />
  </div>
);

// Componente de erro boundary
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Oops! Algo deu errado</h2>
      <p className="text-muted-foreground">Erro: {error.message}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Recarregar página
      </button>
    </div>
  </div>
);

// HOC para lazy loading com error boundary e retry
const withLazyLoading = (Component: React.LazyExoticComponent<any>, fallbackVariant?: string) => {
  return React.memo((props: any) => (
    <Suspense 
      fallback={<PageFallback variant={fallbackVariant as any} />}
    >
      <Component {...props} />
    </Suspense>
  ));
};

// Exportar componentes otimizados
export const OptimizedRoutes = {
  Index: withLazyLoading(Index),
  Auth: withLazyLoading(Auth, 'settings'),
  Checkout: React.lazy(CheckoutDirect), // Sem suspense wrapper para ser instantâneo
  CheckoutSuccess: withLazyLoading(CheckoutSuccess),
  ThankYou: withLazyLoading(ThankYou),
  NotFound: withLazyLoading(NotFound),
  HowItWorks: withLazyLoading(HowItWorks),
  Pricing: withLazyLoading(Pricing),
  Features: withLazyLoading(Features),
  HelpCenter: withLazyLoading(HelpCenter),
  Contact: withLazyLoading(Contact),
  Status: withLazyLoading(Status),
  Privacy: withLazyLoading(Privacy),
  Terms: withLazyLoading(Terms),
  Cookies: withLazyLoading(Cookies),
  Apps: withLazyLoading(Apps, 'settings'),
  ResetPassword: withLazyLoading(ResetPassword, 'settings'),
  MinhasCompras: withLazyLoading(MinhasCompras, 'dashboard'),
  MeusAfiliados: withLazyLoading(MeusAfiliados, 'dashboard'),
  UserIdentity: withLazyLoading(UserIdentity, 'settings'),
  Mobile: withLazyLoading(Mobile, 'dashboard'),
  KambaPay: withLazyLoading(KambaPay, 'settings'),
  SalesRecovery: withLazyLoading(SalesRecovery, 'dashboard'),
  
  SellerDashboard: withLazyLoading(SellerDashboard, 'dashboard'),
  AdminLogin: withLazyLoading(AdminLogin, 'settings'),
  AdminDashboard: withLazyLoading(AdminDashboard, 'dashboard'),
  AdminWithdrawals: withLazyLoading(AdminWithdrawals, 'financial'),
  AdminProducts: withLazyLoading(AdminProducts, 'sales'),
  AdminUsers: withLazyLoading(AdminUsers, 'dashboard'),
  AdminLogs: withLazyLoading(AdminLogs, 'dashboard'),
  AdminSellers: withLazyLoading(AdminSellers, 'dashboard'),
  AdminSellerReports: withLazyLoading(AdminSellerReports, 'dashboard'),
  AdminIdentityVerification: withLazyLoading(AdminIdentityVerification, 'dashboard'),
  AdminPaymentApprovals: withLazyLoading(AdminPaymentApprovals, 'financial'),
  
  // Partner routes
  PartnersApply: withLazyLoading(PartnersApply, 'settings'),
  PartnersPortal: withLazyLoading(PartnersPortal, 'dashboard'),
  AdminPartners: withLazyLoading(AdminPartners, 'dashboard'),
  
  // Developer routes
  DevRoutes: withLazyLoading(DevRoutes, 'dashboard'),
  
  // Test pages
  
  // Member Area pages
  MemberArea: withLazyLoading(MemberArea, 'member-area'),
  MemberAreaContent: withLazyLoading(MemberAreaContent, 'member-area'),
  MemberAreaSupportMaterials: withLazyLoading(MemberAreaSupportMaterials, 'member-area'),
  MemberAreaAbout: withLazyLoading(MemberAreaAbout, 'member-area'),
  MemberAreaMyCourses: withLazyLoading(MemberAreaMyCourses, 'member-area'),
  MemberAreaSupport: withLazyLoading(MemberAreaSupport, 'member-area'),
  MemberAreaHelp: withLazyLoading(MemberAreaHelp, 'member-area'),
  MemberAreaLogin: withLazyLoading(MemberAreaLogin, 'member-area'),
  MemberAreaLoginWrapper: withLazyLoading(MemberAreaLoginWrapper, 'member-area'),
  ProtectedMemberAreaRoute: withLazyLoading(ProtectedMemberAreaRoute, 'member-area'),
  ModuleDetail: withLazyLoading(ModuleDetail, 'member-area'),
  LessonDetail: withLazyLoading(LessonDetail, 'member-area'),
};