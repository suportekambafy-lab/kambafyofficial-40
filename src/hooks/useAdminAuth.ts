
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdminUser } from '@/types/admin';

interface AdminAuthContextType {
  admin: AdminUser | null;
  login: (email: string, password: string) => Promise<{ error?: string; requires2FA?: boolean }>;
  logout: () => Promise<void>;
  loading: boolean;
  loginStep: 'credentials' | 'awaiting_2fa';
  completeAdminLogin: () => Promise<void>;
  cancelAdminLogin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

export const useAdminAuthHook = () => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginStep, setLoginStep] = useState<'credentials' | 'awaiting_2fa'>('credentials');
  const [pendingLoginData, setPendingLoginData] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    checkAdminSession();
    
    // Verificar e atualizar dados do admin a cada 30 segundos
    const interval = setInterval(async () => {
      const adminData = localStorage.getItem('admin_session');
      if (adminData) {
        const parsedAdmin = JSON.parse(adminData);
        
        // Buscar dados atualizados do banco
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', parsedAdmin.email)
          .single();
        
        if (data && !error) {
          // Verificar se o role mudou
          if (data.role !== parsedAdmin.role || data.is_active !== parsedAdmin.is_active) {
            console.log('🔄 Atualizando dados do admin:', {
              oldRole: parsedAdmin.role,
              newRole: data.role,
              oldActive: parsedAdmin.is_active,
              newActive: data.is_active
            });
            
            const updatedAdmin: AdminUser = {
              id: data.id,
              email: data.email,
              full_name: data.full_name,
              role: data.role,
              is_active: data.is_active,
              created_at: data.created_at,
              updated_at: data.updated_at
            };
            
            setAdmin(updatedAdmin);
            localStorage.setItem('admin_session', JSON.stringify(updatedAdmin));
          }
        }
      }
    }, 30000); // Verificar a cada 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  const checkAdminSession = async () => {
    try {
      console.log('🔍 [ADMIN-AUTH] Checking admin session...');
      
      // Verificar sessão do Supabase Auth
      const { data: authData } = await supabase.auth.getSession();
      console.log('🔍 [ADMIN-AUTH] Supabase Auth session:', {
        hasSession: !!authData.session,
        userEmail: authData.session?.user?.email,
        userId: authData.session?.user?.id
      });
      
      const adminData = localStorage.getItem('admin_session');
      console.log('🔍 [ADMIN-AUTH] Admin session no localStorage:', {
        hasData: !!adminData,
        data: adminData ? JSON.parse(adminData) : null
      });
      
      if (adminData) {
        const parsedAdmin = JSON.parse(adminData);
        console.log('✅ [ADMIN-AUTH] Admin session encontrada:', parsedAdmin);
        
        // Buscar dados atualizados do banco para verificar se mudou
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', parsedAdmin.email)
          .single();
        
        console.log('🔍 [ADMIN-AUTH] Dados do banco:', { data, error });
        
        if (data && !error) {
          // Verificar se admin está ativo
          if (!data.is_active) {
            console.log('⚠️ [ADMIN-AUTH] Admin desativado, fazendo logout');
            localStorage.removeItem('admin_session');
            localStorage.removeItem('admin_jwt');
            setAdmin(null);
            return;
          }
          
          // Verificar se o role mudou
          if (data.role !== parsedAdmin.role) {
            console.log('🔄 [ADMIN-AUTH] Role atualizado detectado:', {
              oldRole: parsedAdmin.role,
              newRole: data.role
            });
            
            const updatedAdmin: AdminUser = {
              id: data.id,
              email: data.email,
              full_name: data.full_name,
              role: data.role,
              is_active: data.is_active,
              created_at: data.created_at,
              updated_at: data.updated_at
            };
            
            setAdmin(updatedAdmin);
            localStorage.setItem('admin_session', JSON.stringify(updatedAdmin));
          } else {
            console.log('✅ [ADMIN-AUTH] Admin setado:', parsedAdmin);
            setAdmin(parsedAdmin);
          }
        } else {
          // Admin não existe mais no banco - fazer logout
          console.log('❌ [ADMIN-AUTH] Admin não existe mais no banco, fazendo logout');
          localStorage.removeItem('admin_session');
          localStorage.removeItem('admin_jwt');
          setAdmin(null);
        }
      } else {
        console.log('❌ [ADMIN-AUTH] Nenhuma sessão admin encontrada');
      }
    } catch (error) {
      console.error('❌ [ADMIN-AUTH] Error checking admin session:', error);
      localStorage.removeItem('admin_session');
    } finally {
      console.log('🏁 [ADMIN-AUTH] Loading concluído');
      setLoading(false);
    }
  };

  const send2FACode = async (email: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: {
          email,
          event_type: 'admin_login',
          user_email: email
        }
      });
      
      if (error) {
        console.error('Erro ao enviar código 2FA:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar 2FA:', error);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🚀 [ADMIN-LOGIN] Tentando login admin com:', { email });
      
      // ✅ FASE 1: Autenticação via edge function (sem credenciais hardcoded)
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { email, password }
      });

      console.log('📥 [ADMIN-LOGIN] Resposta da edge function:', { data, error });

      if (error) {
        console.error('❌ [ADMIN-LOGIN] Erro na edge function admin-login:', error);
        return { error: 'Erro ao fazer login' };
      }

      if (data?.requires2FA) {
        console.log('🔐 [ADMIN-LOGIN] 2FA requerido');
        // 2FA solicitado, armazenar dados pendentes
        setPendingLoginData({ email, password });
        setLoginStep('awaiting_2fa');
        return { requires2FA: true };
      }

      if (data?.error) {
        console.log('❌ [ADMIN-LOGIN] Erro retornado:', data.error);
        return { error: data.error };
      }

      // Se chegou aqui com sucesso e JWT, logar diretamente
      if (data?.success && data?.jwt && data?.admin) {
        console.log('✅ [ADMIN-LOGIN] Login customizado bem-sucedido, autenticando no Supabase Auth...');
        
        // ✅ CRÍTICO: Fazer login também no Supabase Auth para que as RLS policies funcionem
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        console.log('🔐 [ADMIN-LOGIN] Resultado Supabase Auth:', {
          hasSession: !!authData?.session,
          userEmail: authData?.user?.email,
          error: authError?.message
        });

        if (authError) {
          console.error('⚠️ [ADMIN-LOGIN] Erro ao autenticar no Supabase Auth:', authError);
          // Continuar mesmo com erro, pois o admin já foi autenticado no sistema customizado
        } else {
          console.log('✅ [ADMIN-LOGIN] Admin autenticado no Supabase Auth com sucesso!');
        }

        const adminUser: AdminUser = {
          id: data.admin.id,
          email: data.admin.email,
          full_name: data.admin.full_name,
          role: data.admin.role || 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('💾 [ADMIN-LOGIN] Salvando admin no estado e localStorage:', adminUser);
        setAdmin(adminUser);
        localStorage.setItem('admin_session', JSON.stringify(adminUser));
        localStorage.setItem('admin_jwt', data.jwt);
        
        setPendingLoginData(null);
        setLoginStep('credentials');
        
        console.log('✅ [ADMIN-LOGIN] Login completo!');
        return { success: true };
      }

      console.log('❌ [ADMIN-LOGIN] Resposta inválida do servidor');
      return { error: 'Resposta inválida do servidor' };
    } catch (error) {
      console.error('❌ [ADMIN-LOGIN] Erro no login admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  };

  const completeAdminLogin = async () => {
    if (!pendingLoginData) {
      throw new Error('Nenhum login pendente encontrado');
    }

    // ✅ FASE 2: Completar login após 2FA já verificado
    const { data, error } = await supabase.functions.invoke('admin-login', {
      body: {
        email: pendingLoginData.email,
        password: pendingLoginData.password,
        codeAlreadyVerified: true // Código já foi verificado no frontend
      }
    });

    if (error || !data?.success) {
      throw new Error(data?.error || 'Erro ao completar login');
    }

    // ✅ CRÍTICO: Fazer login também no Supabase Auth para que as RLS policies funcionem
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: pendingLoginData.email,
      password: pendingLoginData.password
    });

    if (authError) {
      console.error('⚠️ Erro ao autenticar no Supabase Auth:', authError);
      // Continuar mesmo com erro, pois o admin já foi autenticado no sistema customizado
    } else {
      console.log('✅ Admin autenticado no Supabase Auth após 2FA');
    }

    // Criar sessão admin com dados do JWT
    const adminUser: AdminUser = {
      id: data.admin.id,
      email: data.admin.email,
      full_name: data.admin.full_name,
      role: data.admin.role || 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Admin logado com 2FA:', adminUser);
    setAdmin(adminUser);
    localStorage.setItem('admin_session', JSON.stringify(adminUser));
    localStorage.setItem('admin_jwt', data.jwt);
    
    // Limpar dados pendentes
    setPendingLoginData(null);
    setLoginStep('credentials');
  };

  const cancelAdminLogin = () => {
    setPendingLoginData(null);
    setLoginStep('credentials');
  };

  const logout = async () => {
    // Fazer logout também do Supabase Auth
    await supabase.auth.signOut();
    
    setAdmin(null);
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_jwt'); // Limpar JWT também
    localStorage.removeItem('impersonation_data'); // Limpar impersonation
    setPendingLoginData(null);
    setLoginStep('credentials');
    
    // Redirecionar para login admin
    window.location.href = '/admin/login';
  };

  return { 
    admin, 
    login, 
    logout, 
    loading,
    loginStep,
    completeAdminLogin,
    cancelAdminLogin
  };
};

export { AdminAuthContext };
