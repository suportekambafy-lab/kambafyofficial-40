
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/useCustomToast';
import PasswordRecovery from '@/components/PasswordRecovery';
import SignUpCodeVerification from '@/components/SignUpCodeVerification';
import { supabase } from '@/integrations/supabase/client';
import { SignInPage, Testimonial } from '@/components/ui/sign-in';
import loginHeroImage from '@/assets/about-section-team.jpg';
import victorAvatar from '@/assets/testimonial-victor-muabi.jpg';
import { useLogin2FA } from '@/hooks/useLogin2FA';
import TwoFactorVerification from '@/components/TwoFactorVerification';

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: victorAvatar,
    name: "Victor Muabi",
    handle: "@victormuabi",
    text: "Esta é a plataforma que faltava no mercado, fácil de usar, converte muito bem, aumentou minha conversão em lançamentos."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Carlos Santos",
    handle: "@carlostech",
    text: "Este serviço transformou minha forma de trabalhar. Design limpo, recursos poderosos e excelente suporte."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Ricardo Lima",
    handle: "@ricardocria",
    text: "Já testei muitas plataformas, mas esta se destaca. Intuitiva, confiável e genuinamente útil para produtividade."
  },
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const userTypeParam = searchParams.get('type') as 'customer' | 'seller' | null;
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'password-recovery' | 'reset-password' | 'signup-verification' | '2fa-verification'>('login');
  const [selectedUserType, setSelectedUserType] = useState<'customer' | 'seller' | null>(userTypeParam);
  
  // Estados para verificação de signup
  const [signupData, setSignupData] = useState<{
    email: string;
    password: string;
    fullName: string;
  } | null>(null);
  
  // Estados para 2FA após login
  const [pending2FAData, setPending2FAData] = useState<{
    email: string;
    userId: string;
    password: string; // Guardar temporariamente para relogar após 2FA
    reason: 'new_device' | 'new_browser' | 'long_inactivity' | 'suspicious_ip';
  } | null>(null);
  
  // Estados para o novo design
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorField, setErrorField] = useState('');
  const [checking2FA, setChecking2FA] = useState(false); // Bloqueia redirecionamento enquanto verifica 2FA
  
  // Estados para redefinição de senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const { signUp, signIn, user, set2FARequired, requires2FA } = useAuth();
  const navigate = useNavigate();
  const { checkLogin2FARequired, registerSuccessfulLogin } = useLogin2FA();

  useEffect(() => {
    if (mode === 'signup') {
      setCurrentView('signup');
    } else if (mode === 'reset-password') {
      setCurrentView('reset-password');
    } else {
      setCurrentView('login');
    }
    
    if (userTypeParam && (userTypeParam === 'customer' || userTypeParam === 'seller')) {
      setSelectedUserType(userTypeParam);
    }
  }, [mode, userTypeParam]);

  useEffect(() => {
    // Não redirecionar se está verificando 2FA ou aguardando verificação
    if (checking2FA || requires2FA) {
      return;
    }
    
    if (user) {
      const userType = localStorage.getItem('userType') || 'business';
      const redirectPath = userType === 'customer' ? '/meus-acessos' : '/vendedor';
      
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, requires2FA, checking2FA]);

  const handleUserTypeSelect = (type: 'customer' | 'seller' | null) => {
    setSelectedUserType(type);
    setErrorField('');
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      setErrorField("Por favor, preencha email e senha.");
      return;
    }

    if (!selectedUserType) {
      setErrorField("Por favor, selecione o tipo de usuário.");
      return;
    }

    setLoading(true);
    setErrorField('');
    setChecking2FA(true); // Bloquear redirecionamento ANTES de fazer login

    try {
      const userType = selectedUserType === 'customer' ? 'customer' : 'business';
      localStorage.setItem('userType', userType);
      const result = await signIn(email, password);

      if (result.error) {
        let message = "Email ou senha incorretos.";
        
        if (result.error.message.includes('email')) {
          message = "Por favor, insira um email válido.";
        } else if (result.error.message.includes('Email not confirmed') || result.error.code === 'email_not_confirmed') {
          message = "Email não confirmado! Verifique sua caixa de entrada e clique no link de confirmação.";
          
          toast({
            title: "⚠️ Email não confirmado",
            description: "Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada.",
            variant: "destructive"
          });
        }

        setErrorField(message);
        setLoading(false);
        setChecking2FA(false); // Liberar se houve erro
        return;
      }

      // Login bem-sucedido - verificar se precisa de 2FA
      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      
      if (loggedUser) {
        const check2FA = await checkLogin2FARequired(loggedUser);
        
        if (check2FA.requires2FA && check2FA.reason) {
          console.log('🔐 2FA necessário:', check2FA.reason);
          
          // Sinalizar ao contexto que precisa de 2FA
          set2FARequired(true, loggedUser.email || '');
          
          // Redirecionar para página de verificação 2FA
          setChecking2FA(false);
          navigate('/verificar-2fa', { replace: true });
          setLoading(false);
          return;
        }
        
        // Registrar login bem-sucedido
        await registerSuccessfulLogin(loggedUser.id);
      }
      
      // Liberar redirecionamento automático
      setChecking2FA(false);
    } catch (error) {
      setErrorField("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  
  // Callback para 2FA verificado com sucesso
  const handle2FASuccess = async () => {
    if (!pending2FAData) return;
    
    try {
      // Relogar o usuário
      const { error: reloginError } = await supabase.auth.signInWithPassword({
        email: pending2FAData.email,
        password: pending2FAData.password
      });
      
      if (reloginError) {
        console.error('Erro ao relogar após 2FA:', reloginError);
        setErrorField('Erro ao completar login. Tente novamente.');
        setCurrentView('login');
        setPending2FAData(null);
        return;
      }
      
      // Registrar login com dispositivo confiável
      await registerSuccessfulLogin(pending2FAData.userId, true);
      
      // Limpar dados sensíveis
      setPending2FAData(null);
      
      // Redirecionar
      const userType = localStorage.getItem('userType') || 'business';
      const redirectPath = userType === 'customer' ? '/meus-acessos' : '/vendedor';
      
      toast({
        title: "Login verificado!",
        description: "Dispositivo verificado com sucesso.",
      });
      
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error('Erro ao finalizar 2FA:', error);
      setCurrentView('login');
      setPending2FAData(null);
    }
  };
  
  // Callback para voltar do 2FA
  const handle2FABack = async () => {
    setPending2FAData(null);
    setCurrentView('login');
  };


  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password || !fullName) {
      setErrorField("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setErrorField('');

    try {
      const userType = selectedUserType === 'customer' ? 'customer' : 'business';
      localStorage.setItem('userType', userType);
      
      // Fazer o signup AGORA (mas ficará não-confirmado)
      console.log('🔄 Fazendo signup inicial...');
      const { error: signupError } = await signUp(email, password, fullName);
      
      if (signupError) {
        let message = "Ocorreu um erro. Tente novamente.";
        
        if (signupError.message.includes('User already registered')) {
          message = "Este email já está registrado. Tente fazer login.";
        } else if (signupError.message.includes('Password')) {
          message = "A senha deve ter pelo menos 6 caracteres.";
        } else if (signupError.message.includes('email')) {
          message = "Por favor, insira um email válido.";
        }

        setErrorField(message);
        return;
      }
      
      console.log('✅ Signup inicial concluído, indo para verificação');
      
      // Salvar dados para verificação e confirmação posterior
      setSignupData({
        email,
        password,
        fullName
      });
      setCurrentView('signup-verification');
      setErrorField('');
      
    } catch (error) {
      console.error('Erro no processo de signup:', error);
      setErrorField("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupVerificationSuccess = () => {
    // Após verificação bem-sucedida, o usuário já estará logado 
    // através do AuthContext que detecta mudanças na sessão
    setCurrentView('login');
    setSignupData(null);
  };

  const handleSignupVerificationBack = () => {
    // Voltar para o signup
    setCurrentView('signup');
    setSignupData(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setErrorField("Por favor, preencha todos os campos.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorField("As senhas não coincidem.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorField("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setErrorField(error.message || "Erro ao redefinir senha. Tente novamente.");
      } else {
        toast({
          title: "Sucesso!",
          description: "Senha redefinida com sucesso. Fazendo login...",
        });
        
        const redirectPath = selectedUserType === 'customer' ? '/meus-acessos' : '/vendedor';
        setTimeout(() => {
          navigate(redirectPath);
        }, 2000);
      }
    } catch (error) {
      setErrorField("Erro inesperado. Tente novamente.");
    } finally {
      setResetLoading(false);
    }
  };

  if (currentView === 'password-recovery') {
    return (
      <PasswordRecovery
        onBack={() => setCurrentView('login')}
      />
    );
  }

  // Tela de verificação 2FA após login
  if (currentView === '2fa-verification' && pending2FAData) {
    const get2FAMessage = () => {
      switch (pending2FAData.reason) {
        case 'new_device':
          return 'Detectamos um novo dispositivo. Por segurança, confirme sua identidade.';
        case 'new_browser':
          return 'Detectamos um novo navegador. Por segurança, confirme sua identidade.';
        case 'long_inactivity':
          return 'Há algum tempo que não acessa sua conta. Por segurança, confirme sua identidade.';
        case 'suspicious_ip':
          return 'Detectamos um acesso de uma localização diferente. Por segurança, confirme sua identidade.';
        default:
          return 'Por segurança, confirme sua identidade.';
      }
    };

    return (
      <div className="min-h-screen flex flex-col md:flex-row font-geist w-full overflow-x-hidden">
        <section className="flex-1 flex items-center justify-center p-4 md:p-8 py-8">
          <div className="w-full max-w-md">
            <div className="rounded-3xl p-8 bg-card border border-border shadow-lg">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-center mb-2">
                Verificação de Segurança
              </h1>
              <p className="text-center text-muted-foreground mb-6">
                {get2FAMessage()}
              </p>

              <TwoFactorVerification
                email={pending2FAData.email}
                onVerificationSuccess={handle2FASuccess}
                onBack={handle2FABack}
                context="login"
              />
            </div>
          </div>
        </section>

        {sampleTestimonials.length > 0 && (
          <section className="hidden md:block flex-1 relative p-4">
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${loginHeroImage})` }}></div>
          </section>
        )}
      </div>
    );
  }

  if (currentView === 'signup-verification') {
    if (!signupData) {
      setCurrentView('signup');
      return null;
    }
    
    return (
      <div className="min-h-screen flex flex-col md:flex-row font-geist w-full overflow-x-hidden">
        <section className="flex-1 flex items-center justify-center p-4 md:p-8 py-8">
          <SignUpCodeVerification
            email={signupData.email}
            password={signupData.password}
            fullName={signupData.fullName}
            onVerificationSuccess={handleSignupVerificationSuccess}
            onBack={handleSignupVerificationBack}
          />
        </section>

        {sampleTestimonials.length > 0 && (
          <section className="hidden md:block flex-1 relative p-4">
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${loginHeroImage})` }}></div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <div className={`animate-testimonial animate-delay-1000 flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
                <img src={sampleTestimonials[0].avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
                <div className="text-sm leading-snug">
                  <p className="flex items-center gap-1 font-medium">{sampleTestimonials[0].name}</p>
                  <p className="text-muted-foreground">{sampleTestimonials[0].handle}</p>
                  <p className="mt-1 text-foreground/80">{sampleTestimonials[0].text}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  if (currentView === 'reset-password') {
    return (
      <div className="min-h-screen flex flex-col md:flex-row font-geist w-full overflow-x-hidden">
        <section className="flex-1 flex items-center justify-center p-4 md:p-8 py-8">
          <div className="w-full max-w-md">
            <div className="flex flex-col gap-4 md:gap-6">
              <h1 className="animate-element animate-delay-100 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
                <span className="font-light text-foreground tracking-tighter">Redefinir Senha</span>
              </h1>
              <p className="animate-element animate-delay-200 text-sm md:text-base text-muted-foreground">Digite sua nova senha</p>

              {errorField && (
                <div className="animate-element animate-delay-250 p-3 md:p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs md:text-sm">
                  {errorField}
                </div>
              )}

              <form className="space-y-4 md:space-y-5" onSubmit={handleResetPassword}>
                <div className="animate-element animate-delay-300">
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">Nova Senha</label>
                  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                    <input 
                      type="password"
                      placeholder="Digite sua nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-transparent text-sm p-3 md:p-4 rounded-2xl focus:outline-none"
                      style={{ fontSize: '16px' }}
                      disabled={resetLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="animate-element animate-delay-400">
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">Confirmar Nova Senha</label>
                  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                    <input 
                      type="password"
                      placeholder="Confirme sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent text-sm p-3 md:p-4 rounded-2xl focus:outline-none"
                      style={{ fontSize: '16px' }}
                      disabled={resetLoading}
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="animate-element animate-delay-500 w-full rounded-2xl bg-primary p-3 md:p-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm md:text-base"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Redefinindo..." : "Redefinir Senha"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {sampleTestimonials.length > 0 && (
          <section className="hidden md:block flex-1 relative p-4">
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${loginHeroImage})` }}></div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <div className={`animate-testimonial animate-delay-1000 flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
                <img src={sampleTestimonials[0].avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
                <div className="text-sm leading-snug">
                  <p className="flex items-center gap-1 font-medium">{sampleTestimonials[0].name}</p>
                  <p className="text-muted-foreground">{sampleTestimonials[0].handle}</p>
                  <p className="mt-1 text-foreground/80">{sampleTestimonials[0].text}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  if (currentView === 'signup') {
    return (
      <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
        <section className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="flex flex-col gap-6">
              <div className="animate-element animate-delay-50 flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <button
                  onClick={() => setCurrentView('login')}
                  className="text-primary hover:underline"
                >
                  ← Voltar para login
                </button>
                <span>•</span>
                <span>
                  {selectedUserType === 'customer' ? 'Cadastro de Cliente' : 'Cadastro de Vendedor'}
                </span>
              </div>
              
              <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
                <span className="font-light text-foreground tracking-tighter">Criar Conta</span>
              </h1>
              <p className="animate-element animate-delay-200 text-muted-foreground">Preencha os dados para criar sua conta</p>

              {errorField && (
                <div className="animate-element animate-delay-250 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {errorField}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSignup}>
                <div className="animate-element animate-delay-300">
                  <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                    <input 
                      type="text"
                      placeholder="Digite seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                      style={{ fontSize: '16px' }}
                      disabled={loading}
                      required 
                    />
                  </div>
                </div>

                <div className="animate-element animate-delay-400">
                  <label className="text-sm font-medium text-muted-foreground">Endereço de Email</label>
                  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                    <input 
                      name="email" 
                      type="email" 
                      placeholder="Digite seu endereço de email" 
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                      style={{ fontSize: '16px' }}
                      disabled={loading}
                      required 
                    />
                  </div>
                </div>

                <div className="animate-element animate-delay-450">
                  <label className="text-sm font-medium text-muted-foreground">Senha</label>
                  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                    <input 
                      name="password" 
                      type="password" 
                      placeholder="Crie uma senha segura" 
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                      style={{ fontSize: '16px' }}
                      disabled={loading}
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="animate-element animate-delay-500 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Criar Conta"}
                </button>
              </form>

              <p className="animate-element animate-delay-550 text-center text-sm text-muted-foreground">
                Já tem uma conta? <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('login'); }} className="text-violet-400 hover:underline transition-colors">Fazer Login</a>
              </p>
            </div>
          </div>
        </section>

        {sampleTestimonials.length > 0 && (
          <section className="hidden md:block flex-1 relative p-4">
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${loginHeroImage})` }}></div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <div className={`animate-testimonial animate-delay-1000 flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
                <img src={sampleTestimonials[0].avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
                <div className="text-sm leading-snug">
                  <p className="flex items-center gap-1 font-medium">{sampleTestimonials[0].name}</p>
                  <p className="text-muted-foreground">{sampleTestimonials[0].handle}</p>
                  <p className="mt-1 text-foreground/80">{sampleTestimonials[0].text}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  // Tela principal de login
  return (
    <SignInPage
      title={
        selectedUserType === 'customer' 
          ? <span className="font-light text-foreground tracking-tighter">Bem-vindo, Cliente!</span>
          : selectedUserType === 'seller'
          ? <span className="font-light text-foreground tracking-tighter">Bem-vindo, Vendedor!</span>
          : <span className="font-light text-foreground tracking-tighter">Bem-vindo!</span>
      }
      description={
        selectedUserType === 'customer'
          ? "Acesse seus cursos e compras"
          : selectedUserType === 'seller'
          ? "Gerencie seus produtos e vendas"
          : "Acesse sua conta e continue sua jornada conosco"
      }
      heroImageSrc={loginHeroImage}
      testimonials={sampleTestimonials}
      onSignIn={handleSignIn}
      onResetPassword={() => setCurrentView('password-recovery')}
      onCreateAccount={() => setCurrentView('signup')}
      loading={loading}
      error={errorField}
      selectedUserType={selectedUserType}
      onUserTypeSelect={handleUserTypeSelect}
    />
  );
};

export default Auth;
