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
  logo_url?: string;
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
          .select('id, name, description, url, logo_url')
          .eq('id', areaId)
          .single();

        // If not found by ID, try by URL
        if (error || !data) {
          const { data: dataByUrl, error: errorByUrl } = await supabase
            .from('member_areas')
            .select('id, name, description, url, logo_url')
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
      
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo/Brand Section */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
            {memberArea?.logo_url ? (
              <img
                src={memberArea.logo_url}
                alt={`${memberArea.name} Logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{memberArea.name}</h1>
          {memberArea.description && (
            <p className="text-gray-300 max-w-md">{memberArea.description}</p>
          )}
        </div>

        {/* Login Card */}
        <Card className="w-full max-w-md shadow-2xl border-0 bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-semibold text-white">Acesse sua área exclusiva</CardTitle>
            <p className="text-sm text-gray-300">
              Entre para continuar seus estudos
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-200">Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-200">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg font-medium text-white"
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
            <div className="pt-4 border-t border-gray-700">
              <div className="space-y-3 text-xs text-gray-400">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Você deve ter comprado um produto que dá acesso a esta área</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
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
          className="mt-6 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}