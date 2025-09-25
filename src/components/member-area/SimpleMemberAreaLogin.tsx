import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SimpleMemberAreaLogin() {
  const { id: memberAreaId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  console.log('🚀 SimpleMemberAreaLogin renderizado:', { memberAreaId });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberAreaId || !email || !name) return;

    setIsLoading(true);
    console.log('🔑 Tentando login:', { memberAreaId, email, name });

    try {
      // Verificar se o estudante tem acesso a esta área
      const { data: student } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('student_email', email)
        .maybeSingle();

      if (!student) {
        toast.error('Acesso negado. Email não autorizado para esta área.');
        return;
      }

      // Criar sessão
      const { data: session, error } = await supabase.functions.invoke('member-area-login', {
        body: {
          memberAreaId,
          studentEmail: email,
          studentName: name
        }
      });

      if (error) {
        console.error('❌ Erro no login:', error);
        toast.error('Erro ao fazer login');
        return;
      }

      console.log('✅ Login realizado com sucesso:', session);
      
      // Salvar dados da sessão no localStorage
      localStorage.setItem('memberAreaSession', JSON.stringify({
        memberAreaId,
        studentEmail: email,
        studentName: name,
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt
      }));

      toast.success('Login realizado com sucesso!');
      
      // Navegar para a área de membros
      navigate(`/member-area/${memberAreaId}`);

    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toast.error('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Acesso à Área de Membros</CardTitle>
          <CardDescription>
            Faça login para acessar o conteúdo exclusivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email || !name}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}