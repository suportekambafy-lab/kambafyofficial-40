import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, AlertCircle, X } from 'lucide-react';
import { PaymentProgress } from '@/components/ui/payment-progress';
import { useOptimizedPayment } from '@/hooks/useOptimizedPayment';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { useToast } from '@/hooks/use-toast';

interface OptimizedKambaPayFormProps {
  productPrice: number;
  productId: string;
  customerInfo: {
    fullName: string;
    email: string;
    phone?: string;
  };
  formatPrice: (amount: number) => string;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  onPaymentSuccess?: (data: any) => void;
  t?: (key: string) => string;
}

export const OptimizedKambaPayForm: React.FC<OptimizedKambaPayFormProps> = ({
  productPrice,
  productId,
  customerInfo,
  formatPrice,
  isSubmitting,
  setIsSubmitting,
  onPaymentSuccess,
  t = (key: string) => key
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState(customerInfo.email || '');
  const [balance, setBalance] = useState<number | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [paymentStage, setPaymentStage] = useState<'validating' | 'processing' | 'redirecting' | 'complete'>('validating');
  const [paymentProgress, setPaymentProgress] = useState(0);
  
  const { fetchBalanceByEmail, registerKambaPayEmail } = useKambaPayBalance();
  const { isProcessing, processKambaPayPayment, cancelPayment } = useOptimizedPayment();

  // Check balance with debouncing
  useEffect(() => {
    if (!email) {
      setBalance(null);
      setIsRegistered(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const balanceData = await fetchBalanceByEmail(email);
        if (balanceData) {
          setBalance(balanceData.balance || 0);
          setIsRegistered(true);
        } else {
          setBalance(null);
          setIsRegistered(false);
        }
      } catch (error) {
        console.error('Error checking balance:', error);
        setBalance(null);
        setIsRegistered(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, fetchBalanceByEmail]);

  const handleRegister = async () => {
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira um email válido",
        variant: "destructive"
      });
      return;
    }

    try {
      const success = await registerKambaPayEmail(email);
      
      if (success) {
        toast({
          title: "Registro concluído",
          description: "Email registrado no KambaPay com sucesso!",
        });
        setIsRegistered(true);
        setBalance(0); // New accounts start with 0 balance
      } else {
        toast({
          title: "Erro no registro",
          description: "Erro ao registrar email ou email já existe",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Erro inesperado ao registrar email",
        variant: "destructive"
      });
    }
  };

  const handlePayment = async () => {
    if (!email || balance === null || balance < productPrice) {
      toast({
        title: "Erro no pagamento",
        description: "Verifique o email e saldo antes de continuar",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    await processKambaPayPayment(
      email,
      productPrice,
      productId,
      customerInfo.fullName,
      {
        onProgress: (stage, progress) => {
          setPaymentStage(stage);
          setPaymentProgress(progress);
        },
        onSuccess: (data) => {
          console.log('KambaPay payment successful:', data);
          onPaymentSuccess?.(data);
          setTimeout(() => setIsSubmitting(false), 1000);
        },
        onError: (error) => {
          console.error('KambaPay payment error:', error);
          setIsSubmitting(false);
        }
      }
    );
  };

  const hasSufficientBalance = balance !== null && balance >= productPrice;
  const showBalanceInfo = isRegistered !== null && email;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t('payment.kambapay.title') || 'KambaPay'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t('payment.kambapay.description') || 'Pague com seu saldo digital'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kambapay-email">
              {t('payment.kambapay.email') || 'Email KambaPay'}
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

          {isRegistered === false && (
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {t('payment.kambapay.register.title') || 'Criar conta KambaPay'}
                </span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                {t('payment.kambapay.register.description') || 'Este email não está registrado no KambaPay. Registre-se para começar a usar.'}
              </p>
              <Button 
                onClick={handleRegister}
                size="sm"
                className="w-full"
              >
                <Wallet className="mr-2 h-3 w-3" />
                {t('payment.kambapay.register.button') || 'Registrar no KambaPay'}
              </Button>
            </div>
          )}

          {showBalanceInfo && isRegistered && (
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{t('payment.kambapay.balance') || 'Saldo atual'}:</span>
                  <span className="font-medium">{formatPrice(balance || 0)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>{t('payment.kambapay.amount') || 'Valor da compra'}:</span>
                  <span className="font-medium">{formatPrice(productPrice)}</span>
                </div>
                
                {hasSufficientBalance ? (
                  <div className="flex items-center justify-between">
                    <span>{t('payment.kambapay.remaining') || 'Saldo restante'}:</span>
                    <span className="font-medium text-green-600">
                      {formatPrice((balance || 0) - productPrice)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{t('payment.kambapay.insufficient') || 'Saldo insuficiente'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('payment.kambapay.topup') || 'Carregue seu saldo em'} <a href="/kambapay" target="_blank" className="text-primary underline">kambafy.com/kambapay</a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
              <PaymentProgress 
                stage={paymentStage} 
                progress={paymentProgress}
              />
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelPayment}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={handlePayment}
            disabled={isSubmitting || isProcessing || !email || !hasSufficientBalance}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('payment.processing') || 'Processando...'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {t('payment.kambapay.pay') || `Pagar ${formatPrice(productPrice)}`}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
          <Wallet className="w-3 h-3" />
          <span>{t('payment.kambapay.secure') || 'Pagamento digital seguro'}</span>
        </div>
      </CardContent>
    </Card>
  );
};