import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { Wallet, Plus, Eye, EyeOff } from 'lucide-react';
import { getPaymentMethodsByCountry } from '@/utils/paymentMethods';

interface KambaPayBalanceManagerProps {
  email: string;
  onBalanceUpdate?: () => void;
}

export function KambaPayBalanceManager({ email, onBalanceUpdate }: KambaPayBalanceManagerProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  
  const { balance, loading, addBalanceByEmail, fetchBalanceByEmail } = useKambaPayBalance(email);

  // Pega os métodos de pagamento de Angola (país padrão)
  const paymentMethods = getPaymentMethodsByCountry('AO');

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !paymentMethod) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    setIsLoading(true);
    try {
      const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
      const success = await addBalanceByEmail(
        email, 
        amountNumber, 
        'Carregamento de saldo', 
        selectedMethod?.name || paymentMethod
      );
      
      if (success) {
        toast.success(`Saldo de ${amountNumber} KZ adicionado com sucesso!`);
        setAmount('');
        setPaymentMethod('');
        onBalanceUpdate?.();
      } else {
        toast.error('Erro ao adicionar saldo');
      }
    } catch (error) {
      toast.error('Erro inesperado ao adicionar saldo');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalance = async () => {
    await fetchBalanceByEmail(email);
    onBalanceUpdate?.();
  };

  return (
    <div className="space-y-6">
      {/* Saldo Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Saldo KambaPay
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </CardTitle>
          <CardDescription>Email: {email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? (
              'Carregando...'
            ) : showBalance ? (
              `${balance?.balance || 0} KZ`
            ) : (
              '••••• KZ'
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshBalance}
            className="mt-2"
          >
            Atualizar Saldo
          </Button>
        </CardContent>
      </Card>

      {/* Carregar Saldo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Carregar Saldo
          </CardTitle>
          <CardDescription>
            Adicione saldo à sua conta KambaPay usando métodos de pagamento locais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBalance} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (KZ)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment-method">Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um método de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        {method.image && (
                          <img 
                            src={method.image} 
                            alt={method.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        {method.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Plus className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Carregar Saldo
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Em um ambiente real, este carregamento seria processado através do método de pagamento selecionado. Para demonstração, o saldo é adicionado diretamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}