import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { admin, loading: authLoading, loginStep } = useAdminAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionsTimestamp, setPermissionsTimestamp] = useState<string | null>(() =>
    localStorage.getItem('admin_permissions_timestamp')
  );

  const triggerRevalidation = () => {
    const ts = new Date().toISOString();
    localStorage.setItem('admin_permissions_timestamp', ts);
    setPermissionsTimestamp(ts);
    setHasPermission(null);
    setLoading(true);
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'admin_permissions_timestamp') return;
      setPermissionsTimestamp(e.newValue);
      setHasPermission(null);
      setLoading(true);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    async function checkPermission() {
      setHasPermission(null);
      setLoading(true);

      console.log('🔐 [ADMIN-PERMISSION-ROUTE] Iniciando verificação de permissões');
      
      if (!admin) {
        console.log('⚠️ [ADMIN-PERMISSION-ROUTE] Admin não encontrado');
        setLoading(false);
        return;
      }

      console.log('🔐 [ADMIN-PERMISSION-ROUTE] Verificando permissões:', {
        adminEmail: admin.email,
        adminId: admin.id,
        requiredPermission,
        requireSuperAdmin
      });

      try {
        // CRÍTICO: Sempre validar role no servidor em vez de confiar no localStorage
        const { data: serverRole, error: roleError } = await supabase
          .rpc('get_admin_role', { admin_email: admin.email });
        
        if (roleError) {
          console.error('❌ [ADMIN-PERMISSION-ROUTE] Erro ao verificar role no servidor:', roleError);
          setHasPermission(false);
          setLoading(false);
          return;
        }

        const isSuperAdmin = serverRole === 'super_admin';
        
        if (isSuperAdmin) {
          console.log('✅ [ADMIN-PERMISSION-ROUTE] Super admin detectado (validado pelo servidor)');
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

        // Verificar se o admin tem a permissão específica usando RPC para bypassar RLS
        const permissionAliases: Record<string, string[]> = {
          // Compatibilidade (permissões antigas vs novas) - dois sentidos
          manage_users: ['users'],
          users: ['manage_users'],

          manage_products: ['products'],
          products: ['manage_products'],

          manage_verifications: ['identity_verification'],
          identity_verification: ['manage_verifications'],

          view_analytics: ['analytics'],
          analytics: ['view_analytics'],

          // Páginas financeiras (compatibilidade)
          manage_withdrawals: ['manage_transactions', 'orders'],
          manage_transfers: ['manage_transactions', 'orders'],
          manage_transactions: ['manage_withdrawals', 'manage_transfers', 'orders'],
        };

        const permissionsToCheck = Array.from(
          new Set([requiredPermission, ...(permissionAliases[requiredPermission] ?? [])])
        );

        console.log('🔍 [ADMIN-PERMISSION-ROUTE] Buscando permissões do admin usando RPC...', {
          permissionsToCheck,
        });

        const results = await Promise.all(
          permissionsToCheck.map((permission) =>
            supabase.rpc('admin_has_permission', {
              admin_email: admin.email,
              required_permission: permission,
            })
          )
        );

        console.log('📋 [ADMIN-PERMISSION-ROUTE] Resultado da(s) RPC(s):', results);

        const hasAccess = results.some(({ data, error }) => {
          if (error) {
            console.error('❌ [ADMIN-PERMISSION-ROUTE] Erro ao verificar permissão:', error);
            return false;
          }
          return data === true;
        });

        console.log(
          hasAccess
            ? '✅ [ADMIN-PERMISSION-ROUTE] Permissão encontrada'
            : '❌ [ADMIN-PERMISSION-ROUTE] Permissão não encontrada'
        );

        setHasPermission(hasAccess);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Acesso Negado</CardTitle>
              <CardDescription className="text-base">
                Você não tem permissão para acessar esta página
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {requireSuperAdmin 
                  ? 'Esta página requer privilégios de Super Admin.'
                  : `Esta página requer a permissão: ${requiredPermission}`
                }
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Entre em contato com um Super Admin para solicitar acesso.
              </p>

              <Button onClick={triggerRevalidation} variant="outline" className="w-full">
                Revalidar permissões
              </Button>

              <div className="flex gap-2">
                <Button 
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={() => navigate('/admin')}
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
