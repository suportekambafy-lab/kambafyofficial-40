import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MemberSession {
  id: string;
  memberAreaId: string;
  studentEmail: string;
  studentName: string;
  sessionToken: string;
  expiresAt: string;
  memberArea?: MemberArea;
}

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
  session: MemberSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (memberAreaId: string, email: string, name: string) => Promise<boolean>;
  logout: () => void;
  memberArea: MemberArea | null;
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
  const [session, setSession] = useState<MemberSession | null>(null);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(session?.sessionToken && new Date(session?.expiresAt || '') > new Date());

  // Verificar sessão existente ao carregar
  useEffect(() => {
    const checkExistingSession = async () => {
      console.log('🔍 ModernAuth: Verificando sessão existente...');
      
      try {
        const savedSession = localStorage.getItem('modernMembersSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          console.log('📋 ModernAuth: Sessão encontrada:', { sessionData });
          
          // Verificar se a sessão não expirou
          if (new Date(sessionData.expiresAt) > new Date()) {
            console.log('✅ ModernAuth: Sessão válida, carregando área...');
            await loadMemberArea(sessionData.memberAreaId);
            setSession(sessionData);
          } else {
            console.log('❌ ModernAuth: Sessão expirada, removendo...');
            localStorage.removeItem('modernMembersSession');
          }
        } else {
          console.log('ℹ️ ModernAuth: Nenhuma sessão encontrada');
        }
      } catch (error) {
        console.error('❌ ModernAuth: Erro ao verificar sessão:', error);
        localStorage.removeItem('modernMembersSession');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
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

  const login = async (memberAreaId: string, email: string, name: string): Promise<boolean> => {
    try {
      console.log('🚀 ModernAuth: Iniciando login...', { memberAreaId, email, name });
      setIsLoading(true);

      // Verificar acesso primeiro
      const { data: student } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('student_email', email)
        .maybeSingle();

      if (!student) {
        console.error('❌ ModernAuth: Acesso negado - estudante não encontrado');
        toast.error('Acesso negado', {
          description: 'Seu email não tem acesso a esta área de membros.'
        });
        return false;
      }

      console.log('✅ ModernAuth: Estudante encontrado, criando sessão...');

      // Criar sessão via edge function
      const { data: sessionData, error } = await supabase.functions.invoke('member-area-login', {
        body: {
          memberAreaId,
          studentEmail: email,
          studentName: name
        }
      });

      if (error) {
        console.error('❌ ModernAuth: Erro na edge function:', error);
        toast.error('Erro no login', {
          description: 'Erro interno do servidor. Tente novamente.'
        });
        return false;
      }

      console.log('✅ ModernAuth: Sessão criada com sucesso:', sessionData);

      // Carregar área de membros
      await loadMemberArea(memberAreaId);

      const newSession: MemberSession = {
        id: sessionData.sessionId,
        memberAreaId,
        studentEmail: email,
        studentName: name,
        sessionToken: sessionData.sessionToken,
        expiresAt: sessionData.expiresAt
      };

      setSession(newSession);
      localStorage.setItem('modernMembersSession', JSON.stringify(newSession));

      toast.success('Login realizado com sucesso!', {
        description: 'Bem-vindo à área de membros.'
      });

      return true;
    } catch (error) {
      console.error('❌ ModernAuth: Erro inesperado no login:', error);
      toast.error('Erro inesperado', {
        description: 'Algo deu errado. Tente novamente.'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 ModernAuth: Fazendo logout...');
    
    // Tentar fazer logout no servidor
    if (session?.sessionToken) {
      supabase.functions.invoke('member-area-logout', {
        body: { sessionToken: session.sessionToken }
      }).catch(console.error);
    }

    setSession(null);
    setMemberArea(null);
    localStorage.removeItem('modernMembersSession');
    
    toast.success('Logout realizado com sucesso');
  };

  const contextValue: ModernMembersAuthContextType = {
    session,
    memberArea,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <ModernMembersAuthContext.Provider value={contextValue}>
      {children}
    </ModernMembersAuthContext.Provider>
  );
}