
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
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
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

    getInitialSession();

    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

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
        
        // Verificar se o usuário está banido - mas sem blocking
        if (session?.user) {
          // Fazer isso em background sem await para não bloquear
          setTimeout(async () => {
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
                }
              } else {
                console.log('📝 Profile não encontrado, usuário será criado depois');
              }
            } catch (error) {
              console.error('❌ Erro ao verificar status de banimento:', error);
            }
          }, 0);
        }
        
        // Handle profile creation for new users - também em background
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
                if (googleAuthMode === 'signin') {
                  localStorage.removeItem('googleAuthMode');
                  await supabase.auth.signOut();
                  const userType = localStorage.getItem('userType');
                  window.location.href = `/auth?mode=signup&type=${userType}&error=google-account-not-found`;
                  return;
                }
                
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
              
              localStorage.removeItem('googleAuthMode');
              
            } catch (error) {
              console.error('❌ Erro ao processar autenticação:', error);
            }
          }, 100);
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
    console.log('🔑 Iniciando signup:', { email, fullName });
    
    try {
      // O trigger do banco de dados agora previne confirmação automática
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: undefined, // Não usar redirect
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('❌ Erro no signup:', error);
        return { error };
      }

      console.log('✅ Signup realizado - trigger deve ter prevenido confirmação automática:', data);
      
      // Imediatamente deslogar para garantir que não há sessão ativa
      if (data.user) {
        console.log('🔒 Desconectando usuário para forçar verificação por código...');
        await supabase.auth.signOut();
      }

      return { error: null, data };
    } catch (err) {
      console.error('❌ Erro inesperado no signup:', err);
      return { error: err as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🚀 Iniciando login...');
    
    try {
      // Primeiro tentar login normal
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      // Se login normal funcionou
      if (!error && data.user && data.session) {
        console.log('✅ Login normal bem-sucedido');
        
        // Verificar se o usuário está banido
        await checkUserBanStatus(data.user);
        
        return { error: null, data };
      }

      // Se o erro é de email não confirmado, tentar login customizado
      if (error?.message?.includes('Email not confirmed')) {
        console.log('📧 Email não confirmado, tentando login customizado...');
        
        try {
          const { data: customData, error: customError } = await supabase.functions.invoke('custom-auth-login', {
            body: {
              email: email.trim().toLowerCase(),
              password,
            },
          });

          if (customError) {
            console.error('❌ Erro no login customizado:', customError);
            return { 
              error: {
                message: "Email não confirmado. Por favor, verifique sua caixa de entrada e confirme seu email antes de fazer login.",
                code: "email_not_confirmed"
              } as any
            };
          }

          if (customData.success && customData.session) {
            console.log('✅ Login customizado bem-sucedido');
            
            // Atualizar estado manualmente já que não passará pelo listener normal
            setSession(customData.session);
            setUser(customData.user);
            
            // Verificar se o usuário está banido
            await checkUserBanStatus(customData.user);
            
            toast({
              title: "Login realizado com sucesso!",
              description: "Bem-vindo de volta.",
            });

            return { error: null, data: customData };
          }
        } catch (customError) {
          console.error('❌ Erro inesperado no login customizado:', customError);
        }
      }

      // Retornar erro original se não conseguiu resolver
      return { error, data };
      
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error);
      return { error: error as AuthError };
    }
  };

  const checkUserBanStatus = async (user: User) => {
    try {
      console.log('🔍 Verificando status de banimento no login para:', user.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('banned, ban_reason, full_name, email')
        .eq('user_id', user.id)
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

  console.log('🔍 AuthContext render:', { isBanned, userProfile, user: !!user });

  return (
    <AuthContext.Provider value={value}>
      {isBanned && userProfile ? (
        <>
          {console.log('🚫 Renderizando BannedUserDialog')}
          <BannedUserDialog
            banReason={banReason}
            userEmail={userProfile.email || ''}
            userName={userProfile.full_name || 'Usuário'}
          />
        </>
      ) : (
        children
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
