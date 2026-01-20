import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useCustomToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenHash, setTokenHash] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      // Novo fluxo: token_hash na query string
      const tokenHashParam = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (tokenHashParam && type === 'recovery') {
        // IMPORTANTE: não chamamos verifyOtp aqui para evitar que scanners consumam o token.
        setTokenHash(tokenHashParam);
        setIsValid(true);
        setVerifying(false);
        return;
      }

      // Fluxo antigo: redirect do Supabase com hash (pode vir com erros)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorCode = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (errorCode) {
        if (errorCode === 'access_denied' && errorDescription?.includes('expired')) {
          setError('O link de recuperação expirou. Por favor, solicite um novo link.');
        } else {
          setError('Link inválido. Por favor, solicite um novo link.');
        }
        setVerifying(false);
        return;
      }

      // Verificar se existe sessão (fluxo antigo)
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsValid(true);
        setVerifying(false);
        return;
      }

      setError('Link de redefinição inválido ou expirado. Por favor, solicite um novo link.');
      setVerifying(false);
    };

    setup();
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Se estamos no fluxo token_hash, validar e criar sessão AGORA (no submit)
      if (tokenHash) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });

        if (verifyError) {
          if (verifyError.message?.includes('expired')) {
            setError('O link de recuperação expirou. Por favor, solicite um novo link.');
          } else {
            setError('Link de recuperação inválido. Por favor, solicite um novo link.');
          }
          return;
        }

        if (!data.session) {
          setError('Não foi possível validar o link. Por favor, solicite um novo link.');
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);

      toast({
        variant: 'success',
        title: 'Sucesso!',
        message: 'Senha redefinida com sucesso!'
      });

      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 3000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao definir nova senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <>
        <Helmet>
          <title>Redefinir senha | Kambafy</title>
          <meta name="description" content="Verificando seu link para redefinir a senha da conta Kambafy." />
          <link rel="canonical" href="https://app.kambafy.com/reset-password" />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Verificando link de recuperação...</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Success state
  if (success) {
    return (
      <>
        <Helmet>
          <title>Redefinir senha | Kambafy</title>
          <meta name="description" content="Crie uma nova senha para acessar sua conta Kambafy com segurança." />
          <link rel="canonical" href="https://app.kambafy.com/reset-password" />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Senha Redefinida!</CardTitle>
              <CardDescription>
                Sua senha foi alterada com sucesso. Você será redirecionado para o login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Ir para Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Invalid link state
  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Link Inválido</CardTitle>
            <CardDescription>
              {error || 'O link de redefinição de senha é inválido ou expirou.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Voltar ao Login
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Você pode solicitar um novo link de recuperação na página de login.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-lg flex items-center justify-center p-2">
             <img src="/kambafy-symbol.svg" alt="Kambafy" className="w-full h-full" />
           </div>
          <CardTitle className="text-2xl">Criar Nova Senha</CardTitle>
          <CardDescription>
            Defina uma nova senha segura para sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Definindo senha...
                </>
              ) : (
                'Definir Nova Senha'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
