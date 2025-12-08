import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MemberSession {
  id: string;
  memberAreaId: string;
  studentEmail: string;
  studentName: string;
  sessionToken: string;
  expiresAt: string;
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

interface MembersAuthContextType {
  session: MemberSession | null;
  memberArea: MemberArea | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (memberAreaId: string, email: string, name: string) => Promise<boolean>;
  logout: () => void;
}

const MembersAuthContext = createContext<MembersAuthContextType | null>(null);

export function useMembersAuth(): MembersAuthContextType {
  const context = useContext(MembersAuthContext);
  if (!context) {
    throw new Error('useMembersAuth deve ser usado dentro de MembersAuthProvider');
  }
  return context;
}

interface MembersAuthProviderProps {
  children: ReactNode;
}

export function MembersAuthProvider({ children }: MembersAuthProviderProps) {
  const [session, setSession] = useState<MemberSession | null>(null);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(session && memberArea);

  // Verificar sessão existente ao carregar
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const savedSession = localStorage.getItem('membersSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          
          // Verificar se a sessão não expirou
          if (new Date(sessionData.expiresAt) > new Date()) {
            setSession(sessionData);
            loadMemberArea(sessionData.memberAreaId);
          } else {
            localStorage.removeItem('membersSession');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        localStorage.removeItem('membersSession');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const loadMemberArea = async (memberAreaId: string) => {
    try {
      const { data, error } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', memberAreaId)
        .single();

      if (error) {
        console.error('Erro ao carregar área de membros:', error);
        return;
      }

      setMemberArea(data);
    } catch (error) {
      console.error('Erro ao carregar área de membros:', error);
    }
  };

  const login = async (memberAreaId: string, email: string, name: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Normalizar email
      const normalizedEmail = email.toLowerCase().trim();
      const studentName = normalizedEmail === 'validar@kambafy.com' ? 'Validação Kambafy' : name;

      // Chamar edge function que faz toda a verificação de acesso
      // A edge function verifica: member_area_students, orders com produto vinculado, e se é criador
      const { data: sessionData, error } = await supabase.functions.invoke('member-area-login', {
        body: {
          memberAreaId,
          studentEmail: normalizedEmail,
          studentName
        }
      });

      if (error) {
        console.error('Erro ao fazer login:', error);
        return false;
      }

      if (!sessionData?.success) {
        console.error('Login falhou:', sessionData?.error);
        return false;
      }

      const newSession: MemberSession = {
        id: sessionData.data?.sessionToken || crypto.randomUUID(),
        memberAreaId,
        studentEmail: normalizedEmail,
        studentName,
        sessionToken: sessionData.data?.sessionToken,
        expiresAt: sessionData.data?.expiresAt
      };

      setSession(newSession);
      localStorage.setItem('membersSession', JSON.stringify(newSession));
      await loadMemberArea(memberAreaId);

      return true;
    } catch (error) {
      console.error('Erro inesperado no login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    setMemberArea(null);
    localStorage.removeItem('membersSession');
    
    // Tentar fazer logout no servidor (opcional)
    if (session?.sessionToken) {
      supabase.functions.invoke('member-area-logout', {
        body: { sessionToken: session.sessionToken }
      }).catch(console.error);
    }
  };

  const contextValue: MembersAuthContextType = {
    session,
    memberArea,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <MembersAuthContext.Provider value={contextValue}>
      {children}
    </MembersAuthContext.Provider>
  );
}