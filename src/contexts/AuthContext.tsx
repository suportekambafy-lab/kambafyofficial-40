
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useCustomToast';
import { BannedUserDialog } from '@/components/BannedUserDialog';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ error?: AuthError }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Função para validar se um usuário é válido
  const isValidUser = (user: User | null): boolean => {
    if (!user) return false;
    
    // Verificar se o email existe e é válido
    if (!user.email || 
        user.email.includes('usurário') || 
        user.email.includes('usuário') ||
        user.email.includes('usuario') ||
        user.email === 'usuario' ||
        user.email.trim() === '' ||
        user.email === 'user@example.com') {
      console.log('❌ Email inválido detectado:', user.email);
      return false;
    }
    
    // Verificar se o ID do usuário é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!user.id || !uuidRegex.test(user.id)) {
      console.log('❌ ID de usuário inválido:', user.id);
      return false;
    }
    
    return true;
  };

  // Função para validar se uma sessão é válida
  const isValidSession = (session: Session | null): boolean => {
    if (!session) return false;
    
    // Verificar se a sessão não expirou
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('❌ Sessão expirada');
      return false;
    }
    
    // Verificar se o access_token existe
    if (!session.access_token) {
      console.log('❌ Token de acesso ausente');
      return false;
    }
    
    return true;
  };

  // Função para limpar autenticação
  const clearAuth = () => {
    console.log('🧹 Limpando estado de autenticação');
    setUser(null);
    setSession(null);
    setIsBanned(false);
    setBanReason('');
    setUserProfile(null);
  };

  useEffect(() => {
    let mounted = true;

    // Verificar sessão inicial com timeout para evitar hanging
    const getInitialSession = async () => {
      try {
        // Timeout de 3 segundos para evitar hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 3000)
        );

        const { data: { session: currentSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        if (error) {
          console.error('Erro ao obter sessão inicial:', error);
          if (mounted) {
            clearAuth();
            setLoading(false);
          }
          return;
        }
        
        if (currentSession && isValidSession(currentSession) && isValidUser(currentSession.user)) {
          console.log('✅ Sessão válida encontrada');
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        } else if (currentSession) {
          console.log('❌ Sessão inválida detectada na inicialização - fazendo logout');
          try {
            await supabase.auth.signOut();
          } catch (error) {
            console.error('Erro ao fazer logout:', error);
          }
          if (mounted) {
            clearAuth();
          }
        } else {
          console.log('ℹ️ Nenhuma sessão encontrada na inicialização');
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro inesperado ao obter sessão inicial:', error);
        if (mounted) {
          clearAuth();
          setLoading(false);
        }
      }
    };

    // Reduzir delay para loading inicial drasticamente
    const quickLoad = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 10);

    getInitialSession().finally(() => {
      clearTimeout(quickLoad);
    });

    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // ✅ THROTTLING: Evitar processamento excessivo de SIGNED_IN repetidos
        if (event === 'SIGNED_IN' && user && session?.user?.id === user.id) {
          console.log('🚫 Auth event throttled: Same user already signed in');
          return;
        }

        console.log('🔄 Auth state change:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          console.log('👋 Usuário desconectado');
          clearAuth();
          setLoading(false);
          return;
        }
        
        // Validar nova sessão
        if (!isValidSession(session) || !isValidUser(session.user)) {
          console.log('❌ Nova sessão inválida detectada no listener - fazendo logout');
          try {
            await supabase.auth.signOut();
          } catch (error) {
            console.error('Erro ao fazer logout:', error);
          }
          clearAuth();
          setLoading(false);
          return;
        }
        
        console.log('✅ Sessão válida no listener');
        setSession(session);
        setUser(session.user);
        
        // Verificar se o usuário está banido
        if (session?.user) {
          try {
            console.log('🔍 Verificando status de banimento para:', session.user.id);
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('banned, ban_reason, full_name, email')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (profileError) {
              console.error('❌ Erro ao buscar profile:', profileError);
            } else if (profile) {
              console.log('✅ Profile encontrado:', profile);
              setUserProfile(profile);
              if (profile.banned) {
                console.log('🚫 Usuário banido:', profile.ban_reason);
                setIsBanned(true);
                setBanReason(profile.ban_reason || 'Motivo não especificado');
                // Não fazer logout, apenas mostrar a tela de contestação
                return;
              }
            } else {
              console.log('📝 Profile não encontrado, usuário será criado depois');
            }
          } catch (error) {
            console.error('❌ Erro ao verificar status de banimento:', error);
          }
        }
        
        // Handle profile creation for new users and Google Auth validation
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              console.log('👤 Verificando profile existente para:', session.user.id);
              const { data: existingProfile, error: profileCheckError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              if (profileCheckError) {
                console.error('❌ Erro ao verificar profile existente:', profileCheckError);
                return;
              }
              
              // Verificar se é login via Google e não signup
              const googleAuthMode = localStorage.getItem('googleAuthMode');
              
              if (!existingProfile) {
                console.log('👤 Profile não existe, criando...');
                // Usuário novo
                if (googleAuthMode === 'signin') {
                  // Tentativa de login com Google de usuário que não existe
                  localStorage.removeItem('googleAuthMode');
                  
                  // Fazer logout e mostrar mensagem
                  await supabase.auth.signOut();
                  
                  // Redirecionar para página de registro com mensagem
                  const userType = localStorage.getItem('userType');
                  window.location.href = `/auth?mode=signup&type=${userType}&error=google-account-not-found`;
                  return;
                }
                
                // Criar perfil para novos usuários (signup normal)
                if (session.user.user_metadata) {
                  const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                      user_id: session.user.id,
                      full_name: session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.email?.split('@')[0],
                      email: session.user.email,
                      avatar_url: session.user.user_metadata.avatar_url
                    });
                  
                  if (insertError) {
                    console.error('❌ Erro ao inserir profile:', insertError);
                  } else {
                    console.log('✅ Profile criado com sucesso');
                  }
                }
              } else {
                console.log('✅ Profile já existe:', existingProfile.full_name);
              }
              
              // Limpar flag de Google Auth
              localStorage.removeItem('googleAuthMode');
              
            } catch (error) {
              console.error('❌ Erro ao processar autenticação:', error);
            }
          }, 0);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Se não há erro e foi criado um usuário, mas não está confirmado
    if (!error && data.user && !data.user.email_confirmed_at) {
      // Mostrar toast de sucesso
      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar a conta antes de fazer login.",
      });
    }
    
    return { error, data };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    // Verificar se o email não foi confirmado
    if (!error && data.user && !data.user.email_confirmed_at) {
      // Fazer logout imediatamente
      await supabase.auth.signOut();
      
      // Retornar erro personalizado
      const emailNotConfirmedError = {
        message: "Email não confirmado. Por favor, verifique sua caixa de entrada e confirme seu email antes de fazer login.",
        code: "email_not_confirmed"
      };
      
      return { error: emailNotConfirmedError as any };
    }

    // Verificar se o usuário está banido
    if (!error && data.user) {
      try {
        console.log('🔍 Verificando status de banimento no login para:', data.user.id);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('banned, ban_reason, full_name, email')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('❌ Erro ao buscar profile no login:', profileError);
        } else if (profile?.banned) {
          console.log('🚫 Usuário banido no login:', profile.ban_reason);
          setIsBanned(true);
          setBanReason(profile.ban_reason || 'Motivo não especificado');
          setUserProfile(profile);
          // Não fazer logout, permitir que vejam a tela de contestação
        }
      } catch (error) {
        console.error('❌ Erro ao verificar status de banimento no login:', error);
      }
    }

    return { error, data };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    clearAuth();
    
    // Mostrar toast de logout
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    
    return { error };
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.functions.invoke('reset-password', {
        body: { email }
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isBanned && userProfile && (
        <div className="fixed inset-0 z-50">
          <BannedUserDialog
            banReason={banReason}
            userEmail={userProfile.email || ''}
            userName={userProfile.full_name || 'Usuário'}
          />
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
