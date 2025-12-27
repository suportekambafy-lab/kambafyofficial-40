import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Code, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PartnersLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Login com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw new Error(authError.message === "Invalid login credentials" 
          ? "Email ou senha incorretos" 
          : authError.message);
      }

      if (!authData.user) {
        throw new Error("Erro ao fazer login");
      }

      // Verificar se o usuário é um parceiro aprovado
      const { data: partnerData, error: partnerError } = await (supabase as any)
        .from('partners')
        .select('id, status, company_name')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (partnerError) {
        throw new Error("Erro ao verificar status de parceiro");
      }

      if (!partnerData) {
        // Não é parceiro - fazer logout e informar
        await supabase.auth.signOut();
        toast({
          title: "Acesso Negado",
          description: "Esta conta não está registrada como parceiro. Faça sua candidatura primeiro.",
          variant: "destructive"
        });
        navigate('/partners/apply');
        return;
      }

      if (partnerData.status !== 'approved') {
        // Parceiro não aprovado
        await supabase.auth.signOut();
        toast({
          title: "Aguardando Aprovação",
          description: `Sua candidatura como "${partnerData.company_name}" ainda está em análise. Você receberá um email quando for aprovado.`,
          variant: "default"
        });
        return;
      }

      // Parceiro aprovado - redirecionar para o portal
      toast({
        title: "Bem-vindo!",
        description: `Login realizado com sucesso. Bem-vindo, ${partnerData.company_name}!`,
      });
      navigate('/partners/portal');

    } catch (error: any) {
      toast({
        title: "Erro no Login",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <SEO 
        title="Login de Parceiros - Kambafy Payments"
        description="Acesse o portal de parceiros Kambafy para gerenciar sua integração de pagamentos"
      />
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <Code className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Portal de Parceiros</CardTitle>
          <CardDescription>
            Faça login para acessar seu dashboard de integração
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-muted-foreground">
              Ainda não é parceiro?{" "}
              <Link to="/partners/apply" className="text-primary hover:underline font-medium">
                Faça sua candidatura
              </Link>
            </p>
            
            <Link 
              to="/" 
              className="inline-flex items-center text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar ao site
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
