import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, X, ShoppingBag, TrendingUp, Wallet, Fingerprint } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDeviceContext } from '@/hooks/useDeviceContext';
import { checkAndSaveDevice } from '@/utils/deviceTracking';
import { supabase } from '@/integrations/supabase/client';
import { BiometricService } from '@/utils/biometricService';
import { BiometryType } from 'capacitor-native-biometric';
import { motion, AnimatePresence } from 'framer-motion';
import { PoliciesModal } from './PoliciesModal';
import { useTheme } from 'next-themes';
import kambafyLogoGray from '@/assets/kambafy-logo-gray.png';
type LoginView = 'onboarding' | 'email-login';
const onboardingSlides = [{
  title: 'Venda seus produtos digitais com facilidade',
  icon: ShoppingBag,
  gradient: 'from-orange-500 to-red-600'
}, {
  title: 'Gerencie suas vendas em tempo real',
  icon: TrendingUp,
  gradient: 'from-blue-500 to-cyan-600'
}, {
  title: 'Receba seus pagamentos com segurança',
  icon: Wallet,
  gradient: 'from-purple-500 to-pink-600'
}];
export function AppLogin() {
  const [view, setView] = useState<LoginView>('onboarding');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometryType | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyType, setPolicyType] = useState<'terms' | 'privacy'>('terms');
  const {
    signIn,
    resetPassword
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    context: deviceContext,
    loading: deviceLoading
  } = useDeviceContext();
  const { theme } = useTheme();
  console.log('🔍 AppLogin renderizado - View atual:', view);

  // Auto-rotate slides
  useEffect(() => {
    console.log('🎯 Slide effect ativo');
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % onboardingSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Verificar disponibilidade biométrica
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await BiometricService.isAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await BiometricService.getBiometryType();
        setBiometricType(type);

        // Verificar se existem credenciais salvas e ir direto para login
        const credentials = await BiometricService.getCredentials();
        if (credentials) {
          setView('email-login');
          const authenticated = await BiometricService.authenticate('Autentique-se para entrar');
          if (authenticated) {
            setEmail(credentials.username);
            setPassword(credentials.password);
            setTimeout(() => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }, 100);
          }
        }
      }
    };
    checkBiometric();
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (deviceLoading && !deviceContext) {
      setError('Aguarde enquanto verificamos seu dispositivo...');
      return;
    }
    setIsLoading(true);
    try {
      console.log('🔐 Iniciando login...');
      const {
        error
      } = await signIn(email, password);
      if (error) {
        console.error('❌ Erro no login:', error);
        let errorMessage = 'Erro ao fazer login. Tente novamente.';
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Email ou palavra-passe incorretos.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor, confirme seu email antes de fazer login.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        setError(errorMessage);
        toast({
          title: "Erro ao fazer login",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }
      console.log('✅ Login bem-sucedido!');
      localStorage.setItem('kambafy_device_known', 'true');
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user && deviceContext) {
        await checkAndSaveDevice(user.id, deviceContext);
      }
      if (biometricAvailable && email && password) {
        const credentials = await BiometricService.getCredentials();
        if (!credentials) {
          setShowBiometricPrompt(true);
        }
      }
    } catch (error: any) {
      console.error('❌ Erro inesperado no login:', error);
      const errorMessage = error?.message || 'Erro inesperado ao fazer login.';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleBiometricLogin = async () => {
    const credentials = await BiometricService.getCredentials();
    if (!credentials) {
      toast({
        title: "Biometria não configurada",
        description: "Faça login primeiro para configurar.",
        variant: "destructive"
      });
      return;
    }
    const authenticated = await BiometricService.authenticate();
    if (authenticated) {
      setEmail(credentials.username);
      setPassword(credentials.password);
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }, 100);
    }
  };
  const handleEnableBiometric = async () => {
    const success = await BiometricService.enableBiometric(email, password);
    if (success) {
      toast({
        title: "Biometria ativada! 🎉",
        description: `${BiometricService.getBiometryTypeName(biometricType)} configurado com sucesso.`
      });
    } else {
      toast({
        title: "Erro ao ativar biometria",
        description: "Não foi possível configurar a autenticação biométrica.",
        variant: "destructive"
      });
    }
    setShowBiometricPrompt(false);
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, insira seu email.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await resetPassword(email);
      if (result.error) {
        setError('Erro ao enviar email de recuperação. Verifique se o email está correto.');
      } else {
        setEmailSent(true);
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha."
        });
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    console.log('🔵 handleGoogleLogin iniciado');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`
        }
      });
      
      console.log('🔵 Google OAuth response:', { data, error });
      
      if (error) {
        console.error('❌ Google OAuth error:', error);
        throw error;
      }
      
      console.log('✅ Google OAuth success, redirecting...');
    } catch (error: any) {
      console.error('❌ Google login error caught:', error);
      toast({
        title: "Erro no login Google",
        description: error?.message || "Não foi possível conectar com Google. Verifique as configurações.",
        variant: "destructive"
      });
    }
  };
  if (view === 'onboarding') {
    return <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted text-foreground flex flex-col relative overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 pt-20">
          {/* Logo */}
          <div className="mb-8">
            <img 
              alt="Kambafy" 
              className="h-16 w-auto" 
              src={theme === 'dark' ? kambafyLogoGray : "/lovable-uploads/27fc8e20-d6cd-443c-8c75-b5ddb1de9f23.png"} 
            />
          </div>

          {/* Onboarding Slides */}
          <div className="w-full max-w-md mb-12">
            <div className="text-center space-y-8">
              <h1 className="text-2xl font-bold leading-tight px-4">
                {onboardingSlides[currentSlide].title}
              </h1>
              
              {/* Icon with gradient */}
              <div className="flex justify-center">
                <div className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${onboardingSlides[currentSlide].gradient} flex items-center justify-center shadow-2xl`}>
                  {(() => {
                  const IconComponent = onboardingSlides[currentSlide].icon;
                  return <IconComponent className="w-16 h-16 text-primary-foreground" />;
                })()}
                </div>
              </div>
            </div>

            {/* Slide indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {onboardingSlides.map((_, index) => <button key={index} onClick={() => setCurrentSlide(index)} className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-foreground/30'}`} />)}
            </div>
          </div>

          {/* Login Buttons */}
          <div className="w-full max-w-md space-y-3 relative" style={{
          zIndex: 100
        }}>
            <div className="space-y-2">
              <button type="button" onClick={() => {
              console.log('🔵 Google button clicked');
              handleGoogleLogin();
            }} className="w-full h-14 flex items-center justify-center bg-card text-card-foreground rounded-2xl font-semibold text-base cursor-pointer border border-border shadow-lg hover:bg-accent transition-colors">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" style={{
                pointerEvents: 'none'
              }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span style={{
                pointerEvents: 'none'
              }}>Entrar com Google</span>
              </button>
              <p className="text-xs text-muted-foreground text-center px-4">
                Login rápido para contas já cadastradas
              </p>
            </div>

            <button type="button" onClick={() => {
            console.log('📧 EMAIL BUTTON CLICKED!');
            setView('email-login');
          }} className="w-full h-14 flex items-center justify-center bg-transparent border border-border rounded-2xl text-foreground font-semibold text-base cursor-pointer hover:bg-accent transition-colors">
              <Mail className="w-5 h-5 mr-3" style={{
              pointerEvents: 'none'
            }} />
              <span style={{
              pointerEvents: 'none'
            }}>Continuar com Email</span>
            </button>
          </div>
        </div>

          {/* Footer */}
        <div className="pb-8 px-6 text-center space-y-2 relative z-10">
          <p className="text-sm text-muted-foreground">
            Nós Valorizamos a Sua Privacidade
          </p>
          <p className="text-xs text-muted-foreground/70">
            Ao registar-se aceita os nossos{' '}
            <button type="button" onClick={e => {
            e.preventDefault();
            console.log('🔘 Terms button clicked');
            setPolicyType('terms');
            setShowPolicyModal(true);
          }} className="underline hover:text-foreground transition-colors cursor-pointer">
              Termos de Utilização
            </button>{' '}
            e a nossa{' '}
            <button type="button" onClick={e => {
            e.preventDefault();
            console.log('🔘 Privacy button clicked');
            setPolicyType('privacy');
            setShowPolicyModal(true);
          }} className="underline hover:text-foreground transition-colors cursor-pointer">
              Política de Privacidade
            </button>
            .
          </p>
        </div>

        {/* Policies Modal */}
        <PoliciesModal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} policyType={policyType} />
      </div>;
  }

  // Email Login View
  return <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted text-foreground flex flex-col relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Header with back button */}
      <div className="relative z-10 px-6 py-6 flex items-center">
        <button onClick={() => {
        if (isForgotPassword) {
          setIsForgotPassword(false);
          setEmailSent(false);
          setError('');
        } else {
          setView('onboarding');
        }
      }} className="w-10 h-10 flex items-center justify-center rounded-full bg-accent/50 hover:bg-accent backdrop-blur-sm transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold pr-10">
          {isForgotPassword ? 'Recuperar Senha' : 'Iniciar sessão'}
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-20 relative z-10">
        {isForgotPassword && emailSent ? <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Email Enviado!</h2>
            <p className="text-muted-foreground text-sm">
              Enviamos instruções para <strong className="text-foreground">{email}</strong>. 
              Verifique sua caixa de entrada e spam.
            </p>
          </motion.div> : <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-6 max-w-md mx-auto w-full">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">
                Email
              </Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="h-14 bg-accent/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:border-primary focus:ring-primary" disabled={isLoading} required />
            </div>

            {/* Password (only for login) */}
            {!isForgotPassword && <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-muted-foreground">
                  Palavra-passe
                </Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-14 bg-accent/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl pr-12 focus:border-primary focus:ring-primary" disabled={isLoading} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>}

            {/* Error Message */}
            {error && <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-lg">{error}</p>}

            {/* Submit Button */}
            <div className="flex gap-3">
              {biometricAvailable && !isForgotPassword && <Button type="button" onClick={handleBiometricLogin} disabled={isLoading} className="h-14 w-14 bg-accent/50 hover:bg-accent border-border rounded-xl flex-shrink-0">
                  <Fingerprint className="h-6 w-6" />
                </Button>}
              <Button type="submit" disabled={isLoading} className="flex-1 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-base">
                {isLoading ? 'Aguarde...' : isForgotPassword ? 'Enviar Email' : 'Continuar'}
              </Button>
            </div>

            {/* Forgot Password Link */}
            {!isForgotPassword && <div className="text-center">
                <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Esqueceu-se da Palavra-passe?
                </button>
              </div>}
          </form>}
      </div>

      {/* Footer */}
      <div className="pb-8 px-6 text-center space-y-2 relative z-10">
        <p className="text-sm text-muted-foreground">
          Nós Valorizamos a Sua Privacidade
        </p>
        <p className="text-xs text-muted-foreground/70">
          Ao registar-se aceita os nossos{' '}
          <button type="button" onClick={e => {
          e.preventDefault();
          console.log('🔘 Terms button clicked');
          setPolicyType('terms');
          setShowPolicyModal(true);
        }} className="underline hover:text-foreground transition-colors cursor-pointer">
            Termos de Utilização
          </button>{' '}
          e a nossa{' '}
          <button type="button" onClick={e => {
          e.preventDefault();
          console.log('🔘 Privacy button clicked');
          setPolicyType('privacy');
          setShowPolicyModal(true);
        }} className="underline hover:text-foreground transition-colors cursor-pointer">
            Política de Privacidade
          </button>
          .
        </p>
      </div>

      {/* Biometric Prompt Dialog */}
      <AnimatePresence>
        {showBiometricPrompt && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div initial={{
          scale: 0.9,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.9,
          opacity: 0
        }} className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border shadow-2xl">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-primary" />
                    Ativar {BiometricService.getBiometryTypeName(biometricType)}?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Deseja usar {BiometricService.getBiometryTypeName(biometricType)} para entrar mais rapidamente na próxima vez?
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowBiometricPrompt(false)}>
                    Agora não
                  </Button>
                  <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleEnableBiometric}>
                    Ativar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>

      {/* Policies Modal */}
      <PoliciesModal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} policyType={policyType} />
    </div>;
}