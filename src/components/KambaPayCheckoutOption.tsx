import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { Wallet, CheckCircle, AlertCircle } from 'lucide-react';

interface KambaPayCheckoutOptionProps {
  productPrice: number;
  currency?: string;
  onPaymentSuccess?: (email: string, transactionId: string) => void;
  onSelect?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export function KambaPayCheckoutOption({ 
  productPrice, 
  currency = 'KZ',
  onPaymentSuccess,
  onSelect,
  selected,
  disabled 
}: KambaPayCheckoutOptionProps) {
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const { fetchBalanceByEmail, useBalanceByEmail, registerKambaPayEmail, loading } = useKambaPayBalance();

  const checkBalance = async () => {
    if (!email) {
      setBalance(null);
      setBalanceChecked(false);
      setShowRegistration(false);
      return;
    }

    try {
      const balanceData = await fetchBalanceByEmail(email);
      if (balanceData) {
        setBalance(balanceData.balance || 0);
        setShowRegistration(false);
      } else {
        setBalance(null);
        setShowRegistration(true);
      }
      setBalanceChecked(true);
    } catch (error) {
      console.error('Error checking balance:', error);
      setBalance(null);
      setShowRegistration(true);
      setBalanceChecked(true);
    }
  };

  const handleRegister = async () => {
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsRegistering(true);
    try {
      const success = await registerKambaPayEmail(email);
      
      if (success) {
        toast.success('Email registrado no KambaPay com sucesso!');
        setShowRegistration(false);
        // Verificar saldo após registro (será 0)
        await checkBalance();
      } else {
        toast.error('Erro ao registrar email ou email já existe');
      }
    } catch (error) {
      toast.error('Erro inesperado ao registrar email');
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (email) {
        checkBalance();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  const handlePayment = async () => {
    if (!email || balance === null || balance < productPrice) {
      toast.error('Saldo insuficiente ou email inválido');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await useBalanceByEmail(
        email,
        productPrice,
        'Compra de produto',
        `ORDER_${Date.now()}`
      );

      if (success) {
        toast.success('Pagamento realizado com sucesso!');
        onPaymentSuccess?.(email, `KAMBAPAY_${Date.now()}`);
      } else {
        toast.error('Erro ao processar pagamento');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erro inesperado no pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return `${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1')} KZ`;
  };

  const isDisabled = disabled || loading || isProcessing;
  const hasSufficientBalance = balance !== null && balance >= productPrice;
  const showBalanceInfo = balanceChecked && email;

  return (
    <Card className={`cursor-pointer transition-all ${selected ? 'ring-2 ring-primary' : ''} ${isDisabled ? 'opacity-50' : ''}`}>
      <CardContent className="p-4" onClick={!isDisabled ? onSelect : undefined}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">KambaPay</h3>
              <span className="text-sm font-medium">{formatPrice(productPrice)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pague com seu saldo KambaPay
            </p>
          </div>
        </div>

        {selected && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kambapay-email" className="text-sm">
                Email KambaPay
              </Label>
              <Input
                id="kambapay-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            {showRegistration && (
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Criar conta KambaPay</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Este email não está registrado no KambaPay. Registre-se para começar a usar.
                </p>
                <Button 
                  onClick={handleRegister}
                  disabled={isRegistering}
                  size="sm"
                  className="w-full"
                >
                  {isRegistering ? (
                    <>
                      <Wallet className="mr-2 h-3 w-3 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-3 w-3" />
                      Registrar no KambaPay
                    </>
                  )}
                </Button>
              </div>
            )}

            {showBalanceInfo && !showRegistration && (
              <div className="p-3 rounded-lg border">
                {balance === null ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Erro ao verificar saldo</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Saldo atual:</span>
                      <span className="font-medium">{formatPrice(balance)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Valor da compra:</span>
                      <span className="font-medium">{formatPrice(productPrice)}</span>
                    </div>
                    
                    {hasSufficientBalance ? (
                      <div className="flex items-center justify-between text-sm">
                        <span>Saldo restante:</span>
                        <span className="font-medium text-green-600">
                          {formatPrice(balance - productPrice)}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Saldo insuficiente</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Carregue seu saldo em <a href="/kambapay" target="_blank" className="text-primary underline">kambafy.com/kambapay</a>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {hasSufficientBalance && (
              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Wallet className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Pagar com KambaPay
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}