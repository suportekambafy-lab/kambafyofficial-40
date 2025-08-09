import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { Wallet, ArrowUpCircle } from 'lucide-react';

interface KambaPayRegistrationProps {
  onSuccess?: (email: string) => void;
}

export function KambaPayRegistration({ onSuccess }: KambaPayRegistrationProps) {
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { registerKambaPayEmail } = useKambaPayBalance();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsRegistering(true);
    try {
      const success = await registerKambaPayEmail(email);
      
      if (success) {
        toast.success('Email registrado no KambaPay com sucesso!');
        onSuccess?.(email);
        setEmail('');
      } else {
        toast.error('Erro ao registrar email ou email já existe');
      }
    } catch (error) {
      toast.error('Erro inesperado ao registrar email');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <span>Registrar no KambaPay</span>
        </CardTitle>
        <CardDescription>
          Registre seu email para começar a usar o KambaPay como método de pagamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isRegistering}
          >
            {isRegistering ? (
              <>
                <ArrowUpCircle className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Registrar no KambaPay
              </>
            )}
          </Button>
        </form>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Como funciona:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>1. Registre seu email no KambaPay</li>
            <li>2. Carregue saldo usando métodos de pagamento locais</li>
            <li>3. Use seu email para pagar em qualquer checkout</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}