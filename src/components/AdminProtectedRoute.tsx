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