
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useCustomToast';
import { BannedUserDialog } from '@/components/BannedUserDialog';
import { linkOneSignalExternalId } from '@/utils/onesignal-external-id';
import { captureFullTrackingData } from '@/utils/ipTracker';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  requires2FA: boolean;
  verified2FA: boolean;
  pending2FAEmail: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ error?: AuthError }>;
  set2FARequired: (required: boolean, email?: string) => void;
  verify2FA: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Estados para 2FA
  const [requires2FA, setRequires2FA] = useState(false);
  const [verified2FA, setVerified2FA] = useState(false);
  const [pending2FAEmail, setPending2FAEmail] = useState<string | null>(null);

  // Função para validar se um usuário é válido (menos restritiva para evitar logouts)
  const isValidUser = (user: User | null): boolean => {
    if (!user) return false;
    
    // Apenas verificar se tem ID válido - o email pode ser null em alguns providers
    if (!user.id) {
      console.log('❌ ID de usuário ausente');
      return false;
    }
    
    return true;
  };

  // Função para validar se uma sessão é válida
  const isValidSession = (session: Session | null): boolean => {
    if (!session) return false;
    
    // NÃO verificar expiração aqui - o Supabase SDK faz refresh automático
    // Verificar apenas se o access_token existe
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
    setRequires2FA(false);
    setVerified2FA(false);
    setPending2FAEmail(null);
  };

  // Funções para controle de 2FA
  const set2FARequired = (required: boolean, email?: string) => {
    console.log('🔐 set2FARequired:', required, email);
    setRequires2FA(required);
    setPending2FAEmail(email || null);
    if (!required) {
      setVerified2FA(false);
    }
  };

  const verify2FA = () => {
    console.log('✅ 2FA verificado com sucesso');
    setVerified2FA(true);
    setRequires2FA(false);
    setPending2FAEmail(null);
  };

  useEffect(() => {
    let mounted = true;

    // Verificar sessão inicial com timeout para evitar hanging
    const getInitialSession = async () => {
      try {
        // NÃO verificar sessão nas rotas de área de membros - elas têm seu próprio sistema
        if (window.location.pathname.includes('/members/area/') || 
            window.location.pathname.includes('/members/login/')) {
          console.log('ℹ️ Rota de área de membros detectada, pulando verificação de sessão principal');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

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
        } else if (!currentSession) {
          console.log('ℹ️ Nenhuma sessão encontrada na inicialização');
        } else {
          // Sessão existe mas não passou na validação - NÃO forçar logout
          // Deixar o Supabase SDK tentar fazer refresh
          console.log('⚠️ Sessão pode precisar de refresh, aguardando SDK...');
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
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
      (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state change:', event);
        
        // NÃO interferir nas rotas de área de membros - elas têm seu próprio sistema
        if (window.location.pathname.includes('/members/area/') || 
            window.location.pathname.includes('/members/login/')) {
          console.log('ℹ️ Rota de área de membros detectada, ignorando auth change');
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 Usuário desconectado');
          clearAuth();
          setLoading(false);
          return;
        }

        // Se não há sessão após um evento que não é SIGNED_OUT, apenas ignorar
        if (!session) {
          console.log('ℹ️ Evento sem sessão:', event);
          setLoading(false);
          return;
        }
        
        // Aceitar a sessão mesmo se a validação falhar (deixar SDK fazer refresh)
        console.log('✅ Sessão recebida no listener:', event);
        setSession(session);
        setUser(session.user);
        
        // Verificar se é uma nova conta criada via Google OAuth (não via email/senha)
        // Ignorar verificação se for admin (tem is_admin no metadata)
        if (event === 'SIGNED_IN' && session?.user) {
          const isAdmin = session.user.user_metadata?.is_admin === true;
          const provider = session.user.app_metadata?.provider;
          const isGoogleProvider = provider === 'google';
          
          if (!isAdmin && isGoogleProvider) {
            const userCreatedAt = new Date(session.user.created_at);
            const now = new Date();
            const secondsSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000;
            
            // Se a conta foi criada há menos de 10 segundos via Google, é um novo registro
            if (secondsSinceCreation < 10) {
              console.log('❌ Nova conta detectada via Google OAuth - bloqueando');
              toast({
                title: "Cadastro não permitido",
                description: "Google é apenas para login. Cadastre-se primeiro com email e senha.",
                variant: "destructive"
              });
              
              // Deslogar o usuário
               setTimeout(() => { supabase.auth.signOut().catch(() => {}); }, 0);
              clearAuth();
              setLoading(false);
              return;
            }
          } else if (isAdmin) {
            console.log('✅ Login de admin detectado - ignorando verificação de Google OAuth');
          }
        }
        
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
              const googleAuthMode = (() => { try { return localStorage.getItem('googleAuthMode'); } catch { return null; } })();
              
              if (!existingProfile) {
                console.log('👤 Profile não existe, criando...');
                if (googleAuthMode === 'signin') {
                   try { localStorage.removeItem('googleAuthMode'); } catch { /* ignore */ }
                  await supabase.auth.signOut();
                  const userType = (() => { try { return localStorage.getItem('userType'); } catch { return ''; } })();
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
              
               try { localStorage.removeItem('googleAuthMode'); } catch { /* ignore */ }
              
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

  // 🔗 Vincular OneSignal external_id automaticamente para TODOS usuários logados
  useEffect(() => {
    if (!user?.id || !user?.email || loading) return;

    const checkAndLinkOneSignal = async () => {
      try {
        console.log('🔍 [Auto] Verificando se usuário tem OneSignal ID vinculado...');
        
        // 1. Verificar se o usuário já tem onesignal_player_id no banco
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onesignal_player_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('❌ [Auto] Erro ao verificar perfil:', profileError);
          return;
        }
        
        // 2. Se JÁ TEM o ID vinculado, não fazer nada
        if (profile?.onesignal_player_id) {
          console.log('✅ [Auto] OneSignal ID já vinculado:', profile.onesignal_player_id);
          return;
        }
        
        // 3. Se NÃO TEM, tentar vincular (aguardar DOM estar pronto)
        console.log('⚠️ [Auto] OneSignal ID não encontrado no perfil, tentando vincular...');
        
        // Aguardar 3s para garantir que o DOM está pronto e o cookie pode estar disponível
        setTimeout(() => {
          linkOneSignalExternalId(user.email!).catch(err => {
            console.error('❌ [Auto] Erro ao vincular OneSignal:', err);
          });
        }, 3000);
        
      } catch (error) {
        console.error('❌ [Auto] Erro ao verificar/vincular OneSignal:', error);
      }
    };

    checkAndLinkOneSignal();
  }, [user, loading]);

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('🔑 Iniciando signup:', { email, fullName });
    
    try {
      // Usar signup nativo do Supabase que enviará email automático com código
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('❌ Erro no signup:', error);
        return { error };
      }

      console.log('✅ Usuário criado - Email de confirmação enviado pelo Supabase com código');
      
      // Fazer logout para forçar verificação do código enviado por email
      await supabase.auth.signOut();
      console.log('🔒 Logout automático - usuário deve confirmar email com código de 6 dígitos');

      return { error: null, data };
    } catch (err) {
      console.error('❌ Erro inesperado no signup:', err);
      return { error: err as AuthError };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: AuthError }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('🔐 Attempting sign in for:', normalizedEmail);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);

        // Se o erro for "Email not confirmed", tentar login customizado
        if (error.message?.includes('Email not confirmed')) {
          console.log('📧 Email not confirmed, trying custom login...');

          try {
            const { data: customData, error: customError } = await supabase.functions.invoke('custom-auth-login', {
              body: { email: normalizedEmail, password }
            });

            if (customError) {
              console.error('❌ Custom login error:', customError);
              return { error };
            }

            if (customData?.success && customData?.user && customData?.session) {
              console.log('✅ Custom login successful, setting session...');

              // Definir manualmente a sessão
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: customData.session.access_token,
                refresh_token: customData.session.refresh_token,
              });

              if (setSessionError) {
                console.error('❌ Error setting custom session:', setSessionError);
                return { error: setSessionError };
              }

              console.log('✅ Custom session set successfully');

              // Verificar banimento
              await checkUserBanStatus(customData.user);

              // Vincular OneSignal External ID (se for acesso via app)
              if (customData.user?.email) {
                // Executar em background sem bloquear o login
                linkOneSignalExternalId(customData.user.email).catch(err => {
                  console.error('Erro ao vincular OneSignal external_id:', err);
                });
              }

              return {};
            } else {
              console.log('❌ Custom login returned no valid session');
            }
          } catch (customError) {
            console.error('❌ Custom login exception:', customError);
          }
        }

        return { error };
      }

      console.log('✅ Sign in successful');

      // Verificar se o usuário está banido
      if (data.user) {
        await checkUserBanStatus(data.user);
        
        // Capturar IP de login em background
        captureFullTrackingData(data.user.id, false).catch(err => {
          console.error('Erro ao capturar IP de login:', err);
        });
      }

      // Vincular OneSignal External ID (se for acesso via app)
      if (data.user?.email) {
        // Executar em background sem bloquear o login
        linkOneSignalExternalId(data.user.email).catch(err => {
          console.error('Erro ao vincular OneSignal external_id:', err);
        });
      }

      return {};
    } catch (error) {
      console.error('❌ Unexpected sign in error:', error);
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
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.functions.invoke('reset-password', {
        body: { email: normalizedEmail }
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
    requires2FA,
    verified2FA,
    pending2FAEmail,
    signUp,
    signIn,
    signOut,
    resetPassword,
    set2FARequired,
    verify2FA,
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
