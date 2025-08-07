
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdminUser } from '@/types/admin';

interface AdminAuthContextType {
  admin: AdminUser | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
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

  const login = async (email: string, password: string) => {
    try {
      console.log('Tentando login admin com:', { email });
      
      // Verificar credenciais hardcoded
      if (email !== 'suporte@kambafy.com' || password !== 'Kambafy2025@') {
        return { error: 'Email ou senha incorretos' };
      }

      // Criar sessão admin diretamente
      const adminUser: AdminUser = {
        id: crypto.randomUUID(),
        email: 'suporte@kambafy.com',
        full_name: 'Administrador Kambafy',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Admin criado:', adminUser);
      setAdmin(adminUser);
      localStorage.setItem('admin_session', JSON.stringify(adminUser));
      return {};
    } catch (error) {
      console.error('Erro no login admin:', error);
      return { error: 'Erro interno do sistema' };
    }
  };

  const logout = async () => {
    setAdmin(null);
    localStorage.removeItem('admin_session');
    
    // Redirecionar para login admin
    window.location.href = '/admin/login';
  };

  return { admin, login, logout, loading };
};

export { AdminAuthContext };
