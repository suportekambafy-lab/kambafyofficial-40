
import React, { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import TwoFactorVerification from '@/components/TwoFactorVerification';
import { Shield } from 'lucide-react';

export default function AdminLogin() {
  const { admin, login, loading, loginStep, completeAdminLogin, cancelAdminLogin } = useAdminAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-checkout-green"></div>
      </div>
    );
  }

  if (admin) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error, requires2FA } = await login(email, password);
      
      if (error) {
        toast({
          title: 'Erro no login',
          description: error,
          variant: 'destructive'
        });
      } else if (requires2FA) {
        toast({
          title: 'Verificação de segurança',
          description: 'Código de verificação enviado por email'
        });
      } else {
        toast({
          title: 'Login realizado',
          description: 'Acesso ao painel administrativo autorizado'
        });
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao fazer login',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASuccess = async () => {
    try {
      await completeAdminLogin();
      toast({
        title: 'Acesso autorizado',
        description: 'Bem-vindo ao painel administrativo'
      });
    } catch (error) {
      toast({
        title: 'Erro de verificação',
        description: 'Falha na verificação 2FA',
        variant: 'destructive'
      });
    }
  };

  const handle2FACancel = () => {
    cancelAdminLogin();
    toast({
      title: 'Login cancelado',
      description: 'Verificação 2FA cancelada'
    });
  };

  // Se estiver aguardando 2FA
  if (loginStep === 'awaiting_2fa' && email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-checkout-green" />
              <CardTitle className="text-2xl font-bold text-checkout-green">
                Verificação 2FA
              </CardTitle>
            </div>
            <p className="text-muted-foreground">
              Código enviado para {email}
            </p>
          </CardHeader>
          <CardContent>
            <TwoFactorVerification
              email={email}
              context="login"
              onVerificationSuccess={handle2FASuccess}
              onBack={handle2FACancel}
              skipInitialSend={true}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-checkout-green" />
            <CardTitle className="text-2xl font-bold text-checkout-green">
              Painel Administrativo
            </CardTitle>
          </div>
          <p className="text-muted-foreground">
            Kambafy Admin - Acesso Seguro
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-checkout-green hover:bg-checkout-green/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Entrar com 2FA
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-orange-50 rounded-md">
            <p className="text-xs text-orange-800 text-center">
              <Shield className="w-4 h-4 inline mr-1" />
              Autenticação de dois fatores obrigatória para administradores
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
