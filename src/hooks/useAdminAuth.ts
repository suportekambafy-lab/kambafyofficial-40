
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
      const adminData = localStorage.getItem('admin_session');
      if (adminData) {
        const parsedAdmin = JSON.parse(adminData);
        console.log('Admin session encontrada:', parsedAdmin);
        
        // Buscar dados atualizados do banco para verificar se mudou
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', parsedAdmin.email)
          .single();
        
        if (data && !error) {
          // Verificar se o role mudou
          if (data.role !== parsedAdmin.role || data.is_active !== parsedAdmin.is_active) {
            console.log('🔄 Role atualizado detectado na inicialização:', {
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
            setAdmin(parsedAdmin);
          }
        } else {
          setAdmin(parsedAdmin);
        }
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
      localStorage.removeItem('admin_session');
    } finally {
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
      console.log('Tentando login admin com:', { email });
      
      // ✅ FASE 1: Autenticação via edge function (sem credenciais hardcoded)
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { email, password }
      });

      if (error) {
        console.error('Erro na edge function admin-login:', error);
        return { error: 'Erro ao fazer login' };
      }

      if (data?.requires2FA) {
        // 2FA solicitado, armazenar dados pendentes
        setPendingLoginData({ email, password });
        setLoginStep('awaiting_2fa');
        return { requires2FA: true };
      }

      if (data?.error) {
        return { error: data.error };
      }

      // Se chegou aqui com sucesso e JWT, logar diretamente
      if (data?.success && data?.jwt && data?.admin) {
        // ✅ CRÍTICO: Fazer login também no Supabase Auth para que as RLS policies funcionem
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) {
          console.error('⚠️ Erro ao autenticar no Supabase Auth:', authError);
          // Continuar mesmo com erro, pois o admin já foi autenticado no sistema customizado
        } else {
          console.log('✅ Admin autenticado no Supabase Auth');
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

        setAdmin(adminUser);
        localStorage.setItem('admin_session', JSON.stringify(adminUser));
        localStorage.setItem('admin_jwt', data.jwt);
        
        setPendingLoginData(null);
        setLoginStep('credentials');
        
        return { success: true };
      }

      return { error: 'Resposta inválida do servidor' };
    } catch (error) {
      console.error('Erro no login admin:', error);
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
