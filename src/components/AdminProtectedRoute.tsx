import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { admin, loading, loginStep } = useAdminAuth();

  console.log('🛡️ [ADMIN-PROTECTED-ROUTE] Verificando acesso:', {
    hasAdmin: !!admin,
    adminEmail: admin?.email,
    adminRole: admin?.role,
    loading,
    loginStep,
    localStorage_admin: localStorage.getItem('admin_session'),
    localStorage_jwt: localStorage.getItem('admin_jwt')
  });

  if (loading) {
    console.log('⏳ [ADMIN-PROTECTED-ROUTE] Loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-checkout-green"></div>
      </div>
    );
  }

  // Se não tem admin ou está aguardando 2FA, redirecionar para login
  if (!admin || loginStep === 'awaiting_2fa') {
    console.log('❌ [ADMIN-PROTECTED-ROUTE] Acesso negado, redirecionando para /admin/login', {
      reason: !admin ? 'no admin' : 'awaiting 2FA'
    });
    return <Navigate to="/admin/login" replace />;
  }

  console.log('✅ [ADMIN-PROTECTED-ROUTE] Acesso permitido!');
  return <>{children}</>;
}