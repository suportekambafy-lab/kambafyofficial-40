import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Lock, BookOpen, ArrowLeft } from 'lucide-react';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';

interface MemberArea {
  id: string;
  name: string;
  description?: string;
  url: string;
}

export default function MemberAreaLogin() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loading: authLoading, isAuthenticated } = useMemberAreaAuth();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
  const [memberAreaLoading, setMemberAreaLoading] = useState(true);

  // Load member area info
  useEffect(() => {
    const loadMemberArea = async () => {
      if (!areaId) {
        navigate('/');
        return;
      }

      try {
        // First try by ID
        let { data, error } = await supabase
          .from('member_areas')
          .select('id, name, description, url')
          .eq('id', areaId)
          .single();

        // If not found by ID, try by URL
        if (error || !data) {
          const { data: dataByUrl, error: errorByUrl } = await supabase
            .from('member_areas')
            .select('id, name, description, url')
            .eq('url', areaId)
            .single();

          if (errorByUrl || !dataByUrl) {
            toast({
              title: "Erro",
              description: "Área de membros não encontrada",
              variant: "destructive"
            });
            navigate('/');
            return;
          }

          data = dataByUrl;
        }

        setMemberArea(data as MemberArea);
      } catch (error) {
        console.error('Error loading member area:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar área de membros",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setMemberAreaLoading(false);
      }
    };

    loadMemberArea();
  }, [areaId, navigate, toast]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && memberArea) {
      navigate(`/area/${memberArea.id}`);
    }
  }, [isAuthenticated, memberArea, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberArea || !email.trim() || !name.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const success = await login(memberArea.id, email.trim(), name.trim());
      
      if (success) {
        toast({
          title: "Login realizado!",
          description: `Bem-vindo(a) à ${memberArea.name}`,
        });
        navigate(`/area/${memberArea.id}`);
      } else {
        toast({
          title: "Erro no login",
          description: "Verifique se você tem acesso a esta área de membros",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (memberAreaLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingSpinner text="Carregando..." />
      </div>
    );
  }

  if (!memberArea) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Área não encontrada</h2>
            <p className="text-muted-foreground mb-6">
              A área de membros solicitada não existe ou não está disponível.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
      
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo/Brand Section */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{memberArea.name}</h1>
          {memberArea.description && (
            <p className="text-muted-foreground max-w-md">{memberArea.description}</p>
          )}
        </div>

        {/* Login Card */}
        <Card className="w-full max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-semibold">Acesse sua área exclusiva</CardTitle>
            <p className="text-sm text-muted-foreground">
              Entre para continuar seus estudos
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 auth-input focus-ring transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 auth-input focus-ring transition-all duration-200"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg font-medium"
                disabled={loading || !email.trim() || !name.trim()}
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Verificando acesso...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Entrar na Área de Membros
                  </>
                )}
              </Button>
            </form>

            {/* Info Section */}
            <div className="pt-4 border-t border-border/50">
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Você deve ter comprado um produto que dá acesso a esta área</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Use o mesmo e-mail utilizado na compra</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="mt-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}