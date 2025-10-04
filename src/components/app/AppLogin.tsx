import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Moon, Sun } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSellerTheme } from '@/hooks/useSellerTheme';
import { useDeviceContext } from '@/hooks/useDeviceContext';
import { checkAndSaveDevice } from '@/utils/deviceTracking';
import { supabase } from '@/integrations/supabase/client';

export function AppLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [welcomeBackMessage, setWelcomeBackMessage] = useState('');
  const { signIn, resetPassword } = useAuth();
  const { toast } = useToast();
  const { isDark, theme, setTheme } = useSellerTheme();
  const { context: deviceContext, loading: deviceLoading } = useDeviceContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWelcomeBackMessage('');
    
    if (!deviceContext || deviceLoading) {
      setError('Aguarde enquanto verificamos seu dispositivo...');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Iniciando login...');
      
      // Verificar dispositivo ANTES do login para mostrar mensagem
      // Buscar se já existe registro deste dispositivo com este email
      const { data: existingDevices } = await supabase
        .from('user_devices')
        .select('device_fingerprint')
        .eq('device_fingerprint', deviceContext.fingerprint);
      
      const isKnownDevice = existingDevices && existingDevices.length > 0;
      
      // Mostrar mensagem antes de fazer login
      if (isKnownDevice) {
        setWelcomeBackMessage('Bem-vindo de volta! 👋 Reconhecemos seu dispositivo.');
        // Aguardar um pouco para o usuário ver a mensagem
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      const { error } = await signIn(email, password);
      if (error) throw error;

      console.log('✅ Login bem-sucedido!');
      
      // Salvar/atualizar dispositivo após login
      const { data: { user } } = await supabase.auth.getUser();
      if (user && deviceContext) {
        await checkAndSaveDevice(user.id, deviceContext);
      }
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      setWelcomeBackMessage('');
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Modern Clean Header */}
        <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <img 
                src={isDark ? "/kambafy-logo-light-green.png" : "/kambafy-logo-new.svg"} 
                alt="Kambafy" 
                className="h-16 w-auto"
              />
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-full bg-background hover:bg-accent flex items-center justify-center transition-colors border border-border"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-foreground" />
                ) : (
                  <Moon className="h-5 w-5 text-foreground" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <Card className="overflow-hidden border-none shadow-sm bg-card">
              <div className="p-8 space-y-6">
              {/* Back button for forgot password */}
              {isForgotPassword && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setIsForgotPassword(false);
                    setEmailSent(false);
                    setError('');
                  }}
                  className="flex items-center gap-2 mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Login
                </Button>
              )}

              {/* Title */}
              <div className="text-center space-y-2">
                <div className="flex items-center gap-2 justify-center">
                  {isForgotPassword && <Mail className="w-5 h-5 text-primary" />}
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {isForgotPassword ? 'Recuperar Senha' : 'Bem-vindo'}
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isForgotPassword 
                    ? 'Digite seu email para receber instruções de recuperação de senha.' 
                    : welcomeBackMessage || 'Entre na sua conta Kambafy'}
                </p>
              </div>

              {/* Form or Success Message */}
              {isForgotPassword && emailSent ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Email Enviado!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enviamos instruções para <strong>{email}</strong>. 
                      Verifique sua caixa de entrada e spam.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Form */}
                  <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={isForgotPassword ? "Seu email" : "seu@email.com"}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-11"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>

                    {/* Password (only for login) */}
                    {!isForgotPassword && (
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Senha
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 h-11"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {error && (
                      <p className="text-sm text-destructive text-center">{error}</p>
                    )}
                    {welcomeBackMessage && (
                      <p className="text-sm text-primary text-center font-medium">{welcomeBackMessage}</p>
                    )}

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      {isLoading 
                        ? (isForgotPassword ? 'Enviando...' : 'Aguarde...') 
                        : (isForgotPassword ? 'Enviar Email de Recuperação' : 'Entrar')}
                    </Button>
                  </form>

                  {/* Forgot Password Link */}
                  {!isForgotPassword && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}
                </>
              )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
