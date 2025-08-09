import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { Wallet, ArrowUpCircle, LogIn, UserPlus } from 'lucide-react';

interface KambaPayRegistrationProps {
  onSuccess?: (email: string) => void;
}

export function KambaPayRegistration({ onSuccess }: KambaPayRegistrationProps) {
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { registerKambaPayEmail, balance, fetchBalanceByEmail } = useKambaPayBalance();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsRegistering(true);
    try {
      const success = await registerKambaPayEmail(email);
      
      if (success) {
        toast.success('Conta KambaPay criada com sucesso!');
        onSuccess?.(email);
        setEmail('');
      } else {
        toast.error('Erro ao criar conta. Email pode já estar registrado.');
      }
    } catch (error) {
      toast.error('Erro inesperado ao criar conta');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoggingIn(true);
    try {
      const balance = await fetchBalanceByEmail(email);
      
      if (balance !== null) {
        toast.success('Login realizado com sucesso!');
        onSuccess?.(email);
        setEmail('');
      } else {
        toast.error('Email não encontrado. Verifique o email ou crie uma conta.');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

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
                    Fazendo login...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
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
                    Criando conta...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Conta KambaPay
                  </>
                )}
              </Button>
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