import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppyPayCheckout } from './AppyPayCheckout';
import { generateOrderId } from '@/utils/generateOrderId';

export const AppyPayDemo = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [demoOrderId] = useState(() => generateOrderId());

  const handleSuccess = (paymentData: any) => {
    console.log('AppyPay Payment Success:', paymentData);
    setShowDemo(false);
    // Aqui você pode redirecionar para página de sucesso, etc.
  };

  const handleBack = () => {
    setShowDemo(false);
  };

  if (showDemo) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <AppyPayCheckout
          productId="demo-product-id"
          amount="25000"
          orderId={demoOrderId}
          onSuccess={handleSuccess}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Demo - AppyPay Integration</CardTitle>
        <CardDescription>
          Teste a integração com pagamentos por referência AppyPay
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Produto:</strong> Produto Demo</p>
            <p><strong>Valor:</strong> 25.000 KZ</p>
            <p><strong>Order ID:</strong> {demoOrderId}</p>
          </div>
          
          <Button onClick={() => setShowDemo(true)} className="w-full">
            Testar AppyPay
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};