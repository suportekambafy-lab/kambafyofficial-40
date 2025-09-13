import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/SEO';

const CheckoutSuccess = () => {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (sessionId) {
      console.log('Verifying payment session:', sessionId);
      // Aqui você pode implementar verificação do pagamento se necessário
      setIsVerified(true);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SEO 
        title="Compra Realizada com Sucesso - Kambafy"
        description="Sua compra foi processada com sucesso. Obrigado por confiar na Kambafy!"
      />
      
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Pagamento Confirmado!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Sua compra foi processada com sucesso. Você receberá um email com os detalhes do seu pedido em breve.
          </p>
          
          {sessionId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">ID da Transação:</p>
              <p className="font-mono text-sm">{sessionId}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/'}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('mailto:suporte@kambafy.com', '_blank')}
            >
              Falar com Suporte
            </Button>
          </div>
          
          <p className="text-xs text-gray-400 mt-6">
            Obrigado por escolher a Kambafy!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;