
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ModernSidebar } from '@/components/modern/ModernSidebar';
import { ModernTopBar } from '@/components/modern/ModernTopBar';
import { ModernDashboardHome } from '@/components/modern/ModernDashboardHome';
import { SellerThemeProvider, useSellerTheme } from '@/hooks/useSellerTheme';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { SkeletonPage } from '@/components/ui/skeleton-page';
import { ModernErrorBoundary } from '@/components/modern/ModernErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { CrispChat } from '@/components/CrispChat';
import { UpgradeBanner } from '@/components/ui/upgrade-banner';

// Lazy load páginas para melhor performance com retry logic
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

const Products = createLazyWithRetry(() => import("./Products"), "Products");
const Sales = createLazyWithRetry(() => import("./Sales"), "Sales"); 
const Financial = createLazyWithRetry(() => import("./Financial"), "Financial");
const SellerHelp = createLazyWithRetry(() => import("./SellerHelp"), "SellerHelp");
const ComingSoon = createLazyWithRetry(() => import("./ComingSoon"), "ComingSoon");
const KambaExtra = createLazyWithRetry(() => import("./KambaExtra"), "KambaExtra");
const MeusAfiliados = createLazyWithRetry(() => import("./MeusAfiliados"), "MeusAfiliados");
const Apps = createLazyWithRetry(() => import("./Apps"), "Apps");
const UserSettings = createLazyWithRetry(() => import("./UserSettings"), "UserSettings");
const Members = createLazyWithRetry(() => import("./Members"), "Members");
const SellerMemberModulePayments = createLazyWithRetry(() => import("./SellerMemberModulePayments"), "SellerMemberModulePayments");

function SellerDashboardContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, isMobile, sidebarOpen, toggleSidebarOpen, closeSidebar } = useSidebar();
  const { theme } = useSellerTheme();
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <div className={`min-h-screen bg-background seller-dashboard ${theme === 'dark' ? 'dark' : ''}`}>
        <CrispChat />
        
        {/* Banner de Manutenção - Fixed no Topo Acima de Tudo */}
        {bannerVisible && (
          <div className="fixed top-0 left-0 right-0 w-full border-b bg-background py-2 z-[60]">
            <UpgradeBanner
              buttonText="Manutenção em Andamento"
              description="Sistema de saques temporariamente indisponível. Seu saldo está seguro! 🔒"
              onClose={() => setBannerVisible(false)}
            />
          </div>
        )}
        
        {/* Espaçamento para o banner quando visível */}
        {bannerVisible && <div className="h-[51px]" />}
        
        <div className="flex flex-1 min-h-0">
          {/* Backdrop para mobile */}
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              onClick={closeSidebar}
            />
          )}

          {/* Sidebar */}
          <ModernSidebar 
            collapsed={isMobile ? false : collapsed}
            onToggle={toggleSidebarOpen}
            isMobile={isMobile}
            isOpen={isMobile ? sidebarOpen : true}
            onClose={closeSidebar}
          />
          
          {/* Main content container */}
          <div 
            className={`
              flex-1 flex flex-col
              ${isMobile ? 'ml-0' : (collapsed ? 'ml-20' : 'ml-80')}
            `}
          >
            {/* Top bar */}
            <ModernTopBar 
              sidebarCollapsed={collapsed} 
              onToggleSidebar={toggleSidebarOpen}
              isMobile={isMobile}
            />
          
          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<SkeletonPage variant="dashboard" />}>
              <Routes>
                <Route path="/" element={<ModernDashboardHome />} />
                <Route path="/produtos" element={<Products />} />
                <Route path="/vendas" element={<Sales />} />
                <Route path="/financeiro" element={<Financial />} />
                <Route path="/ajuda" element={<SellerHelp />} />
                <Route path="/configuracoes" element={<UserSettings />} />
                <Route path="/membros" element={<Members />} />
                <Route path="/membros/pagamentos" element={<SellerMemberModulePayments />} />
                <Route path="/marketplace" element={<KambaExtra />} />
                <Route path="/afiliados" element={<MeusAfiliados />} />
                <Route path="/assinaturas" element={<ComingSoon title="Assinaturas" description="O sistema de assinaturas estará disponível em breve para criar produtos recorrentes." />} />
                <Route path="/relatorios" element={<ComingSoon title="Relatórios" description="Os relatórios detalhados estarão disponíveis em breve para análise avançada." />} />
                <Route path="/colaboradores" element={<ComingSoon title="Colaboradores" description="O sistema de colaboradores estará disponível em breve para trabalho em equipe." />} />
                <Route path="/apps" element={<Apps />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        </div>
    </div>
  );
}

export default function SellerDashboard() {
  return (
    <ProtectedRoute>
      <ModernErrorBoundary>
        <SellerThemeProvider>
          <SidebarProvider>
            <SellerDashboardContent />
          </SidebarProvider>
        </SellerThemeProvider>
      </ModernErrorBoundary>
    </ProtectedRoute>
  );
}
