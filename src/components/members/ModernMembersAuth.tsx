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
    
    // Verificar query params para acesso verificado
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified') === 'true';
    const email = urlParams.get('email');
    
    if (verified && email) {
      // Normalizar email para lowercase
      const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();
      console.log('🔑 ModernAuth: Acesso verificado detectado via URL:', normalizedEmail);
      
      // Criar sessão virtual persistente
      const virtualUser = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { full_name: normalizedEmail.split('@')[0] },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      } as unknown as User;
      
      const virtualSession = {
        user: virtualUser,
        access_token: crypto.randomUUID(),
        refresh_token: crypto.randomUUID(),
        expires_in: 86400,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        token_type: 'bearer'
      } as Session;
      
      // Salvar no localStorage para persistência
      localStorage.setItem('memberAreaSession', JSON.stringify({
        user: virtualUser,
        session: virtualSession,
        timestamp: Date.now()
      }));
      
      setUser(virtualUser);
      setSession(virtualSession);
      setIsLoading(false);
      
      console.log('✅ ModernAuth: Sessão virtual criada e persistida');
      return;
    }
    
    // Tentar recuperar sessão do localStorage
    const savedSession = localStorage.getItem('memberAreaSession');
    if (savedSession) {
      try {
        const { user: savedUser, session: savedSessionData, timestamp } = JSON.parse(savedSession);
        
        // Verificar se a sessão não expirou (24h)
        if (Date.now() - timestamp < 86400000) {
          console.log('✅ ModernAuth: Sessão recuperada do localStorage');
          setUser(savedUser);
          setSession(savedSessionData);
          setIsLoading(false);
          return;
        } else {
          console.log('⏰ ModernAuth: Sessão expirada, removendo');
          localStorage.removeItem('memberAreaSession');
        }
      } catch (error) {
        console.error('❌ ModernAuth: Erro ao recuperar sessão:', error);
        localStorage.removeItem('memberAreaSession');
      }
    }
    
    // Configurar listener de mudanças de autenticação Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 ModernAuth: Auth state changed:', event, !!session);
        
        if (session) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Salvar no localStorage também
          localStorage.setItem('memberAreaSession', JSON.stringify({
            user: session.user,
            session: session,
            timestamp: Date.now()
          }));
        } else {
          // Só limpar se não houver sessão salva
          if (!localStorage.getItem('memberAreaSession')) {
            setSession(null);
            setUser(null);
          }
        }
      }
    );

    // Verificar sessão Supabase existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📋 ModernAuth: Sessão Supabase inicial:', !!session);
      
      if (session) {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Salvar no localStorage
        localStorage.setItem('memberAreaSession', JSON.stringify({
          user: session.user,
          session: session,
          timestamp: Date.now()
        }));
      }
      
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
      // Normalizar email para lowercase
      const normalizedEmail = user.email.toLowerCase().trim();
      
      // Verificar se é um admin primeiro
      const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .single();
      
      if (adminCheck) {
        return true; // Admins têm acesso a todas as áreas
      }
      
      const { data: student } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .ilike('student_email', normalizedEmail)
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
      // Normalizar email para lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('🚀 ModernAuth: Iniciando login customizado...', { email: normalizedEmail });
      setIsLoading(true);

      // Obter memberAreaId da URL atual
      const urlPath = window.location.pathname;
      const memberAreaId = urlPath.split('/').pop();

      if (!memberAreaId) {
        throw new Error('ID da área de membros não encontrado');
      }

      // Tentar login customizado primeiro
      const { data, error } = await supabase.functions.invoke('member-area-custom-login', {
        body: {
          memberAreaId,
          email: normalizedEmail,
          password,
        },
      });

      if (error) {
        console.error('❌ ModernAuth: Erro no login customizado:', error);
        return false;
      }

      if (data.success) {
        console.log('✅ ModernAuth: Login customizado realizado com sucesso');
        
        // Para login customizado, simular user/session com os dados retornados
        const customUser = {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { full_name: data.studentName },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          confirmation_sent_at: null,
          recovery_sent_at: null,
          email_change_sent_at: null,
          new_email: null,
          invited_at: null,
          action_link: null,
          email_confirmed_at: new Date().toISOString(),
          phone_confirmed_at: null,
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          role: 'authenticated',
          updated_at: new Date().toISOString(),
          identities: [],
          factors: [],
          phone: null,
          new_phone: null,
          phone_change_sent_at: null,
          email_change_token_new: null,
          email_change_token_current: null,
          phone_change_token: null,
          recovery_token: null,
          email_change_confirm_status: 0,
          banned_until: null,
          deleted_at: null
        } as unknown as User;
        
        const customSession = {
          user: customUser,
          access_token: data.sessionToken,
          refresh_token: data.sessionToken,
          expires_in: 86400,
          expires_at: Math.floor(new Date(data.expiresAt).getTime() / 1000),
          token_type: 'bearer'
        } as Session;
        
        setUser(customUser);
        setSession(customSession);

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ ModernAuth: Erro inesperado no login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('🚪 ModernAuth: Fazendo logout...');
    
    // Limpar localStorage
    localStorage.removeItem('memberAreaSession');
    
    await supabase.auth.signOut();
    setMemberArea(null);
    setUser(null);
    setSession(null);
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