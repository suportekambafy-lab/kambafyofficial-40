
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdminUser } from '@/types/admin';

interface AdminAuthContextType {
  admin: AdminUser | null;
  login: (email: string, password: string) => Promise<{ error?: string; requires2FA?: boolean }>;
  logout: () => Promise<void>;
  loading: boolean;
  loginStep: 'credentials' | 'awaiting_2fa';
  completeAdminLogin: (verifiedCode: string) => Promise<{ success: boolean }>;
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
  const [pendingLoginData, setPendingLoginData] = useState<{ email: string; password: string; code?: string } | null>(null);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const adminData = localStorage.getItem('admin_session');
      if (adminData) {
        const parsedAdmin = JSON.parse(adminData);
        console.log('Admin session encontrada:', parsedAdmin);
        setAdmin(parsedAdmin);
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

  const completeAdminLogin = async (verifiedCode: string) => {
    if (!pendingLoginData) {
      throw new Error('Nenhum login pendente encontrado');
    }

    try {
      console.log('✅ Código 2FA já verificado, completando login...');
      
      // Código já foi verificado com sucesso, apenas gerar JWT agora
      const { data, error } = await supabase.functions.invoke('complete-admin-login', {
        body: { 
          email: pendingLoginData.email
        }
      });

      if (error) {
        console.error('Erro ao completar login:', error);
        throw new Error('Erro ao completar login');
      }

      if (data?.success && data?.jwt && data?.admin) {
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
        
        console.log('✅ Login admin completado com sucesso');
        return { success: true };
      }

      throw new Error(data?.error || 'Resposta inválida do servidor');
    } catch (error) {
      console.error('Erro ao completar login admin:', error);
      throw error;
    }
  };

  const cancelAdminLogin = () => {
    setPendingLoginData(null);
    setLoginStep('credentials');
  };

  const logout = async () => {
    setAdmin(null);
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_jwt');
    localStorage.removeItem('impersonation_data');
    setPendingLoginData(null);
    setLoginStep('credentials');
    
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
