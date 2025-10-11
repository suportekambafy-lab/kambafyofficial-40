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
  const [permissionsTimestamp, setPermissionsTimestamp] = useState<string | null>(null);

  useEffect(() => {
    // Verificar timestamp para forçar revalidação
    const timestamp = localStorage.getItem('admin_permissions_timestamp');
    if (timestamp !== permissionsTimestamp) {
      console.log('🔄 [ADMIN-PERMISSION-ROUTE] Novo timestamp detectado, forçando revalidação');
      setPermissionsTimestamp(timestamp);
      setHasPermission(null);
      setLoading(true);
    }
  }, [admin]);

  useEffect(() => {
    async function checkPermission() {
      console.log('🔐 [ADMIN-PERMISSION-ROUTE] Iniciando verificação de permissões');
      
      if (!admin) {
        console.log('⚠️ [ADMIN-PERMISSION-ROUTE] Admin não encontrado');
        setLoading(false);
        return;
      }

      console.log('🔐 [ADMIN-PERMISSION-ROUTE] Verificando permissões:', {
        adminEmail: admin.email,
        adminRole: (admin as any).role,
        adminId: admin.id,
        requiredPermission,
        requireSuperAdmin
      });

      // CRITICAL: Super admins SEMPRE têm acesso a tudo
      const isSuperAdmin = (admin as any).role === 'super_admin';
      if (isSuperAdmin) {
        console.log('✅ [ADMIN-PERMISSION-ROUTE] Super admin detectado - acesso total concedido');
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // Se requer super admin e não é super admin, negar acesso
      if (requireSuperAdmin) {
        console.log('❌ [ADMIN-PERMISSION-ROUTE] Página requer super admin e usuário não é super admin');
        setHasPermission(false);
        setLoading(false);
        return;
      }

      // Se não há permissão específica requerida, permitir acesso
      if (!requiredPermission) {
        console.log('✅ [ADMIN-PERMISSION-ROUTE] Nenhuma permissão específica requerida - acesso concedido');
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // Verificar se o admin tem a permissão específica
      try {
        console.log('🔍 [ADMIN-PERMISSION-ROUTE] Buscando permissões do admin no banco...');
        const { data, error } = await supabase
          .from('admin_permissions')
          .select('permission')
          .eq('admin_id', admin.id)
          .eq('permission', requiredPermission)
          .maybeSingle();

        console.log('📋 [ADMIN-PERMISSION-ROUTE] Resultado da busca:', { data, error });

        if (error) {
          console.error('❌ [ADMIN-PERMISSION-ROUTE] Erro ao verificar permissão:', error);
          setHasPermission(false);
        } else {
          const hasAccess = !!data;
          console.log(hasAccess ? '✅ [ADMIN-PERMISSION-ROUTE] Permissão encontrada' : '❌ [ADMIN-PERMISSION-ROUTE] Permissão não encontrada');
          setHasPermission(hasAccess);
        }
      } catch (error) {
        console.error('❌ [ADMIN-PERMISSION-ROUTE] Erro ao verificar permissão:', error);
        setHasPermission(false);
      } finally {
        console.log('🏁 [ADMIN-PERMISSION-ROUTE] Verificação concluída, loading = false');
        setLoading(false);
      }
    }

    checkPermission();
  }, [admin, requiredPermission, requireSuperAdmin, permissionsTimestamp]);

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-checkout-green"></div>
      </div>
    );
  }

  // Log do estado atual para debug
  console.log('🔍 [ADMIN-PERMISSION-ROUTE] Estado atual:', {
    hasAdmin: !!admin,
    adminEmail: admin?.email,
    adminRole: admin ? (admin as any).role : null,
    adminId: admin?.id,
    hasPermission,
    requiredPermission,
    requireSuperAdmin,
    loginStep,
    authLoading,
    loading
  });

  // Redirect to login if not authenticated
  if (!admin || loginStep === 'awaiting_2fa') {
    console.log('❌ [ADMIN-PERMISSION-ROUTE] Redirecionando para login:', {
      reason: !admin ? 'sem admin' : 'aguardando 2FA'
    });
    return <Navigate to="/admin/login" replace />;
  }

  // Show access denied if no permission
  if (hasPermission === false) {
    console.log('❌ [ADMIN-PERMISSION-ROUTE] Acesso negado - exibindo tela de erro');
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
