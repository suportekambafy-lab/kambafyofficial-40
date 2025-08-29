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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso à Área de Membros</CardTitle>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-blue-700">{memberArea.name}</h3>
            {memberArea.description && (
              <p className="text-sm text-muted-foreground">{memberArea.description}</p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <Lock className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-700">
              Insira suas informações para acessar o conteúdo exclusivo
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Digite seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || !email.trim() || !name.trim()}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  Verificando acesso...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Acessar Área de Membros
                </>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0"></span>
                Você deve ter comprado um produto que dá acesso a esta área de membros
              </p>
              <p className="flex items-start gap-2">
                <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0"></span>
                Use o mesmo e-mail da compra para fazer login
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}