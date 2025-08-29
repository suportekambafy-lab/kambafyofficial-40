import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MemberAreaStudent {
  email: string;
  name: string;
}

interface MemberAreaInfo {
  id: string;
  name: string;
  userId?: string;
}

interface MemberAreaSession {
  id: string;
  expiresAt: string;
  lastActivity: string;
}

interface MemberAreaAuthContextType {
  student: MemberAreaStudent | null;
  memberArea: MemberAreaInfo | null;
  session: MemberAreaSession | null;
  loading: boolean;
  login: (memberAreaId: string, email: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const MemberAreaAuthContext = createContext<MemberAreaAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'member_area_session';

interface MemberAreaAuthProviderProps {
  children: React.ReactNode;
  memberAreaId: string;
}

export function MemberAreaAuthProvider({ children, memberAreaId }: MemberAreaAuthProviderProps) {
  const [student, setStudent] = useState<MemberAreaStudent | null>(null);
  const [memberArea, setMemberArea] = useState<MemberAreaInfo | null>(null);
  const [session, setSession] = useState<MemberAreaSession | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!(student && session && memberArea?.id === memberAreaId);

  // Load session from localStorage and verify
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSession = localStorage.getItem(`${STORAGE_KEY}_${memberAreaId}`);
        if (!savedSession) {
          setLoading(false);
          return;
        }

        const sessionData = JSON.parse(savedSession);
        const { sessionToken } = sessionData;

        if (!sessionToken) {
          localStorage.removeItem(`${STORAGE_KEY}_${memberAreaId}`);
          setLoading(false);
          return;
        }

        // Verify session with backend
        const { data, error } = await supabase.functions.invoke('member-area-verify', {
          body: { sessionToken }
        });

        if (error || !data.success) {
          console.log('Session verification failed:', error || data.error);
          localStorage.removeItem(`${STORAGE_KEY}_${memberAreaId}`);
          setLoading(false);
          return;
        }

        // Session is valid, restore state
        setStudent(data.data.student);
        setMemberArea(data.data.memberArea);
        setSession(data.data.session);

        // Update localStorage with latest session info
        localStorage.setItem(`${STORAGE_KEY}_${memberAreaId}`, JSON.stringify({
          sessionToken,
          student: data.data.student,
          memberArea: data.data.memberArea,
          session: data.data.session
        }));

      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem(`${STORAGE_KEY}_${memberAreaId}`);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [memberAreaId]);

  const login = async (memberAreaId: string, email: string, name: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('member-area-login', {
        body: { memberAreaId, email, name }
      });

      if (error || !data.success) {
        console.error('Login failed:', error || data.error);
        throw new Error(data?.error || 'Erro ao fazer login');
      }

      // Store session data
      const sessionData = {
        sessionToken: data.data.sessionToken,
        student: data.data.student,
        memberArea: data.data.memberArea,
        session: {
          id: crypto.randomUUID(),
          expiresAt: data.data.expiresAt,
          lastActivity: new Date().toISOString()
        }
      };

      localStorage.setItem(`${STORAGE_KEY}_${memberAreaId}`, JSON.stringify(sessionData));

      setStudent(data.data.student);
      setMemberArea(data.data.memberArea);
      setSession(sessionData.session);

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const savedSession = localStorage.getItem(`${STORAGE_KEY}_${memberAreaId}`);
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        const { sessionToken } = sessionData;

        if (sessionToken) {
          // Notify backend about logout
          await supabase.functions.invoke('member-area-logout', {
            body: { sessionToken }
          });
        }
      }

      // Clear local state
      localStorage.removeItem(`${STORAGE_KEY}_${memberAreaId}`);
      setStudent(null);
      setMemberArea(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if backend call fails
      localStorage.removeItem(`${STORAGE_KEY}_${memberAreaId}`);
      setStudent(null);
      setMemberArea(null);
      setSession(null);
    }
  };

  return (
    <MemberAreaAuthContext.Provider
      value={{
        student,
        memberArea,
        session,
        loading,
        login,
        logout,
        isAuthenticated
      }}
    >
      {children}
    </MemberAreaAuthContext.Provider>
  );
}

export function useMemberAreaAuth() {
  const context = useContext(MemberAreaAuthContext);
  if (context === undefined) {
    throw new Error('useMemberAreaAuth must be used within a MemberAreaAuthProvider');
  }
  return context;
}