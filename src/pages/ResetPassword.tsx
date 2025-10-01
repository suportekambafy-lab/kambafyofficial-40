import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useCustomToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const setupSession = async () => {
      console.log('🔍 URL completa:', window.location.href);
      console.log('🔍 Hash:', window.location.hash);
      
      // PRIMEIRO: Verificar se já existe uma sessão válida (Supabase já processou o link)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('✅ Sessão já válida, usuário pode redefinir senha');
        setAccessToken(session.access_token);
        setRefreshToken(session.refresh_token);
        return;
      }
      
      // Se não há sessão, verificar se há erro na URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorCode = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      
      if (errorCode) {
        console.error('❌ Erro na URL:', { errorCode, errorDescription });
        
        if (errorCode === 'access_denied' && errorDescription?.includes('expired')) {
          setError('O link de recuperação expirou. Links de recuperação são válidos por apenas 1 hora. Por favor, solicite um novo link.');
        } else {
          setError(`Link inválido: ${errorDescription || errorCode}. Por favor, solicite um novo link.`);
        }
        return;
      }
      
      // Se não há sessão nem erro, o link é inválido
      console.error('❌ Nenhuma sessão válida e nenhum token na URL');
      setError('Link de redefinição inválido. Por favor, solicite um novo link de recuperação.');
    };

    setupSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessToken || !refreshToken) {
      setError('Link de redefinição inválido ou expirado.');
      return;
    }

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
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        variant: 'success',
        title: 'Sucesso!',
        message: 'Senha definida com sucesso! Você será redirecionado para fazer login.'
      });
      
      // Sign out and redirect to auth page
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao definir senha:', error);
      setError(error.message || 'Erro ao definir nova senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken || !refreshToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Link Inválido</CardTitle>
            <CardDescription>
              O link de redefinição de senha é inválido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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