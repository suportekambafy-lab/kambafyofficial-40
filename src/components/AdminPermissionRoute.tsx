import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminPermissionRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requireSuperAdmin?: boolean;
}

export default function AdminPermissionRoute({ 
  children, 
  requiredPermission,
  requireSuperAdmin = false 
}: AdminPermissionRouteProps) {
  const { admin, loading: authLoading, loginStep } = useAdminAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (!admin) {
        setLoading(false);
        return;
      }

      // Super admins têm acesso a tudo
      if ((admin as any).role === 'super_admin') {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // Se requer super admin e não é super admin, negar acesso
      if (requireSuperAdmin && (admin as any).role !== 'super_admin') {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      // Se não há permissão específica requerida, permitir acesso
      if (!requiredPermission) {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // Verificar se o admin tem a permissão específica
      try {
        const { data, error } = await supabase
          .from('admin_permissions')
          .select('permission')
          .eq('admin_id', admin.id)
          .eq('permission', requiredPermission)
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar permissão:', error);
          setHasPermission(false);
        } else {
          setHasPermission(!!data);
        }
      } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [admin, requiredPermission, requireSuperAdmin]);

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-checkout-green"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!admin || loginStep === 'awaiting_2fa') {
    return <Navigate to="/admin/login" replace />;
  }

  // Show access denied if no permission
  if (hasPermission === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Acesso Negado</CardTitle>
            <CardDescription className="text-base">
              Você não tem permissão para acessar esta página
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              {requireSuperAdmin 
                ? 'Esta página requer privilégios de Super Admin.'
                : `Esta página requer a permissão: ${requiredPermission}`
              }
            </p>
            <p className="text-sm text-gray-600 text-center">
              Entre em contato com um Super Admin para solicitar acesso.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={() => window.location.href = '/admin'}
                className="flex-1"
              >
                Ir para Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}
