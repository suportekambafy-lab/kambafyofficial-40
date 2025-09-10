
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/useCustomToast';
import PasswordRecovery from '@/components/PasswordRecovery';
import SignUpCodeVerification from '@/components/SignUpCodeVerification';
import { supabase } from '@/integrations/supabase/client';
import { SignInPage, Testimonial } from '@/components/ui/sign-in';
import { CountrySelector } from '@/components/auth/CountrySelector';
import { useGeoLocation } from '@/hooks/useGeoLocation';

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Ana Silva",
    handle: "@anadigital",
    text: "Plataforma incrível! A experiência do usuário é perfeita e os recursos são exatamente o que eu precisava."
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
  const errorParam = searchParams.get('error');
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'password-recovery' | 'reset-password' | 'signup-verification'>('login');
  const [selectedUserType, setSelectedUserType] = useState<'customer' | 'seller' | null>(userTypeParam);
  
  // Estados para verificação de signup
  const [signupData, setSignupData] = useState<{
    email: string;
    password: string;
    fullName: string;
  } | null>(null);
  
  // Estados para o novo design
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorField, setErrorField] = useState('');
  
  // Estados para redefinição de senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // Estados para seleção de país
  const [selectedCountry, setSelectedCountry] = useState<string>('AO');
  const { supportedCountries } = useGeoLocation();
  
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  // Não precisamos mais do useToast

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
    
    // Verificar se há erro de login com Google
    if (errorParam === 'google-account-not-found') {
      setErrorField('Esta conta do Google não está cadastrada. Por favor, crie uma conta primeiro usando o botão "Criar conta" ou faça o cadastro com email e senha.');
      setCurrentView('signup');
      // Limpar o erro da URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('error');
      navigate(`/auth?${newSearchParams.toString()}`, { replace: true });
    }
  }, [mode, userTypeParam, errorParam, searchParams, navigate]);

  useEffect(() => {
    if (user) {
      const userType = localStorage.getItem('userType') || 'business';
      const redirectPath = userType === 'customer' ? '/minhas-compras' : '/vendedor';
      
      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });
      
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, toast]);

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
          
          // Mostrar toast específico para email não confirmado
          toast({
            title: "⚠️ Email não confirmado",
            description: "Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada.",
            variant: "destructive"
          });
        }

        setErrorField(message);
      }
    } catch (error) {
      setErrorField("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!selectedUserType) {
      setErrorField("Por favor, selecione o tipo de usuário primeiro.");
      return;
    }

    try {
      setLoading(true);
      setErrorField('');
      
      // Primeiro verificar se o usuário já existe tentando fazer login silencioso
      const { data: { user: existingUser }, error: sessionError } = await supabase.auth.getUser();
      
      if (sessionError && sessionError.message.includes('Invalid JWT')) {
        // Usuário não está logado, podemos prosseguir
      }
      
      const userType = selectedUserType === 'customer' ? 'customer' : 'business';
      localStorage.setItem('userType', userType);
      
      // Marcar que é tentativa de login (não signup)
      localStorage.setItem('googleAuthMode', 'signin');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth?type=${selectedUserType}&mode=google-callback`
        }
      });

      if (error) {
        setErrorField('Erro ao fazer login com Google. Tente novamente.');
      }
    } catch (error) {
      setErrorField('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!selectedUserType) {
      setErrorField("Por favor, selecione o tipo de usuário primeiro.");
      return;
    }

    try {
      setLoading(true);
      setErrorField('');
      
      const userType = selectedUserType === 'customer' ? 'customer' : 'business';
      localStorage.setItem('userType', userType);
      
      // Marcar que é signup com Google
      localStorage.setItem('googleAuthMode', 'signup');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth?type=${selectedUserType}&mode=google-callback`
        }
      });

      if (error) {
        setErrorField('Erro ao criar conta com Google. Tente novamente.');
      }
    } catch (error) {
      setErrorField('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
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

    if (!selectedUserType) {
      setErrorField("Por favor, selecione o tipo de usuário.");
      return;
    }

    if (!selectedCountry) {
      setErrorField("Por favor, selecione o país da conta.");
      return;
    }

    setLoading(true);
    setErrorField('');

    try {
      const userType = selectedUserType === 'customer' ? 'customer' : 'business';
      localStorage.setItem('userType', userType);
      localStorage.setItem('userCountry', selectedCountry);
      
      // Fazer signup sem confirmação automática
      const result = await signUp(email, password, fullName);

      if (result.error) {
        let message = "Ocorreu um erro. Tente novamente.";
        
        if (result.error.message.includes('User already registered')) {
          message = "Este email já está registrado. Tente fazer login.";
        } else if (result.error.message.includes('Password')) {
          message = "A senha deve ter pelo menos 6 caracteres.";
        } else if (result.error.message.includes('email')) {
          message = "Por favor, insira um email válido.";
        }

        setErrorField(message);
      } else {
        // Salvar dados do signup e ir para verificação
        setSignupData({
          email,
          password,
          fullName
        });
        setCurrentView('signup-verification');
        setErrorField('');
      }
    } catch (error) {
      setErrorField("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupVerificationSuccess = () => {
    // Após verificação bem-sucedida, voltar para login
    setCurrentView('login');
    setSignupData(null);
    toast({
      title: "Conta criada com sucesso!",
      description: "Sua conta foi confirmada. Você já pode fazer login.",
    });
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
        
        const redirectPath = selectedUserType === 'customer' ? '/minhas-compras' : '/vendedor';
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

  if (currentView === 'signup-verification') {
    if (!signupData) {
      setCurrentView('signup');
      return null;
    }
    
    return (
      <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
        <section className="flex-1 flex items-center justify-center p-8">
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
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80)` }}></div>
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
      <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw]">
        <section className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="flex flex-col gap-6">
              <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
                <span className="font-light text-foreground tracking-tighter">Redefinir Senha</span>
              </h1>
              <p className="animate-element animate-delay-200 text-muted-foreground">Digite sua nova senha</p>

              {errorField && (
                <div className="animate-element animate-delay-250 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {errorField}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleResetPassword}>
                <div className="animate-element animate-delay-300">
                  <label className="text-sm font-medium text-muted-foreground">Nova Senha</label>
                  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                    <input 
                      type="password"
                      placeholder="Digite sua nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                      style={{ fontSize: '16px' }}
                      disabled={resetLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="animate-element animate-delay-400">
                  <label className="text-sm font-medium text-muted-foreground">Confirmar Nova Senha</label>
                  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                    <input 
                      type="password"
                      placeholder="Confirme sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                      style={{ fontSize: '16px' }}
                      disabled={resetLoading}
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="animate-element animate-delay-500 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
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
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80)` }}></div>
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
                  <CountrySelector
                    selectedCountry={selectedCountry}
                    onCountryChange={setSelectedCountry}
                    supportedCountries={supportedCountries}
                    disabled={loading}
                  />
                </div>

                <div className="animate-element animate-delay-500">
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
                  className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Criar Conta"}
                </button>
              </form>

              <div className="animate-element animate-delay-650 flex items-center gap-4">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground font-medium">OU</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <button 
                onClick={handleGoogleSignUp} 
                className="animate-element animate-delay-700 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors disabled:opacity-50"
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
                  <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-2.624-.2-5.235-.389-7.917z" />
                </svg>
                Criar conta com Google
              </button>

              <p className="animate-element animate-delay-750 text-center text-sm text-muted-foreground">
                Já tem uma conta? <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('login'); }} className="text-violet-400 hover:underline transition-colors">Fazer Login</a>
              </p>
            </div>
          </div>
        </section>

        {sampleTestimonials.length > 0 && (
          <section className="hidden md:block flex-1 relative p-4">
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80)` }}></div>
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
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={sampleTestimonials}
      onSignIn={handleSignIn}
      onGoogleSignIn={handleGoogleSignIn}
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
