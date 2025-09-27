import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from '@/hooks/useCustomToast';
import { User, Session } from '@supabase/supabase-js';

interface MemberArea {
  id: string;
  name: string;
  description?: string;
  hero_title?: string;
  hero_description?: string;
  logo_url?: string;
  hero_image_url?: string;
}

interface ModernMembersAuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  memberArea: MemberArea | null;
  checkMemberAccess: (memberAreaId: string) => Promise<boolean>;
}

const ModernMembersAuthContext = createContext<ModernMembersAuthContextType | null>(null);

export function useModernMembersAuth(): ModernMembersAuthContextType {
  const context = useContext(ModernMembersAuthContext);
  if (!context) {
    throw new Error('useModernMembersAuth deve ser usado dentro de ModernMembersAuthProvider');
  }
  return context;
}

interface ModernMembersAuthProviderProps {
  children: ReactNode;
}

export function ModernMembersAuthProvider({ children }: ModernMembersAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useCustomToast();

  const isAuthenticated = Boolean(session?.user);

  // Configurar listener de autenticação do Supabase
  useEffect(() => {
    console.log('🔍 ModernAuth: Configurando listener de auth...');
    
    // Configurar listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 ModernAuth: Auth state changed:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📋 ModernAuth: Sessão inicial:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadMemberArea = async (memberAreaId: string) => {
    try {
      console.log('📥 ModernAuth: Carregando área de membros:', memberAreaId);
      
      const { data, error } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', memberAreaId)
        .single();

      if (error) {
        console.error('❌ ModernAuth: Erro ao carregar área de membros:', error);
        return;
      }

      console.log('✅ ModernAuth: Área de membros carregada:', data);
      setMemberArea(data);
    } catch (error) {
      console.error('❌ ModernAuth: Erro inesperado ao carregar área de membros:', error);
    }
  };

  // Verificar se o usuário tem acesso à área de membros
  const checkMemberAccess = async (memberAreaId: string): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      const { data: student } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('student_email', user.email)
        .maybeSingle();

      const hasAccess = !!student;
      console.log('🔑 ModernAuth: Verificação de acesso:', { 
        memberAreaId, 
        email: user.email, 
        hasAccess 
      });

      if (hasAccess) {
        await loadMemberArea(memberAreaId);
      }

      return hasAccess;
    } catch (error) {
      console.error('❌ ModernAuth: Erro ao verificar acesso:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🚀 ModernAuth: Iniciando login com Supabase Auth...', { email });
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ ModernAuth: Erro no login:', error);
        toast({
          title: 'Erro no login',
          message: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : 'Erro ao fazer login. Tente novamente.',
          variant: 'error'
        });
        return false;
      }

      console.log('✅ ModernAuth: Login realizado com sucesso');
      toast({
        title: 'Login realizado com sucesso!',
        message: 'Bem-vindo à área de membros.',
        variant: 'success'
      });

      return true;
    } catch (error) {
      console.error('❌ ModernAuth: Erro inesperado no login:', error);
      toast({
        title: 'Erro inesperado',
        message: 'Algo deu errado. Tente novamente.',
        variant: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('🚪 ModernAuth: Fazendo logout...');
    
    await supabase.auth.signOut();
    setMemberArea(null);
    
    toast({
      title: 'Logout realizado com sucesso',
      message: 'Até a próxima!',
      variant: 'success'
    });
  };

  const contextValue: ModernMembersAuthContextType = {
    user,
    session,
    memberArea,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkMemberAccess,
  };

  return (
    <ModernMembersAuthContext.Provider value={contextValue}>
      {children}
    </ModernMembersAuthContext.Provider>
  );
}