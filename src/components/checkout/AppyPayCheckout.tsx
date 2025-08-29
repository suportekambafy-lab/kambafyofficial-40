import { useState } from 'react';
import { AppyPayPaymentForm } from './AppyPayPaymentForm';
import { AppyPayStatusChecker } from './AppyPayStatusChecker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppyPayCheckoutProps {
  productId: string;
  amount: string;
  orderId: string;
  onSuccess?: (data: any) => void;
  onBack?: () => void;
}

export const AppyPayCheckout: React.FC<AppyPayCheckoutProps> = ({
  productId,
  amount,
  orderId,
  onSuccess,
  onBack
}) => {
  const [step, setStep] = useState<'form' | 'reference_created' | 'payment_confirmed'>('form');
  const [referenceData, setReferenceData] = useState<any>(null);

  const handleReferenceCreated = (data: any) => {
    setReferenceData(data);
    setStep('reference_created');
  };

  const handlePaymentConfirmed = (data: any) => {
    setStep('payment_confirmed');
    onSuccess?.(data);
  };

  const handleStartOver = () => {
    setStep('form');
    setReferenceData(null);
  };

  if (step === 'payment_confirmed') {
    return (
      <Card className="w-full max-w-md mx-auto bg-green-50 border-green-200">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-700">
            <CheckCircle2 className="h-6 w-6" />
            Pagamento Confirmado!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-green-600">
            Seu pagamento foi processado com sucesso. Obrigado pela sua compra!
          </p>
          {onBack && (
            <Button onClick={onBack} variant="outline" className="w-full">
              Continuar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === 'reference_created' && referenceData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartOver}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Nova referência
          </Button>
        </div>
        
        <AppyPayStatusChecker
          referencePaymentId={referenceData.reference_payment_id}
          onPaymentConfirmed={handlePaymentConfirmed}
          autoCheck={true}
          checkInterval={30}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      )}
      
      <AppyPayPaymentForm
        productId={productId}
        amount={amount}
        orderId={orderId}
        onSuccess={handleReferenceCreated}
      />
    </div>
  );
};