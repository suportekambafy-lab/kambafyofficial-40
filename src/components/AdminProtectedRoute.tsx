import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/hooks/use-toast';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { admin, loading, loginStep } = useAdminAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [checkingImpersonation, setCheckingImpersonation] = useState(true);

  useEffect(() => {
    const impersonationData = localStorage.getItem('impersonation_data');
    if (impersonationData) {
      try {
        const data = JSON.parse(impersonationData);
        const expiresAt = new Date(data.expiresAt).getTime();
        const now = Date.now();
        
        // Se impersonation ainda está ativa (não expirou)
        if (expiresAt > now) {
          console.log('🎭 [ADMIN-PROTECTED] Impersonation ativa detectada, redirecionando...');
          setIsImpersonating(true);
        } else {
          // Impersonation expirou, limpar
          localStorage.removeItem('impersonation_data');
          setIsImpersonating(false);
        }
      } catch (error) {
        console.error('Erro ao verificar impersonation:', error);
        localStorage.removeItem('impersonation_data');
        setIsImpersonating(false);
      }
    } else {
      setIsImpersonating(false);
    }
    setCheckingImpersonation(false);
  }, [location.pathname]);

  // Se está impersonando, redirecionar para área do vendedor
  if (isImpersonating) {
    toast({
      title: '🎭 Impersonation ativa',
      description: 'Você está no modo impersonation. Clique em "Sair" no banner para voltar ao painel admin.',
      variant: 'default'
    });
    return <Navigate to="/vendedor" replace />;
  }

  if (loading || checkingImpersonation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-checkout-green"></div>
      </div>
    );
  }

  // Se não tem admin ou está aguardando 2FA, redirecionar para login
  if (!admin || loginStep === 'awaiting_2fa') {
    console.log('❌ [ADMIN-PROTECTED-ROUTE] Acesso negado, redirecionando para /admin/login');
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}