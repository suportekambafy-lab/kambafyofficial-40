
import React, { useState, useEffect } from 'react';
import { MobileLoginChoice } from '@/components/mobile/MobileLoginChoice';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';
import Auth from './Auth';
import MinhasCompras from './MinhasCompras';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ModernErrorBoundary } from '@/components/modern/ModernErrorBoundary';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

const Mobile = () => {
  const [userType, setUserType] = useState<'customer' | 'seller' | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const { user, loading } = useAuth();
  const { authReady, isAuthenticated } = useAuthGuard();

  // PWA Error boundary fallback
  const ErrorFallback = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm bg-card border border-border rounded-lg p-6 text-center shadow-lg">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Algo deu errado</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Ocorreu um erro inesperado. Tente uma das opções abaixo.
        </p>
        <div className="space-y-3">
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            🔄 Tentar Novamente
          </button>
          <button 
            onClick={() => window.location.href = '/'} 
            className="w-full bg-muted text-muted-foreground py-3 px-4 rounded-lg font-medium hover:bg-muted/80 transition-colors"
          >
            🏠 Ir para Início
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (isAuthenticated && user) {
      const storedUserType = localStorage.getItem('userType') as 'customer' | 'business' | null;
      if (storedUserType === 'business') {
        setUserType('seller');
      } else if (storedUserType === 'customer') {
        setUserType('customer');
      }
    }
  }, [isAuthenticated, user]);

  // Loading enquanto verifica autenticação - PWA Optimized
  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-primary/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-primary/20">
            <span className="text-primary font-bold text-2xl">K</span>
          </div>
          <div className="space-y-2">
            <LoadingSpinner text="Carregando..." size="lg" />
            <p className="text-xs text-muted-foreground">Inicializando app...</p>
          </div>
        </div>
      </div>
    );
  }

  // PWA Content with Error Boundary
  return (
    <ModernErrorBoundary fallback={<ErrorFallback />}>
      <div className="min-h-screen bg-background">
        {/* PWA Status Bar Spacing for iOS */}
        <div className="safe-area-inset-top" />
        
        {!isAuthenticated ? (
          // Authentication Flow
          !userType ? (
            <MobileLoginChoice 
              onChoice={(type) => {
                setUserType(type);
                setShowAuth(true);
              }} 
            />
          ) : showAuth ? (
            <Auth />
          ) : (
            <MobileLoginChoice 
              onChoice={(type) => {
                setUserType(type);
                setShowAuth(true);
              }} 
            />
          )
        ) : (
          // Authenticated Content
          userType === 'seller' ? (
            <MobileDashboard />
          ) : userType === 'customer' ? (
            <MinhasCompras />
          ) : (
            <MobileLoginChoice 
              onChoice={(type) => {
                setUserType(type);
                setShowAuth(true);
              }} 
            />
          )
        )}
        
        {/* PWA Bottom Safe Area for iOS */}
        <div className="safe-area-inset-bottom" />
        
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </ModernErrorBoundary>
  );
};

export default Mobile;
