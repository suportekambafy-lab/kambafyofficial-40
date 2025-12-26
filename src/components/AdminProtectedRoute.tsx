import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

function readImpersonationActive(): boolean {
  const impersonationData = localStorage.getItem('impersonation_data');
  if (!impersonationData) return false;

  try {
    const data = JSON.parse(impersonationData);
    const expiresAt = new Date(data.expiresAt).getTime();
    const now = Date.now();

    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      localStorage.removeItem('impersonation_data');
      return false;
    }

    return true;
  } catch {
    localStorage.removeItem('impersonation_data');
    return false;
  }
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { admin, loading, loginStep } = useAdminAuth();
  const location = useLocation();
  const [isImpersonating, setIsImpersonating] = useState(readImpersonationActive);

  useEffect(() => {
    setIsImpersonating(readImpersonationActive());
  }, [location.pathname]);

  // Se está impersonando, não deixar acessar rotas /admin
  if (isImpersonating) {
    return <Navigate to="/vendedor" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-checkout-green"></div>
      </div>
    );
  }

  // Se não tem admin ou está aguardando 2FA, redirecionar para login
  if (!admin || loginStep === 'awaiting_2fa') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
