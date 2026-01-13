import React, { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import TwoFactorCard from '@/components/TwoFactorCard';
import { Shield } from 'lucide-react';

// Logo component
const LogoIcon = () => (
  <div className="w-16 h-16 bg-foreground rounded-full flex items-center justify-center">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
    </div>
  </div>
);

export default function AdminLogin() {
  const {
    admin,
    login,
    loading,
    loginStep,
    completeAdminLogin,
    cancelAdminLogin
  } = useAdminAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (admin) {
    return <Navigate to="/admin/select-region" replace />;
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
        <TwoFactorCard
          email={email}
          context="login"
          onVerificationSuccess={handle2FASuccess}
          onBack={handle2FACancel}
          skipInitialSend={true}
          title="Verificação de Segurança"
          subtitle={`Código enviado para ${email}`}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="rounded-3xl p-6 md:p-8 w-full max-w-sm relative overflow-hidden bg-card border border-border shadow-lg">
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <LogoIcon />
          </div>

          {/* Title */}
          <h1 className="text-xl md:text-2xl font-semibold text-center text-foreground mb-2">
            Painel Administrativo
          </h1>
          <p className="text-center text-muted-foreground text-sm mb-6">
            Kambafy
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="rounded-xl"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="rounded-xl"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl"
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

          <div className="mt-4 p-3 bg-muted rounded-xl">
            <p className="text-xs text-muted-foreground text-center">
              Autenticação de dois fatores obrigatória para administradores
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}