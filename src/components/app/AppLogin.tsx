import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Lock, Eye, EyeOff, User, Moon, Sun } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSellerTheme } from '@/hooks/useSellerTheme';

export function AppLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const { isDark, theme, setTheme } = useSellerTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name || 'Usuário');
        if (error) throw error;
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar."
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
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
                className="h-12 w-auto"
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
              {/* Title */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {isSignUp ? 'Criar Conta' : 'Bem-vindo'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isSignUp ? 'Comece a vender online hoje' : 'Entre na sua conta Kambafy'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name (only for signup) */}
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Nome completo
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                )}

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
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
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

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {isLoading ? 'Aguarde...' : isSignUp ? 'Criar Conta' : 'Entrar'}
                </Button>
              </form>

              {/* Toggle */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  {isSignUp ? 'Já tem conta? Entre aqui' : 'Não tem conta? Crie uma'}
                </button>
              </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
