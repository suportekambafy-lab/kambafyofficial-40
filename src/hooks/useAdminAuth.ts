
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
          context: 'admin_login'
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
      
      // Verificar credenciais hardcoded
      if (email !== 'suporte@kambafy.com' || password !== 'Kambafy2025@') {
        return { error: 'Email ou senha incorretos' };
      }

      // Credenciais válidas - agora enviar 2FA
      const codeSuccess = await send2FACode(email);
      if (!codeSuccess) {
        return { error: 'Falha ao enviar código de verificação' };
      }

      // Armazenar dados do login pendente
      setPendingLoginData({ email, password });
      setLoginStep('awaiting_2fa');
      
      return { requires2FA: true };
    } catch (error) {
      console.error('Erro no login admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  };

  const completeAdminLogin = async () => {
    if (!pendingLoginData) {
      throw new Error('Nenhum login pendente encontrado');
    }

    // Criar sessão admin
    const adminUser: AdminUser = {
      id: crypto.randomUUID(),
      email: 'suporte@kambafy.com',
      full_name: 'Administrador Kambafy',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Admin logado com 2FA:', adminUser);
    setAdmin(adminUser);
    localStorage.setItem('admin_session', JSON.stringify(adminUser));
    
    // Limpar dados pendentes
    setPendingLoginData(null);
    setLoginStep('credentials');
  };

  const cancelAdminLogin = () => {
    setPendingLoginData(null);
    setLoginStep('credentials');
  };

  const logout = async () => {
    setAdmin(null);
    localStorage.removeItem('admin_session');
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
