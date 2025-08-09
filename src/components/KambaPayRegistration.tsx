import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { Wallet, ArrowUpCircle, LogIn, UserPlus, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface KambaPayRegistrationProps {
  onSuccess?: (email: string) => void;
}

export function KambaPayRegistration({ onSuccess }: KambaPayRegistrationProps) {
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [operationType, setOperationType] = useState<'login' | 'register'>('login');
  const { registerKambaPayEmail, balance, fetchBalanceByEmail } = useKambaPayBalance();

  const send2FACode = async (email: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: { 
          email, 
          event_type: operationType === 'login' ? 'kambapay_login' : 'kambapay_register',
          user_email: email
        }
      });

      if (error) {
        console.error('Erro ao enviar código 2FA:', error);
        toast.error('Erro ao enviar código de verificação');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar 2FA:', error);
      toast.error('Erro ao enviar código de verificação');
      return false;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsRegistering(true);
    setOperationType('register');
    setPendingEmail(email);

    // Enviar código 2FA antes de registrar
    const codeSuccess = await send2FACode(email);
    if (codeSuccess) {
      setShowVerification(true);
      toast.success('Código de verificação enviado para seu email');
    }
    
    setIsRegistering(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoggingIn(true);
    setOperationType('login');
    setPendingEmail(email);

    try {
      // Verificar se o email existe primeiro
      const balance = await fetchBalanceByEmail(email);
      
      if (balance === null) {
        toast.error('Email não encontrado. Verifique o email ou crie uma conta.');
        setIsLoggingIn(false);
        return;
      }

      // Enviar código 2FA para login
      const codeSuccess = await send2FACode(email);
      if (codeSuccess) {
        setShowVerification(true);
        toast.success('Código de verificação enviado para seu email');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Por favor, insira o código de 6 dígitos');
      return;
    }

    try {
      // Verificar o código 2FA via edge function
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { 
          email: pendingEmail,
          code: verificationCode,
          event_type: operationType === 'login' ? 'kambapay_login' : 'kambapay_register'
        }
      });

      if (error || !data?.valid) {
        toast.error('Código inválido ou expirado');
        return;
      }

      if (operationType === 'register') {
        // Proceder com o registro
        const success = await registerKambaPayEmail(pendingEmail);
        
        if (success) {
          toast.success('Conta KambaPay criada com sucesso!');
          onSuccess?.(pendingEmail);
          setEmail('');
          setShowVerification(false);
          setVerificationCode('');
        } else {
          toast.error('Erro ao criar conta. Email pode já estar registrado.');
        }
      } else {
        // Login bem-sucedido
        toast.success('Login realizado com sucesso!');
        onSuccess?.(pendingEmail);
        setEmail('');
        setShowVerification(false);
        setVerificationCode('');
      }
    } catch (error) {
      console.error('Erro na verificação 2FA:', error);
      toast.error('Erro ao verificar código');
    }
  };

  if (showVerification) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Verificação de Segurança</CardTitle>
          <CardDescription>
            Digite o código de 6 dígitos enviado para: <br />
            <strong>{pendingEmail}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code">Código de Verificação</Label>
            <Input
              id="verification-code"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleVerifyCode}
              className="flex-1"
              disabled={verificationCode.length !== 6}
            >
              <Shield className="mr-2 h-4 w-4" />
              Verificar
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                setShowVerification(false);
                setVerificationCode('');
                setPendingEmail('');
              }}
            >
              Cancelar
            </Button>
          </div>

          <div className="text-center">
            <button 
              className="text-sm text-muted-foreground hover:text-primary"
              onClick={() => send2FACode(pendingEmail)}
            >
              Reenviar código
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>KambaPay</CardTitle>
        <CardDescription>
          Faça login ou crie sua conta para usar o KambaPay
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Criar Conta</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <ArrowUpCircle className="mr-2 h-4 w-4 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground text-center bg-muted p-2 rounded">
                <Shield className="h-4 w-4 inline mr-1" />
                Será enviado um código de verificação para seu email
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <ArrowUpCircle className="mr-2 h-4 w-4 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Conta KambaPay
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground text-center bg-muted p-2 rounded">
                <Shield className="h-4 w-4 inline mr-1" />
                Será enviado um código de verificação para seu email
              </div>
            </form>
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Como funciona:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Crie sua conta KambaPay com seu email</li>
                <li>2. Carregue saldo usando métodos de pagamento locais</li>
                <li>3. Use seu email para pagar em qualquer checkout</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}